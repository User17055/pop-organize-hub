package br.com.poporganize.app.ui

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.media.AudioManager
import android.net.Uri
import android.webkit.*
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import br.com.poporganize.app.data.taskDurationLabel
import br.com.poporganize.app.data.taskDurationMinutes
import br.com.poporganize.app.data.taskEndTime
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import kotlin.math.sin
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.core.content.ContextCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.webkit.WebViewAssetLoader
import br.com.poporganize.app.BuildConfig
import kotlinx.coroutines.*
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID

private const val VOICE_ORIGIN = "https://appassets.androidplatform.net"
private const val VOICE_PAGE = "$VOICE_ORIGIN/assets/pop/index.html"
private data class PopCaption(val role: String, val text: String, val end: Long)
private class PopRequestFailure(val status: Int, message: String): IllegalStateException(message)

private suspend fun popRequest(token: String, workspaceId: String, body: JSONObject): JSONObject = withContext(Dispatchers.IO) {
    val connection = (URL("${BuildConfig.POP_API_BASE_URL.trimEnd('/')}/pop").openConnection() as HttpURLConnection).apply {
        requestMethod = "POST"; connectTimeout = 15_000; readTimeout = 32_000; doOutput = true
        setRequestProperty("Authorization", "Bearer $token")
        setRequestProperty("Content-Type", "application/json; charset=utf-8")
        setRequestProperty("Accept", "application/json")
        if (workspaceId.isNotBlank()) setRequestProperty("X-Workspace-Id", workspaceId)
        else setRequestProperty("X-Workspace-Kind", "personal")
    }
    try {
        connection.outputStream.bufferedWriter(Charsets.UTF_8).use { it.write(body.toString()) }
        val status = connection.responseCode
        val raw = (if (status in 200..299) connection.inputStream else connection.errorStream)?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()
        val result = runCatching { JSONObject(raw) }.getOrElse { JSONObject().put("error", "O servidor não respondeu. Tente novamente.") }
        if (status !in 200..299) throw PopRequestFailure(status,result.optString("error", "Não foi possível conversar com o Pop."))
        result
    } finally { connection.disconnect() }
}

/** Exposed only to packaged assets; session tokens never enter JavaScript. */
internal class PopVoiceBridge(private val requestHandler: (String, String) -> Unit, private val eventHandler: (String) -> Unit) {
    @JavascriptInterface fun request(id: String, body: String) = requestHandler(id, body)
    @JavascriptInterface fun event(body: String) = eventHandler(body)
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
internal fun PopAssistantDialog(token: String, workspaceId: String, workspaceName: String, onCreated: () -> Unit, onDismiss: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val lifecycle = LocalLifecycleOwner.current
    var view by remember { mutableStateOf<WebView?>(null) }
    var ready by remember { mutableStateOf(false) }
    var state by remember { mutableStateOf("idle") }
    var muted by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val preferences = remember { context.getSharedPreferences("pop_voice", Context.MODE_PRIVATE) }
    val pendingKey = remember(token, workspaceId) { "creation_${token.hashCode()}_$workspaceId" }
    val restored = remember(pendingKey) { runCatching { JSONObject(preferences.getString(pendingKey, null) ?: "") }.getOrNull() }
    var pendingCreation by remember { mutableStateOf(restored) }
    var answer by remember { mutableStateOf(restored?.optJSONObject("answer")) }
    var captionsVisible by remember { mutableStateOf(preferences.getBoolean("captions", false)) }
    var preparing by remember { mutableStateOf(false) }
    var success by remember { mutableStateOf<String?>(null) }
    var scheduleOpen by remember { mutableStateOf(false) }
    var dateOpen by remember { mutableStateOf(false) }
    var confirmationId by remember { mutableStateOf(UUID.randomUUID().toString()) }
    var creating by remember { mutableStateOf(false) }
    var closeRequested by remember { mutableStateOf(false) }
    val captions = remember { mutableStateListOf<PopCaption>() }
    val audioManager = remember { context.getSystemService(Context.AUDIO_SERVICE) as AudioManager }
    var focus by remember { mutableStateOf<AudioManager.OnAudioFocusChangeListener?>(null) }
    val originalMode = remember { audioManager.mode }
    val originalSpeaker = remember { audioManager.isSpeakerphoneOn }
    fun command(js: String) { view?.evaluateJavascript(js, null) }
    fun releaseAudio() {
        focus?.let { audioManager.abandonAudioFocus(it) }; focus = null
        audioManager.mode = originalMode; audioManager.isSpeakerphoneOn = originalSpeaker
    }
    fun stop() { command("window.PopVoice?.stop()"); state = "closing" }
    fun dismiss() {
        if (state == "idle") onDismiss() else { closeRequested = true; stop() }
    }
    fun start() {
        if (!ready || state != "idle") return
        error = null; muted = false
        val request = AudioManager.OnAudioFocusChangeListener { change -> if (change < 0) view?.post { stop() } }
        if (audioManager.requestAudioFocus(request,AudioManager.STREAM_VOICE_CALL,AudioManager.AUDIOFOCUS_GAIN_TRANSIENT) != AudioManager.AUDIOFOCUS_REQUEST_GRANTED) { error = "O áudio está sendo usado por outro aplicativo."; return }
        focus = request; audioManager.mode = AudioManager.MODE_IN_COMMUNICATION; audioManager.isSpeakerphoneOn = true
        state = "connecting"
        val draft = answer?.optJSONObject("draft")?.toString() ?: "null"
        command("window.PopVoice.start($draft)")
    }
    val permission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { allowed ->
        if (allowed) start() else error = "Permita o acesso ao microfone para conversar com o Pop."
    }
    var openedCall by remember { mutableStateOf(false) }
    LaunchedEffect(ready) {
        if (ready && !openedCall && pendingCreation == null) {
            openedCall = true
            if (ContextCompat.checkSelfPermission(context,Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) start()
            else permission.launch(Manifest.permission.RECORD_AUDIO)
        }
    }
    DisposableEffect(lifecycle, view) {
        val observer = LifecycleEventObserver { _, event -> if (event == Lifecycle.Event.ON_STOP && state != "idle") stop() }
        lifecycle.lifecycle.addObserver(observer)
        onDispose { lifecycle.lifecycle.removeObserver(observer) }
    }
    DisposableEffect(Unit) { onDispose { releaseAudio(); view?.removeJavascriptInterface("PopNative"); view?.destroy() } }
    fun receive(raw: String) {
        val event = runCatching { JSONObject(raw) }.getOrNull() ?: return
        when (event.optString("type")) {
            "ready" -> ready = true
            "connecting" -> state = "connecting"
            "connected" -> state = "connected"
            "closing" -> state = "closing"
            "ended" -> { state = "idle"; muted = false; releaseAudio(); if (closeRequested) onDismiss() }
            "preparing" -> preparing = true
            "prepared" -> preparing = false
            "error" -> { preparing = false; error = if (success != null) "Atividade criada. Houve uma falha apenas na chamada de voz." else event.optString("message") }
            "draft" -> {
                val next = event.optJSONObject("answer") ?: return
                preparing = false
                if (!creating && pendingCreation == null) {
                    if (next.optJSONObject("draft").toString() != answer?.optJSONObject("draft").toString()) confirmationId = UUID.randomUUID().toString()
                    success = null
                    answer = next
                }
            }
            "transcript" -> {
                val text = event.optString("text"); if (text.isEmpty()) return
                val role = event.optString("role"); val end = event.optLong("end"); val previous = captions.lastOrNull()
                if (previous != null && previous.role == role && event.optLong("start") - previous.end < 1500)
                    captions[captions.lastIndex] = previous.copy(text = (previous.text + text).takeLast(2000), end = end)
                else captions.add(PopCaption(role, text, end))
                while (captions.size > 80) captions.removeAt(0)
            }
        }
    }
    fun reviseDraft(next: JSONObject, resolvedFields: Set<String>) {
        if (creating || pendingCreation != null) return
        preparing = true; error = null
        scope.launch {
            try {
                val previousMissing = answer?.optJSONArray("missingFields")
                val missing = org.json.JSONArray()
                for(index in 0 until (previousMissing?.length() ?: 0)) {
                    val field = previousMissing!!.optString(index)
                    if(resolvedFields.none { field.contains(it,ignoreCase = true) }) missing.put(field)
                }
                val result = popRequest(token,workspaceId,JSONObject().put("action","prepare").put("draft",next).put("missingFields",missing))
                answer = result; confirmationId = UUID.randomUUID().toString()
                runCatching { command("window.PopVoice.updated(${result.getJSONObject("draft")})") }
            } catch(e: CancellationException) { throw e }
            catch(e: Exception) { error = e.message ?: "Não foi possível revisar os horários." }
            finally { preparing = false }
        }
    }
    fun confirm() {
        val current = answer ?: return
        if (creating || preparing || current.optString("status") != "ready") return
        // Keep the exact payload and id across timeouts and reopening the screen.
        val attempt = pendingCreation ?: JSONObject().put("requestId",confirmationId).put("answer",JSONObject(current.toString()))
        if (!preferences.edit().putString(pendingKey,attempt.toString()).commit()) { error = "Não foi possível guardar a confirmação neste aparelho."; return }
        pendingCreation = attempt; creating = true; error = null
        scope.launch {
            val snapshot = attempt.getJSONObject("answer").getJSONObject("draft")
            try {
                val result = popRequest(token,workspaceId,JSONObject().put("action","create").put("draft",snapshot).put("requestId",attempt.getString("requestId")))
                check(result.optBoolean("created")) { "O servidor ainda não confirmou a criação." }
            } catch(e: CancellationException) { throw e }
            catch(e: Exception) {
                if(e is PopRequestFailure && e.status in 400..499 && e.status !in listOf(408,409,429)) {
                    pendingCreation = null; preferences.edit().remove(pendingKey).commit()
                    confirmationId = UUID.randomUUID().toString()
                    error = e.message
                } else error = "Não recebi a confirmação. Toque em Verificar criação para conferir sem duplicar a atividade."
                creating = false
                return@launch
            }
            // From here onward the VPS has confirmed success. Audio and UI refresh
            // failures must never turn a saved activity into a failed creation.
            preferences.edit().remove(pendingKey).commit()
            pendingCreation = null; answer = null; creating = false
            success = "Atividade criada com sucesso"
            runCatching { command("window.PopVoice.created(${JSONObject.quote(snapshot.optString("title"))})") }
            runCatching { onCreated() }
        }
    }
    if(scheduleOpen) {
        val draft = answer?.optJSONObject("draft")
        TaskTimeRangeDialog(
            initialTime = draft?.optString("dueTime").orEmpty().takeUnless { it == "null" }.orEmpty(),
            initialDuration = taskDurationLabel(draft?.optInt("durationMinutes")?.takeIf { it > 0 }),
            onConfirm = { time, duration ->
                scheduleOpen = false
                if(draft != null) reviseDraft(JSONObject(draft.toString()).put("dueTime",time.ifBlank { null }).put("durationMinutes",taskDurationMinutes(duration) ?: JSONObject.NULL),setOf("horário","duração","início","término","hora"))
            },
            onClear = { scheduleOpen = false; if(draft != null) reviseDraft(JSONObject(draft.toString()).put("dueTime",JSONObject.NULL).put("durationMinutes",JSONObject.NULL),setOf("horário","duração","início","término","hora")) },
            onDismiss = { scheduleOpen = false },
        )
    }
    if(dateOpen) {
        val draft = answer?.optJSONObject("draft")
        val date = draft?.optString("dueDate").orEmpty().split("-").reversed().joinToString("/")
        TaskDueDateDialog(date,onSelect = { selected ->
            dateOpen = false
            if(draft != null) reviseDraft(JSONObject(draft.toString()).put("dueDate",LocalDate.parse(selected,DateTimeFormatter.ofPattern("dd/MM/yyyy")).toString()),setOf("data","prazo"))
        },onDismiss = { dateOpen = false })
    }
    Dialog(onDismissRequest = ::dismiss, properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false)) {
        Surface(color = PopBackground, modifier = Modifier.fillMaxSize()) {
            Column(Modifier.fillMaxSize().statusBarsPadding().navigationBarsPadding().padding(horizontal = 22.dp, vertical = 12.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = ::dismiss) { Icon(Icons.Outlined.ArrowBack, "Voltar", tint = PopText) }
                    Column(Modifier.weight(1f).padding(start = 6.dp)) {
                        Text("Pop", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = PopText)
                        Text(workspaceName, fontSize = 11.sp, color = PopMuted, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                    IconToggleButton(checked = captionsVisible, onCheckedChange = {
                        captionsVisible = it; preferences.edit().putBoolean("captions", it).apply()
                    }) { Icon(Icons.Outlined.Subtitles, if(captionsVisible) "Ocultar legendas" else "Mostrar legendas", tint = if(captionsVisible) PopBlue else PopMuted) }
                }
                Box(Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                    if(captionsVisible && captions.isNotEmpty()) {
                        LazyColumn(Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(12.dp), reverseLayout = true) {
                            items(captions.asReversed().toList()) { caption ->
                                Column(Modifier.fillMaxWidth().padding(vertical = 6.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                    Text(if(caption.role == "user") "Você" else "Pop", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = if(caption.role == "user") PopMuted else PopBlue)
                                    Text(caption.text, color = PopText, fontSize = 15.sp, lineHeight = 23.sp)
                                }
                            }
                        }
                    } else {
                        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(22.dp)) {
                            PopVoiceOrb(state == "connected", preparing)
                            Text(when(state) { "connecting" -> "Só um instante…"; "connected" -> if(preparing) "Preparando sua atividade…" else if(muted) "Microfone desligado" else "Pode falar, estou ouvindo"; "closing" -> "Até já!"; else -> "Oi! O que vamos organizar?" },
                                color = PopText, fontSize = 18.sp, fontWeight = FontWeight.SemiBold, textAlign = TextAlign.Center)
                            if(state == "idle" && answer == null) Text("Vamos transformar suas ideias em atividades.", color = PopMuted, fontSize = 13.sp, textAlign = TextAlign.Center)
                        }
                    }
                }
                answer?.let { value ->
                    PopDraftReview(value, canEdit = !creating && !preparing && pendingCreation == null, canConfirm = !creating && !preparing, creating = creating, pending = pendingCreation != null,
                        onSchedule = { scheduleOpen = true }, onDate = { dateOpen = true }, onConfirm = ::confirm)
                }
                success?.let { message ->
                    Row(Modifier.fillMaxWidth().background(PopBlueSoft,RoundedCornerShape(14.dp)).padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Outlined.CheckCircle, null, tint = PopBlue, modifier = Modifier.size(18.dp)); Spacer(Modifier.width(8.dp)); Text(message,color = PopText,fontSize = 13.sp,fontWeight = FontWeight.SemiBold)
                    }
                }
                error?.let { Text(it, color = MaterialTheme.colorScheme.error, fontSize = 12.sp) }
                Row(Modifier.fillMaxWidth().padding(vertical = 8.dp), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
                    if(state == "connected") {
                        FilledTonalIconButton(onClick = { muted = !muted; command("window.PopVoice.mute($muted)") }, modifier = Modifier.size(52.dp)) {
                            Icon(if(muted) Icons.Outlined.MicOff else Icons.Outlined.Mic, "Alternar microfone")
                        }
                        Spacer(Modifier.width(24.dp))
                    }
                    FilledIconButton(onClick = {
                        if(state != "idle") stop()
                        else if(ContextCompat.checkSelfPermission(context,Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) start()
                        else permission.launch(Manifest.permission.RECORD_AUDIO)
                    }, enabled = ready && state != "closing" && !creating, modifier = Modifier.size(64.dp),
                        colors = IconButtonDefaults.filledIconButtonColors(containerColor = if(state != "idle") MaterialTheme.colorScheme.error else PopBlue)) {
                        if(state == "connecting") CircularProgressIndicator(Modifier.size(24.dp),color = Color.White,strokeWidth = 2.dp)
                        else Icon(if(state == "idle") Icons.Outlined.GraphicEq else Icons.Outlined.CallEnd, if(state == "idle") "Conversar com o Pop" else "Encerrar chamada", Modifier.size(28.dp))
                    }
                }
                Text(if(captionsVisible) "Legendas ativadas · Voz gerada por IA" else "Voz gerada por IA · Legendas opcionais no topo", color = PopMuted, fontSize = 10.sp, modifier = Modifier.align(Alignment.CenterHorizontally))
                // The WebView handles WebRTC only; every visible control above is native Compose.
                AndroidView(modifier = Modifier.size(1.dp), factory = { ctx ->
                    val loader = WebViewAssetLoader.Builder().addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(ctx)).build()
                    WebView(ctx).apply {
                        setBackgroundColor(android.graphics.Color.TRANSPARENT)
                        setLayerType(android.view.View.LAYER_TYPE_SOFTWARE, null)
                        view = this
                        settings.javaScriptEnabled = true; settings.allowFileAccess = false; settings.allowContentAccess = false
                        settings.mediaPlaybackRequiresUserGesture = false; settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
                        webViewClient = object : WebViewClient() {
                            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest) = true
                            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse =
                                loader.shouldInterceptRequest(request.url) ?: WebResourceResponse("text/plain","UTF-8",403,"Blocked",emptyMap(),java.io.ByteArrayInputStream(ByteArray(0)))
                        }
                        webChromeClient = object : WebChromeClient() {
                            override fun onPermissionRequest(request: PermissionRequest) {
                                if(request.origin.toString().trimEnd('/') == VOICE_ORIGIN && ContextCompat.checkSelfPermission(ctx,Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED)
                                    request.grant(request.resources.filter { it == PermissionRequest.RESOURCE_AUDIO_CAPTURE }.toTypedArray()) else request.deny()
                            }
                        }
                        addJavascriptInterface(PopVoiceBridge({ id, body -> post {
                            scope.launch {
                                val result = try {
                                    val input = JSONObject(body)
                                    require(input.optString("action") in listOf("connect","prepare")) { "Operação indisponível." }
                                    popRequest(token,workspaceId,input)
                                } catch(e: CancellationException) { throw e } catch(e: Exception) { JSONObject().put("error",e.message ?: "Falha na conexão.") }
                                evaluateJavascript("window.PopNativeResult(${JSONObject.quote(id)},${JSONObject.quote(result.toString())})",null)
                            }
                        } }, { body -> post { receive(body) } }), "PopNative")
                        loadUrl(VOICE_PAGE)
                    }
                })
            }
        }
    }
}

@Composable
private fun PopVoiceOrb(active: Boolean, preparing: Boolean) {
    val phase = if(active || preparing) {
        val animation = rememberInfiniteTransition(label = "Pop voice")
        animation.animateFloat(0f, 6.283f, infiniteRepeatable(tween(if(preparing) 1800 else 2600, easing = LinearEasing)), label = "voice-wave").value
    } else 0f
    Canvas(Modifier.size(146.dp)) {
        val radius = size.minDimension * (.44f + .025f * sin(phase))
        val center = Offset(size.width/2,size.height/2)
        drawCircle(Brush.radialGradient(listOf(PopBlue.copy(alpha=.40f),PopPurple.copy(alpha=.16f),Color.Transparent),center,radius*1.2f),radius*1.2f,center)
        drawCircle(Brush.linearGradient(listOf(PopBlue,PopPurple),Offset(0f,size.height),Offset(size.width,0f)),radius*.72f,center)
        for(index in -2..2) {
            val height = size.height*(.08f+.065f*(sin(phase+index*.8f)+1f))
            val x=center.x+index*size.width*.075f
            drawLine(Color.White.copy(alpha=.92f),Offset(x,center.y-height/2),Offset(x,center.y+height/2),strokeWidth=size.width*.025f,cap=androidx.compose.ui.graphics.StrokeCap.Round)
        }
    }
}

@Composable
private fun PopDraftReview(answer: JSONObject, canEdit: Boolean, canConfirm: Boolean, creating: Boolean, pending: Boolean, onSchedule: () -> Unit, onDate: () -> Unit, onConfirm: () -> Unit) {
    val draft = answer.optJSONObject("draft") ?: return
    val start = draft.optString("dueTime").takeUnless { it == "null" }.orEmpty()
    val minutes = if(draft.isNull("durationMinutes")) null else draft.optInt("durationMinutes").takeIf { it > 0 }
    val end = taskEndTime(start,taskDurationLabel(minutes))
    val date = draft.optString("dueDate").takeUnless { it == "null" }.orEmpty().split("-").reversed().joinToString("/")
    val responsible = answer.optJSONObject("preview")?.optString("responsible").orEmpty()
    Surface(color = PopSurface, shape = RoundedCornerShape(20.dp), modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.heightIn(max = 330.dp).verticalScroll(rememberScrollState()).padding(16.dp),verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text("Revisar atividade",color = PopMuted,fontSize = 11.sp,fontWeight = FontWeight.SemiBold)
            Text(draft.optString("title").takeUnless { it == "null" }.orEmpty(),color = PopText,fontSize = 16.sp,fontWeight = FontWeight.Bold,maxLines = 2,overflow = TextOverflow.Ellipsis)
            if(responsible.isNotBlank()) Text("Responsável: $responsible",color = PopMuted,fontSize = 12.sp)
            Row(Modifier.fillMaxWidth(),horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                PopScheduleTile("Início",start.ifBlank { "Definir" },canEdit,Modifier.weight(1f),onSchedule)
                PopScheduleTile("Até",end ?: "Sem término",canEdit,Modifier.weight(1f),onSchedule)
            }
            TextButton(onClick = onDate,enabled = canEdit,contentPadding = PaddingValues(0.dp)) {
                Icon(Icons.Outlined.CalendarToday,null,Modifier.size(16.dp)); Spacer(Modifier.width(8.dp)); Text(date.ifBlank { "Definir data" },fontSize = 12.sp)
            }
            if(answer.optString("status") == "ready") Button(onClick = onConfirm,enabled = canConfirm,modifier = Modifier.fillMaxWidth().height(46.dp),shape = RoundedCornerShape(13.dp)) {
                if(creating) CircularProgressIndicator(Modifier.size(18.dp),strokeWidth = 2.dp,color = Color.White)
                else Text(if(pending) "Verificar criação" else "Confirmar e criar",fontWeight = FontWeight.Bold)
            } else Text(answer.optString("reply"),color = PopMuted,fontSize = 12.sp)
        }
    }
}

@Composable
private fun PopScheduleTile(label: String, value: String, enabled: Boolean, modifier: Modifier, onClick: () -> Unit) {
    Surface(onClick = onClick,enabled = enabled,color = PopSurfaceAlt,shape = RoundedCornerShape(12.dp),modifier = modifier) {
        Column(Modifier.padding(horizontal = 12.dp,vertical = 10.dp),verticalArrangement = Arrangement.spacedBy(3.dp)) {
            Text(label,color = PopMuted,fontSize = 11.sp)
            Text(value,color = PopText,fontSize = 15.sp,fontWeight = FontWeight.SemiBold)
        }
    }
}

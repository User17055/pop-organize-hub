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
import androidx.compose.foundation.Image
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import br.com.poporganize.app.data.taskDurationLabel
import br.com.poporganize.app.data.taskDurationMinutes
import br.com.poporganize.app.data.taskEndTime
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import kotlin.math.cos
import kotlin.math.sin
import kotlin.random.Random
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.Dp
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
import br.com.poporganize.app.R
import kotlinx.coroutines.*
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID

private const val VOICE_ORIGIN = "https://appassets.androidplatform.net"
private const val VOICE_PAGE = "$VOICE_ORIGIN/assets/pop/index.html"
private fun JSONObject.popSourceTaskId(): String? = optString("sourceTaskId").takeIf { it.isNotBlank() && it != "null" }
private fun popChatText(value: String) = buildAnnotatedString {
    var position = 0
    Regex("\\*\\*(.+?)\\*\\*").findAll(value).forEach { match ->
        append(value.substring(position,match.range.first))
        withStyle(SpanStyle(fontWeight = FontWeight.Bold)) { append(match.groupValues[1]) }
        position = match.range.last+1
    }
    append(value.substring(position))
}
private data class PopCaption(val role: String, val text: String, val end: Long)
private class PopRequestFailure(val status: Int, message: String): IllegalStateException(message)

private suspend fun popRequest(token: String, workspaceId: String, body: JSONObject): JSONObject = withContext(Dispatchers.IO) {
    val connection = (URL("${BuildConfig.POP_API_BASE_URL.trimEnd('/')}/pop").openConnection() as HttpURLConnection).apply {
        requestMethod = "POST"; connectTimeout = 15_000; readTimeout = if(body.optString("action") == "chat") 75_000 else 32_000; doOutput = true
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
    var lastUserSpeechAt by remember { mutableStateOf(0L) }
    var popSpeechAt by remember { mutableStateOf(0L) }
    var popSpeaking by remember { mutableStateOf(false) }
    // Cada trecho da fala do Pop reinicia a espera; 900 ms sem trecho novo = parou de falar.
    LaunchedEffect(popSpeechAt) { if(popSpeechAt > 0L) { popSpeaking = true; delay(900); popSpeaking = false } }
    var consumedVoiceEnd by remember { mutableStateOf(-1L) }
    var error by remember { mutableStateOf<String?>(null) }
    val preferences = remember { context.getSharedPreferences("pop_voice", Context.MODE_PRIVATE) }
    val pendingKey = remember(token, workspaceId) { "creation_${token.hashCode()}_$workspaceId" }
    val restored = remember(pendingKey) { runCatching { JSONObject(preferences.getString(pendingKey, null) ?: "") }.getOrNull() }
    var pendingCreation by remember { mutableStateOf(restored) }
    var answer by remember { mutableStateOf(restored?.optJSONObject("answer") ?: runCatching { JSONObject(preferences.getString("draft_$pendingKey",null) ?: "") }.getOrNull()) }
    var captionsVisible by remember { mutableStateOf(preferences.getBoolean("captions", false)) }
    var preparing by remember { mutableStateOf(false) }
    var success by remember { mutableStateOf<String?>(null) }
    var scheduleOpen by remember { mutableStateOf(false) }
    var dateOpen by remember { mutableStateOf(false) }
    var confirmationId by remember { mutableStateOf(UUID.randomUUID().toString()) }
    var creating by remember { mutableStateOf(false) }
    var closeRequested by remember { mutableStateOf(false) }
    val captions = remember { mutableStateListOf<PopCaption>() }
    LaunchedEffect(answer?.toString()) {
        preferences.edit().putString("draft_$pendingKey",answer?.toString()).apply()
    }
    var voiceMode by remember { mutableStateOf(false) }
    var voiceRequested by remember { mutableStateOf(false) }
    var beginVoiceWhenReady by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf("") }
    var sending by remember { mutableStateOf(false) }
    var readingFiles by remember { mutableStateOf(false) }
    var selectedFiles by remember { mutableStateOf(emptyList<PopChatFile>()) }
    var contextFiles by remember { mutableStateOf(emptyList<PopChatFile>()) }
    val chatKey = remember(pendingKey) { "chat_$pendingKey" }
    val messages = remember {
        mutableStateListOf<PopChatMessage>().apply {
            runCatching {
                val saved = JSONArray(preferences.getString(chatKey,"[]"))
                for(index in 0 until saved.length()) {
                    val item = saved.getJSONObject(index)
                    add(PopChatMessage(item.getString("id"),item.getString("role"),item.getString("text")))
                }
            }
        }
    }
    val chatScroll = rememberLazyListState()
    LaunchedEffect(messages.size, sending) {
        if(messages.isNotEmpty()) chatScroll.animateScrollToItem(0)
    }
    LaunchedEffect(messages.toList()) {
        val saved = JSONArray()
        messages.takeLast(40).forEach { saved.put(JSONObject().put("id",it.id).put("role",it.role).put("text",it.text.take(4000))) }
        preferences.edit().putString(chatKey,saved.toString()).apply()
    }
    val documentPicker = rememberLauncherForActivityResult(ActivityResultContracts.OpenMultipleDocuments()) { uris ->
        if(uris.isNotEmpty()) scope.launch {
            readingFiles = true; error = null
            try {
                require(uris.size+selectedFiles.size <= 3) { "Selecione até três arquivos por mensagem." }
                val loaded = uris.map { readPopChatFile(context,it) }
                require((selectedFiles+loaded).sumOf { it.size } <= 8*1024*1024) { "Os arquivos juntos podem ter até 8 MB." }
                selectedFiles = selectedFiles+loaded
            } catch(e: CancellationException) { throw e } catch(e: Exception) { error = e.message }
            finally { readingFiles = false }
        }
    }

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
        state = "connecting"; voiceMode = true; captions.clear(); consumedVoiceEnd = -1L; lastUserSpeechAt = 0L
        val draft = answer?.optJSONObject("draft")?.toString() ?: "null"
        command("window.PopVoice.start($draft)")
    }
    fun requestVoice() {
        voiceMode = true; voiceRequested = true
        if(ready) start() else beginVoiceWhenReady = true
    }
    val permission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { allowed ->
        if (allowed) requestVoice() else error = "Permita o acesso ao microfone para conversar com o Pop."
    }
    LaunchedEffect(ready) { if(ready && beginVoiceWhenReady) { beginVoiceWhenReady = false; start() } }
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
            "ended" -> {
                state = "idle"; muted = false; preparing = false; releaseAudio()
                captions.takeLast(12).forEach { messages.add(PopChatMessage(UUID.randomUUID().toString(),it.role,it.text)) }
                captions.clear()
                if (closeRequested) onDismiss()
            }
            "preparing" -> preparing = true
            "prepared" -> preparing = false
            "discard" -> if(!creating && pendingCreation == null) { answer = null; success = null }
            "error" -> {
                if(event.has("code")) {
                    preferences.edit().putString("last_live_error",JSONObject().put("code",event.optString("code")).put("detail",event.optString("detail")).put("at",System.currentTimeMillis()).toString()).apply()
                    android.util.Log.w("PopVoice",event.optString("code")+": "+event.optString("detail"))
                }
                preparing = false; error = if (success != null) "Alteração salva. Houve uma falha apenas na chamada de voz." else event.optString("message")
            }
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
                val role = event.optString("role"); if(role == "user") lastUserSpeechAt = android.os.SystemClock.elapsedRealtime() else popSpeechAt = android.os.SystemClock.elapsedRealtime(); val end = event.optLong("end"); val previous = captions.lastOrNull()
                if (previous != null && previous.role == role && event.optLong("start") - previous.end < 1500)
                    captions[captions.lastIndex] = previous.copy(text = (previous.text + text).takeLast(2000), end = end)
                else captions.add(PopCaption(role, text, end))
                while (captions.size > 80) captions.removeAt(0)
            }
        }
    }
    fun sendText() {
        if(sending || readingFiles || creating || (message.isBlank() && selectedFiles.isEmpty())) return
        if(pendingCreation != null) { error = "Verifique a confirmação pendente antes de continuar."; return }
        val text = message.trim(); val files = if(selectedFiles.isNotEmpty()) selectedFiles else contextFiles
        val history = JSONArray()
        messages.takeLast(16).forEach { history.put(JSONObject().put("role",it.role).put("content",it.text.take(4000))) }
        val uploads = JSONArray(); files.forEach { uploads.put(JSONObject().put("name",it.name).put("dataUrl",it.dataUrl)) }
        val request = JSONObject().put("action","chat").put("message",text).put("messages",history).put("attachments",uploads)
            .put("draft",answer?.optJSONObject("draft") ?: JSONObject.NULL).put("sourceTaskId",answer?.popSourceTaskId() ?: JSONObject.NULL)
        messages.add(PopChatMessage(UUID.randomUUID().toString(),"user",text.ifBlank { "Analise estes arquivos" },selectedFiles.map { it.name }))
        contextFiles = files; selectedFiles = emptyList(); message = ""; sending = true; error = null; success = null
        scope.launch {
            try {
                val result = popRequest(token,workspaceId,request)
                messages.add(PopChatMessage(UUID.randomUUID().toString(),"assistant",result.getString("reply")))
                result.optJSONObject("answer")?.let { answer = it; confirmationId = UUID.randomUUID().toString() }
                if(result.optBoolean("discardDraft") && !creating && pendingCreation == null) answer = null
            } catch(e: CancellationException) { throw e } catch(e: Exception) { error = e.message ?: "Não foi possível enviar a mensagem."; message = text }
            finally { sending = false }
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
                val result = popRequest(token,workspaceId,JSONObject().put("action","prepare").put("draft",next).put("missingFields",missing).put("sourceTaskId",answer?.popSourceTaskId() ?: JSONObject.NULL))
                answer = result; confirmationId = UUID.randomUUID().toString()
                runCatching { command("window.PopVoice.updated(${result.getJSONObject("draft")})") }
            } catch(e: CancellationException) { throw e }
            catch(e: Exception) { error = e.message ?: "Não foi possível revisar os horários." }
            finally { preparing = false }
        }
    }
    fun confirm(onResult: ((JSONObject) -> Unit)? = null) {
        val current = answer
        if (current == null || creating || preparing || current.optString("status") != "ready") {
            onResult?.invoke(JSONObject().put("error","Prepare e revise uma atividade antes de confirmar.")); return
        }
        if(current.popSourceTaskId() != null) {
            if(onResult != null) { onResult(JSONObject().put("error","O Pop somente sugere melhorias para atividades existentes.")); return }
            val draft = current.optJSONObject("draft") ?: return
            val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as android.content.ClipboardManager
            clipboard.setPrimaryClip(android.content.ClipData.newPlainText("Sugestão do Pop",draft.optString("title")+"\n\n"+draft.optString("description")))
            success = "Sugestão copiada"
            return
        }
        // Keep the exact payload and id across timeouts and reopening the screen.
        val attempt = pendingCreation ?: JSONObject().put("requestId",confirmationId).put("answer",JSONObject(current.toString()))
        if (!preferences.edit().putString(pendingKey,attempt.toString()).commit()) { error = "Não foi possível guardar a confirmação neste aparelho."; onResult?.invoke(JSONObject().put("error",error)); return }
        pendingCreation = attempt; creating = true; error = null
        scope.launch {
            val snapshot = attempt.getJSONObject("answer").getJSONObject("draft")
            var serverResult: JSONObject? = null
            try {
                val result = popRequest(token,workspaceId,JSONObject().put("action","create").put("draft",snapshot).put("requestId",attempt.getString("requestId")))
                check(result.optBoolean("created")) { "O servidor ainda não confirmou a criação." }
                serverResult = result
            } catch(e: CancellationException) { throw e }
            catch(e: Exception) {
                if(e is PopRequestFailure && e.status in 400..499 && e.status !in listOf(408,409,429)) {
                    pendingCreation = null; preferences.edit().remove(pendingKey).commit()
                    confirmationId = UUID.randomUUID().toString()
                    error = e.message
                } else error = "Não recebi a confirmação. Toque em Verificar confirmação para conferir sem repetir a alteração."
                creating = false
                onResult?.invoke(JSONObject().put("error",error))
                return@launch
            }
            // From here onward the VPS has confirmed success. Audio and UI refresh
            // failures must never turn a saved activity into a failed creation.
            preferences.edit().remove(pendingKey).commit()
            pendingCreation = null; answer = null; creating = false
            // Com o título, o histórico diz ao Pop qual tarefa foi criada (o chat consulta esta frase).
            success = "Atividade “${snapshot.optString("title")}” criada com sucesso"
            messages.add(PopChatMessage(UUID.randomUUID().toString(),"assistant",success!!))
            if(onResult == null) runCatching { command("window.PopVoice.created(${JSONObject.quote(snapshot.optString("title"))})") }
            else onResult(serverResult!!)
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
            val previewHeight by animateDpAsState(if(WindowInsets.ime.getBottom(LocalDensity.current)>0) 146.dp else 330.dp,label = "Pop review height")
            Column(Modifier.fillMaxSize().statusBarsPadding().navigationBarsPadding().imePadding().padding(horizontal = 16.dp, vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(Modifier.fillMaxWidth().height(64.dp),verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = ::dismiss) { Icon(Icons.Outlined.ArrowBack, "Voltar", tint = PopText) }
                    Column(Modifier.weight(1f).padding(start = 6.dp)) {
                        Text("Pop", fontSize = 20.sp, fontWeight = FontWeight.SemiBold, color = PopText)
                        Text(workspaceName, fontSize = 11.sp, color = PopMuted, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                    if(voiceMode) {
                        IconToggleButton(checked = captionsVisible, onCheckedChange = { captionsVisible = it; preferences.edit().putBoolean("captions", it).apply() }) {
                            Icon(Icons.Outlined.Subtitles,if(captionsVisible) "Ocultar legendas" else "Mostrar legendas",tint = if(captionsVisible) PopBlue else PopMuted)
                        }
                    }

                }
                Box(Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                    if(!voiceMode && messages.isNotEmpty()) {
                        LazyColumn(Modifier.fillMaxSize(),state = chatScroll,verticalArrangement = Arrangement.spacedBy(14.dp),reverseLayout = true) {
                            if(sending) item { Text("Pop está pensando…",color = PopMuted,fontSize = 13.sp) }
                            items(messages.asReversed().toList(),key = { it.id }) { item ->
                                Column(Modifier.fillMaxWidth(),horizontalAlignment = if(item.role == "user") Alignment.End else Alignment.Start) {
                                    if(item.files.isNotEmpty()) Text(item.files.joinToString(" · "),color = PopMuted,fontSize = 11.sp)
                                    Surface(color = if(item.role == "user") PopSurfaceAlt else Color.Transparent,shape = RoundedCornerShape(18.dp)) {
                                        Text(popChatText(item.text),color = PopText,fontSize = 14.sp,lineHeight = 22.sp,modifier = Modifier.padding(if(item.role == "user") 13.dp else 4.dp))
                                    }
                                }
                            }
                        }
                    } else if(voiceMode && captionsVisible && captions.isNotEmpty()) {
                        LazyColumn(Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(12.dp), reverseLayout = true) {
                            items(captions.asReversed().toList()) { caption ->
                                Column(Modifier.fillMaxWidth().padding(vertical = 6.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                    Text(if(caption.role == "user") "Você" else "Pop", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = if(caption.role == "user") PopMuted else PopBlue)
                                    Text(caption.text, color = PopText, fontSize = 15.sp, lineHeight = 23.sp)
                                }
                            }
                        }
                    } else {
                        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(24.dp)) {
                            // Encolhe junto quando falta altura (teclado aberto ou rascunho na tela).
                            BoxWithConstraints(Modifier.sizeIn(maxWidth = 184.dp,maxHeight = 184.dp).aspectRatio(1f)) {
                                PopVoiceOrb(state == "connected",preparing,diameter = minOf(maxWidth,maxHeight),speaking = popSpeaking,muted = muted)
                            }
                            if(voiceMode) Text(when(state) { "connecting" -> "Só um instante…"; "connected" -> if(preparing) "Preparando sua atividade…" else if(muted) "Microfone desligado" else "Pode falar, estou ouvindo"; "closing" -> "Até já!"; else -> "Oi! O que vamos organizar?" },
                                color = PopText, fontSize = 16.sp, fontWeight = FontWeight.Medium, textAlign = TextAlign.Center)

                        }
                    }
                }
                answer?.let { value ->
                    PopDraftReview(value, canEdit = !creating && !preparing && pendingCreation == null, canConfirm = !creating && !preparing, creating = creating, pending = pendingCreation != null,
                        onSchedule = { scheduleOpen = true }, onDate = { dateOpen = true }, onConfirm = { confirm() },
                        onDiscard = { answer = null; success = null; command("window.PopVoice.discarded()") }, maxHeight = previewHeight)
                }
                success?.let { message ->
                    Row(Modifier.fillMaxWidth().background(PopBlueSoft,RoundedCornerShape(14.dp)).padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Outlined.CheckCircle, null, tint = PopBlue, modifier = Modifier.size(18.dp)); Spacer(Modifier.width(8.dp)); Text(message,color = PopText,fontSize = 13.sp,fontWeight = FontWeight.SemiBold)
                    }
                }
                error?.let { Text(it, color = MaterialTheme.colorScheme.error, fontSize = 12.sp) }
                if(voiceMode) {
                Row(Modifier.fillMaxWidth().padding(vertical = 12.dp), horizontalArrangement = Arrangement.spacedBy(20.dp,Alignment.CenterHorizontally), verticalAlignment = Alignment.CenterVertically) {
                    FilledIconButton(onClick = { muted = !muted; command("window.PopVoice.mute($muted)") },enabled = state == "connected",modifier = Modifier.size(56.dp),
                        colors = IconButtonDefaults.filledIconButtonColors(containerColor = if(muted) Color(0xFFE53935) else PopSurfaceAlt,contentColor = if(muted) Color.White else PopText,disabledContainerColor = PopSurface,disabledContentColor = PopMuted)) {
                        Icon(if(muted) Icons.Outlined.MicOff else Icons.Outlined.Mic, "Alternar microfone",Modifier.size(24.dp))
                    }
                    FilledIconButton(onClick = {
                        if(state != "idle") stop()
                        else if(ContextCompat.checkSelfPermission(context,Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) requestVoice()
                        else permission.launch(Manifest.permission.RECORD_AUDIO)
                    }, enabled = ready && state != "closing" && !creating, modifier = Modifier.size(56.dp),
                        colors = IconButtonDefaults.filledIconButtonColors(containerColor = if(state != "idle") MaterialTheme.colorScheme.error else PopBlue,contentColor = Color.White)) {
                        if(state == "connecting") CircularProgressIndicator(Modifier.size(24.dp),color = Color.White,strokeWidth = 2.dp)
                        else Icon(if(state == "idle") Icons.Outlined.GraphicEq else Icons.Outlined.CallEnd, if(state == "idle") "Conversar com o Pop" else "Encerrar chamada", Modifier.size(24.dp))
                    }
                    FilledIconButton(onClick = { if(state != "idle") stop(); voiceMode = false },modifier = Modifier.size(56.dp),
                        colors = IconButtonDefaults.filledIconButtonColors(containerColor = PopSurfaceAlt,contentColor = PopText)) {
                        Icon(Icons.Outlined.Keyboard,"Conversar por texto",Modifier.size(24.dp))
                    }
                }
                } else {
                    PopChatComposer(message, { message = it.take(6000) }, selectedFiles,
                        busy = sending || readingFiles || creating,
                        onRemove = { index -> selectedFiles = selectedFiles.filterIndexed { position,_ -> position != index } },
                        onAttach = { documentPicker.launch(arrayOf("*/*")) },
                        onSend = ::sendText,
                        onVoice = {
                            if(ContextCompat.checkSelfPermission(context,Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) requestVoice()
                            else permission.launch(Manifest.permission.RECORD_AUDIO)
                        })
                    Text("O Pop pode analisar arquivos e tarefas do seu espaço.",color = PopMuted,fontSize = 10.sp,modifier = Modifier.align(Alignment.CenterHorizontally))
                }
                // The WebView handles WebRTC only; every visible control above is native Compose.
                if(voiceRequested) AndroidView(modifier = Modifier.size(1.dp), factory = { ctx ->
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
                                    require(input.optString("action") in listOf("connect","prepare","search","indicators","structure","confirm_voice")) { "Operação indisponível." }
                                    if(input.optString("action") in listOf("connect","prepare") && !input.has("sourceTaskId")) answer?.popSourceTaskId()?.let { input.put("sourceTaskId",it) }
                                    if(input.optString("action") == "connect") {
                                        val history = JSONArray()
                                        messages.takeLast(12).forEach { history.put(JSONObject().put("role",it.role).put("content",it.text.take(1000))) }
                                        input.put("messages",history)
                                    }
                                    if(input.optString("action") == "confirm_voice") {
                                        val speech = captions.lastOrNull { it.role == "user" }
                                        require(state == "connected" && speech != null && input.optString("confirmation") == "eu confirmo" && isPopVoiceConfirmation(speech.text,android.os.SystemClock.elapsedRealtime()-lastUserSpeechAt,lastUserSpeechAt,consumedVoiceEnd)) { "Diga eu confirmo para criar a atividade revisada." }
                                        require(answer?.popSourceTaskId() == null && answer?.optString("status") == "ready" && !creating && !preparing) { "Não há uma nova atividade pronta para confirmar." }
                                        consumedVoiceEnd = lastUserSpeechAt
                                        val confirmation = CompletableDeferred<JSONObject>()
                                        confirm { confirmation.complete(it) }
                                        confirmation.await()
                                    } else popRequest(token,workspaceId,input)
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
private fun PopVoiceOrb(active: Boolean, preparing: Boolean, diameter: Dp = 144.dp, speaking: Boolean = false, muted: Boolean = false) {
    val breath = rememberInfiniteTransition(label = "Pop aurora").animateFloat(1f,if(active || preparing) 1.055f else 1.025f,infiniteRepeatable(tween(2200,easing = FastOutSlowInEasing),RepeatMode.Reverse),label = "aurora-breath")
    val speed by animateFloatAsState(when { speaking && !muted -> 6f; preparing -> 1.45f; else -> 1f },tween(600),label = "aurora-velocidade")
    // "Volume" falso da fala: alvos aleatórios a cada 90–220 ms, para a esfera crescer e as ondas se agitarem
    // como se acompanhassem a voz. Parado ou no mudo, volta a zero.
    val voice = remember { Animatable(0f) }
    LaunchedEffect(speaking && !muted) {
        if(!speaking || muted) voice.animateTo(0f,tween(300))
        else while(true) voice.animateTo(.15f + Random.nextFloat() * .85f,tween(Random.nextInt(90,220),easing = FastOutSlowInEasing))
    }
    var spin by remember { mutableFloatStateOf(0f) }
    LaunchedEffect(Unit) {
        var last = 0L
        // 18°/s é uma volta a cada 20 s; volta a zero em 3600° (múltiplo das voltas de todas as camadas).
        while(true) withFrameNanos { now -> if(last != 0L) spin = (spin + (now - last) / 1e9f * 18f * speed) % 3600f; last = now }
    }
    // No mudo a esfera fica azul e parada, sem pulsar.
    Box(Modifier.size(diameter).padding(diameter * .045f).graphicsLayer { val scale = if(muted) 1f else breath.value * (1f + .14f * voice.value); scaleX = scale; scaleY = scale }.clip(CircleShape)) {
        Image(painterResource(R.drawable.pop_orb),null,Modifier.fillMaxSize())
        Image(painterResource(R.drawable.pop_orb_flow),null,Modifier.fillMaxSize().graphicsLayer {
            val wave = sin(Math.toRadians(spin * 1.5).toFloat())
            rotationZ = spin; scaleX = 1f + .12f * voice.value * wave; scaleY = 1f - .1f * voice.value * wave
        })
        Image(painterResource(R.drawable.pop_orb_flow),null,Modifier.fillMaxSize().graphicsLayer {
            val angle = Math.toRadians(spin * 2.3).toFloat()
            rotationZ = 180f - spin * .7f; scaleX = 1.12f + .12f * voice.value * sin(angle); scaleY = .94f + .1f * voice.value * cos(angle); alpha = .4f + .3f * voice.value
        })
    }
}

@Composable
private fun PopDraftReview(answer: JSONObject, canEdit: Boolean, canConfirm: Boolean, creating: Boolean, pending: Boolean, onSchedule: () -> Unit, onDate: () -> Unit, onConfirm: () -> Unit, onDiscard: () -> Unit, maxHeight: Dp = 330.dp) {
    val draft = answer.optJSONObject("draft") ?: return
    val start = draft.optString("dueTime").takeUnless { it == "null" }.orEmpty()
    val minutes = if(draft.isNull("durationMinutes")) null else draft.optInt("durationMinutes").takeIf { it > 0 }
    val end = taskEndTime(start,taskDurationLabel(minutes))
    val date = draft.optString("dueDate").takeUnless { it == "null" }.orEmpty().split("-").reversed().joinToString("/")
    val responsible = answer.optJSONObject("preview")?.optString("responsible").orEmpty()
    val target = answer.optJSONObject("preview")?.optString("target").orEmpty().takeUnless { it == "null" }.orEmpty()
    val priority = when(draft.optString("priority")) { "urgent" -> "Urgente"; "high" -> "Alta"; "low" -> "Baixa"; else -> "Média" }
    val priorityColor = when(priority) { "Urgente" -> Color(0xFFE32636); "Alta" -> Color(0xFFFF7A1A); "Média" -> Color(0xFFFFB000); else -> Color(0xFF159B62) }
    Surface(color = PopSurface, shape = RoundedCornerShape(20.dp), modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.heightIn(max = maxHeight).verticalScroll(rememberScrollState()).padding(16.dp),verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(if(answer.popSourceTaskId() != null) "Melhoria sugerida" else "Revisar atividade",color = PopMuted,fontSize = 11.sp,fontWeight = FontWeight.SemiBold)
            Text(draft.optString("title").takeUnless { it == "null" }.orEmpty(),color = PopText,fontSize = 16.sp,fontWeight = FontWeight.Bold,maxLines = 2,overflow = TextOverflow.Ellipsis)
            Row(Modifier.fillMaxWidth(),verticalAlignment = Alignment.CenterVertically,horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Prioridade",color = PopMuted,fontSize = 12.sp)
                Surface(color = priorityColor.copy(alpha = .13f),shape = RoundedCornerShape(8.dp)) { Text(priority,color = priorityColor,fontSize = 11.sp,fontWeight = FontWeight.SemiBold,modifier = Modifier.padding(horizontal = 9.dp,vertical = 4.dp)) }
            }
            if(target.isNotBlank()) Text((when(draft.optString("targetType")) { "group" -> "Grupo"; "department" -> "Setor"; "company" -> "Empresa"; else -> "Destino" })+": $target",color = PopText,fontSize = 12.sp,fontWeight = FontWeight.Medium)
            if(responsible.isNotBlank()) Text("Responsável: $responsible",color = PopMuted,fontSize = 12.sp)
            draft.optString("description").takeUnless { it.isBlank() || it == "null" }?.let { Text(it,color = PopMuted,fontSize = 12.sp,lineHeight = 19.sp) }
            Row(Modifier.fillMaxWidth(),horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                PopScheduleTile("Início",start.ifBlank { "Definir" },canEdit,Modifier.weight(1f),onSchedule)
                PopScheduleTile("Até",end ?: "Sem término",canEdit,Modifier.weight(1f),onSchedule)
            }
            TextButton(onClick = onDate,enabled = canEdit,contentPadding = PaddingValues(0.dp)) {
                Icon(Icons.Outlined.CalendarToday,null,Modifier.size(16.dp)); Spacer(Modifier.width(8.dp)); Text(date.ifBlank { "Definir data" },fontSize = 12.sp)
            }
            val recurrence = draft.optJSONObject("recurrence")
            val frequency = when(recurrence?.optString("frequency")) { "daily" -> "Diária"; "weekly" -> "Semanal"; "biweekly" -> "Quinzenal"; "monthly" -> "Mensal"; "yearly" -> "Anual"; "custom" -> "A cada ${recurrence?.optInt("interval") ?: 1} "+when(recurrence?.optString("customUnit")){"weeks" -> "semanas"; "months" -> "meses"; else -> "dias"}; else -> "Sem recorrência" }
            Text(frequency,color = PopMuted,fontSize = 11.sp)
            if(draft.optBoolean("requiresReview")) Text("Revisão: "+(answer.optJSONObject("preview")?.optString("reviewer")?.takeUnless { it.isBlank() || it == "null" } ?: "Obrigatória"),color = PopMuted,fontSize = 12.sp)
            val checklist = draft.optJSONArray("checklist")
            if(checklist != null && checklist.length() > 0) {
                Text("Checklist",color = PopText,fontSize = 12.sp,fontWeight = FontWeight.SemiBold)
                for(index in 0 until checklist.length()) Text("• "+checklist.optString(index),color = PopMuted,fontSize = 12.sp)
            }
            val tags = draft.optJSONArray("tags")
            if(tags != null && tags.length() > 0) Text((0 until tags.length()).joinToString("  ") { "#"+tags.optString(it) },color = PopBlue,fontSize = 11.sp)
            if(answer.optString("status") == "ready") Button(onClick = onConfirm,enabled = canConfirm,modifier = Modifier.fillMaxWidth().height(46.dp),shape = RoundedCornerShape(13.dp)) {
                if(creating) CircularProgressIndicator(Modifier.size(18.dp),strokeWidth = 2.dp,color = Color.White)
                else Text(if(pending) "Verificar confirmação" else if(answer.popSourceTaskId() != null) "Copiar sugestão" else "Confirmar e criar",fontWeight = FontWeight.Bold)
            } else Text(answer.optString("reply"),color = PopMuted,fontSize = 12.sp)
            TextButton(onClick = onDiscard,enabled = !creating && !pending,modifier = Modifier.fillMaxWidth()) { Text("Descartar",color = PopMuted,fontWeight = FontWeight.SemiBold) }
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

@Composable
private fun PopChatComposer(value: String, onValue: (String) -> Unit, files: List<PopChatFile>, busy: Boolean, onRemove: (Int) -> Unit, onAttach: () -> Unit, onSend: () -> Unit, onVoice: () -> Unit) {
    Surface(color = PopSurface,shape = RoundedCornerShape(24.dp),border = androidx.compose.foundation.BorderStroke(1.dp,PopBorder),modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(8.dp),verticalArrangement = Arrangement.spacedBy(4.dp)) {
            if(files.isNotEmpty()) LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                items(files.size) { index ->
                    InputChip(selected = true,onClick = {},label = { Text(files[index].name.take(32),maxLines = 1,fontSize = 11.sp) },trailingIcon = {
                        IconButton(onClick = { onRemove(index) },enabled = !busy,modifier = Modifier.size(24.dp)) { Icon(Icons.Outlined.Close,"Remover ${files[index].name}",Modifier.size(14.dp)) }
                    })
                }
            }
            Row(Modifier.fillMaxWidth(),verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onAttach,enabled = !busy,modifier = Modifier.size(40.dp)) { Icon(Icons.Outlined.Add,"Anexar arquivo",tint = PopMuted) }
                BasicTextField(value = value,onValueChange = onValue,maxLines = 5,
                    textStyle = MaterialTheme.typography.bodyMedium.copy(fontSize = 14.sp,lineHeight = 22.sp,color = PopText),enabled = !busy,cursorBrush = SolidColor(PopBlue),
                    modifier = Modifier.weight(1f).heightIn(min = 44.dp,max = 150.dp),
                    decorationBox = { field -> Box(Modifier.padding(horizontal = 8.dp,vertical = 10.dp),contentAlignment = Alignment.CenterStart) {
                        if(value.isEmpty()) Text("Mensagem para o Pop",fontSize = 13.sp,color = PopMuted)
                        field()
                    } })
                IconButton(onClick = if(value.isNotBlank() || files.isNotEmpty()) onSend else onVoice,enabled = !busy,modifier = Modifier.size(44.dp)) {
                    if(busy) CircularProgressIndicator(Modifier.size(22.dp),strokeWidth = 2.dp,color = PopBlue)
                    else if(value.isNotBlank() || files.isNotEmpty()) {
                        Box(Modifier.size(36.dp).background(PopBlue,CircleShape),contentAlignment = Alignment.Center) { Icon(Icons.Outlined.ArrowUpward,"Enviar mensagem",tint = Color.White,modifier = Modifier.size(21.dp)) }
                    } else Box(Modifier.size(40.dp),contentAlignment = Alignment.Center) {
                        PopVoiceOrb(false,false,diameter = 40.dp)
                        Icon(Icons.Outlined.GraphicEq,"Conversar por voz",tint = Color.Transparent,modifier = Modifier.size(38.dp))
                    }
                }
            }
        }
    }
}

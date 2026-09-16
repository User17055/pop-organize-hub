package br.com.poporganize.shared

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.tween
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.border
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.WindowInsetsSides
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.only
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.Apartment
import androidx.compose.material.icons.rounded.ArrowBack
import androidx.compose.material.icons.rounded.Business
import androidx.compose.material.icons.rounded.CalendarMonth
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.ChevronLeft
import androidx.compose.material.icons.rounded.ChevronRight
import androidx.compose.material.icons.rounded.DarkMode
import androidx.compose.material.icons.rounded.DeleteOutline
import androidx.compose.material.icons.rounded.Email
import androidx.compose.material.icons.rounded.ErrorOutline
import androidx.compose.material.icons.rounded.ExpandLess
import androidx.compose.material.icons.rounded.ExpandMore
import androidx.compose.material.icons.rounded.Groups
import androidx.compose.material.icons.rounded.Home
import androidx.compose.material.icons.rounded.HourglassEmpty
import androidx.compose.material.icons.rounded.LightMode
import androidx.compose.material.icons.rounded.ListAlt
import androidx.compose.material.icons.rounded.MoreHoriz
import androidx.compose.material.icons.rounded.MoreVert
import androidx.compose.material.icons.rounded.NotificationsActive
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material.icons.rounded.RadioButtonUnchecked
import androidx.compose.material.icons.rounded.Settings
import androidx.compose.material.icons.rounded.TaskAlt
import androidx.compose.material.icons.rounded.Repeat
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.SwipeToDismissBox
import androidx.compose.material3.SwipeToDismissBoxValue
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberSwipeToDismissBoxState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.datetime.DatePeriod
import kotlinx.datetime.LocalDate
import kotlinx.datetime.plus
import org.jetbrains.compose.resources.painterResource
import br.com.poporganize.shared.resources.Res
import br.com.poporganize.shared.resources.email_code_message
import br.com.poporganize.shared.resources.onboarding_organize
import br.com.poporganize.shared.resources.onboarding_team
import br.com.poporganize.shared.resources.onboarding_track

@Composable
fun PopOrganizeApp(platform: PopPlatformServices) {
    val store = remember(platform) { PopStore(platform) }
    val state = store.state
    val scope = rememberCoroutineScope()
    var availableUpdate by remember { mutableStateOf<AppUpdate?>(null) }
    var dismissedUpdateVersion by remember { mutableStateOf<String?>(null) }

    suspend fun checkForUpdate() {
        val update = runCatching { platform.availableUpdate() }.getOrNull()
        availableUpdate = update?.takeUnless { it.version == dismissedUpdateVersion }
    }

    SideEffect { platform.applyTheme(state.theme == PopThemeMode.Light) }

    LaunchedEffect(platform) {
        checkForUpdate()
        platform.observeForeground {
            store.refreshNow()
            scope.launch { checkForUpdate() }
        }
    }

    PopTheme(light = state.theme == PopThemeMode.Light) {
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = MaterialTheme.colorScheme.background,
        ) {
            when {
                !state.onboardingComplete -> OnboardingScreen(store::finishOnboarding)
                state.currentUser == null && !state.guestMode -> LoginScreen(store, platform)
                else -> MainScreen(store, platform)
            }
        }
        availableUpdate?.let { update ->
            AlertDialog(
                onDismissRequest = {
                    dismissedUpdateVersion = update.version
                    availableUpdate = null
                },
                title = { Text("Nova versão disponível", fontWeight = FontWeight.Bold) },
                text = { Text("A versão ${update.version} do Pop Organize está disponível. Atualize para receber as melhorias mais recentes.") },
                confirmButton = {
                    TextButton(
                        onClick = {
                            dismissedUpdateVersion = update.version
                            availableUpdate = null
                            platform.openExternalUrl(update.storeUrl)
                        },
                    ) { Text("Atualizar") }
                },
                dismissButton = {
                    TextButton(
                        onClick = {
                            dismissedUpdateVersion = update.version
                            availableUpdate = null
                        },
                    ) { Text("Depois") }
                },
            )
        }
    }
}

@Composable
private fun PopLogo(
    modifier: Modifier = Modifier,
    fontSize: TextUnit = 24.sp,
    color: Color = MaterialTheme.colorScheme.onBackground,
) {
    // O ponto azul acompanha o tamanho da letra em vez de ser fixo em 17dp: em escala reduzida, um
    // ponto que nao encolhe junto deixa de ser a letra "o" e vira uma bolinha ao lado do texto.
    val dot = with(LocalDensity.current) { (fontSize.toPx() * 0.72f).toDp() }
    Row(modifier = modifier, verticalAlignment = Alignment.CenterVertically) {
        Text(
            text = "P",
            color = color,
            fontSize = fontSize,
            fontWeight = FontWeight.ExtraBold,
        )
        Box(Modifier.padding(horizontal = 1.dp).size(dot).background(PopBlue, CircleShape))
        Text(
            text = "p Organize",
            color = color,
            fontSize = fontSize,
            fontWeight = FontWeight.ExtraBold,
        )
    }
}

@Composable
private fun OnboardingScreen(onFinish: () -> Unit) {
    val pages = listOf(
        Triple("Organize tudo em um só lugar", "Crie tarefas, defina prazos e acompanhe suas atividades.", Icons.Rounded.TaskAlt),
        Triple("Trabalhe junto com sua equipe", "Distribua atividades para pessoas, setores e grupos.", Icons.Rounded.Groups),
        Triple("Acompanhe cada etapa", "Receba lembretes e não deixe um prazo passar.", Icons.Rounded.NotificationsActive),
    )
    var page by remember { mutableIntStateOf(0) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF1C1E1E))
            .windowInsetsPadding(WindowInsets.safeDrawing)
            .padding(horizontal = 28.dp, vertical = 18.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        PopLogo(fontSize = 29.sp, color = Color.White)
        AnimatedContent(targetState = page, modifier = Modifier.weight(1f)) { index ->
            val item = pages[index]
            val illustration = when (index) {
                0 -> Res.drawable.onboarding_organize
                1 -> Res.drawable.onboarding_team
                else -> Res.drawable.onboarding_track
            }
            Column(
                modifier = Modifier.fillMaxSize(),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                Image(
                    painter = painterResource(illustration),
                    contentDescription = null,
                    contentScale = ContentScale.Fit,
                    modifier = Modifier.size(320.dp),
                )
                Spacer(Modifier.height(38.dp))
                Text(
                    buildAnnotatedString {
                        when (index) {
                            0 -> {
                                append("Organize ")
                                withStyle(SpanStyle(color = PopBlue)) { append("tudo") }
                                append(" em um só lugar")
                            }
                            1 -> {
                                append("Trabalhe junto com sua ")
                                withStyle(SpanStyle(color = PopBlue)) { append("equipe") }
                            }
                            else -> {
                                append("Acompanhe ")
                                withStyle(SpanStyle(color = PopBlue)) { append("cada") }
                                append(" etapa")
                            }
                        }
                    },
                    color = Color.White,
                    fontSize = 29.sp,
                    fontWeight = FontWeight.ExtraBold,
                    lineHeight = 34.sp,
                    textAlign = TextAlign.Center,
                )
                Spacer(Modifier.height(14.dp))
                Text(
                    item.second,
                    color = Color.White.copy(alpha = .58f),
                    fontSize = 15.sp,
                    lineHeight = 24.sp,
                    textAlign = TextAlign.Center,
                )
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(7.dp)) {
            pages.indices.forEach { index ->
                Box(
                    Modifier.size(if (index == page) 32.dp else 10.dp, 10.dp)
                        .background(if (index == page) PopBlue else Color.White, CircleShape),
                )
            }
        }
        Spacer(Modifier.height(30.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            OnboardingButton(
                text = if (page == 0) "Pular" else "Voltar",
                background = Color.White.copy(alpha = .1f),
                foreground = Color.White,
                modifier = Modifier.weight(1f),
                onClick = { if (page == 0) onFinish() else page-- },
            )
            OnboardingButton(
                text = if (page == pages.lastIndex) "Começar" else "Próximo",
                background = if (page == pages.lastIndex) Color.White else PopBlue,
                foreground = if (page == pages.lastIndex) PopBlue else Color.White,
                modifier = Modifier.weight(1f),
                onClick = { if (page == pages.lastIndex) onFinish() else page++ },
            )
        }
    }
}

@Composable
private fun OnboardingButton(
    text: String,
    background: Color,
    foreground: Color,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    Surface(
        onClick = onClick,
        color = background,
        contentColor = foreground,
        shape = RoundedCornerShape(18.dp),
        modifier = modifier.height(56.dp),
    ) {
        Box(contentAlignment = Alignment.Center) {
            Text(text, fontSize = 14.sp, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun LoginScreen(store: PopStore, platform: PopPlatformServices) {
    var stage by remember { mutableStateOf(LoginStage.Choose) }
    var email by remember { mutableStateOf("") }
    var code by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    // Erro e aviso eram a mesma variavel, sempre pintada com a cor de erro: "Código enviado para
    // seu e-mail" aparecia em vermelho e era lida como falha.
    var feedbackError by remember { mutableStateOf<String?>(null) }
    var feedbackInfo by remember { mutableStateOf<String?>(null) }
    var resendIn by remember { mutableIntStateOf(0) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(resendIn) {
        if (resendIn > 0) {
            delay(1000)
            resendIn -= 1
        }
    }

    fun requestCode(resending: Boolean) {
        busy = true
        feedbackError = null
        feedbackInfo = null
        scope.launch {
            val error = store.requestEmailCode(email)
            if (error != null) {
                feedbackError = error
            } else {
                stage = LoginStage.Code
                code = ""
                resendIn = 30
                feedbackInfo = if (resending) "Novo código enviado." else "Enviamos um código para ${email.trim()}."
            }
            busy = false
        }
    }

    fun confirmCode() {
        if (busy || code.length != 6) return
        busy = true
        feedbackError = null
        feedbackInfo = null
        scope.launch {
            val error = store.verifyEmailCode(email, code)
            if (error != null) {
                feedbackError = error
                code = ""
            }
            busy = false
        }
    }

    // O Android esconde o teclado ao completar os 6 digitos mas nao envia, o que deixa um toque
    // sobrando no fim de todo login. Aqui o codigo completo ja confirma sozinho.
    LaunchedEffect(code) {
        if (code.length == 6) confirmCode()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .windowInsetsPadding(WindowInsets.safeDrawing)
            .imePadding()
            .padding(horizontal = 24.dp, vertical = 18.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        PopLogo()

        // O vazio fica todo AQUI, num lugar so. Antes esta Column tinha weight(1f): ela absorvia
        // o espaco livre inteiro e centralizava o titulo dentro dele, o que abria DOIS vazios --
        // um entre o logo e o titulo, outro entre o titulo e os botoes. No iPhone o resultado
        // eram tres blocos boiando, com o conteudo espremido nas pontas da tela.
        Spacer(Modifier.weight(1f))

        Column(
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            AnimatedContent(targetState = stage, label = "loginTitle") { current ->
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    if (current == LoginStage.Code) {
                        Image(
                            painter = painterResource(Res.drawable.email_code_message),
                            contentDescription = "Mensagem com código de confirmação",
                            contentScale = ContentScale.Fit,
                            modifier = Modifier.fillMaxWidth().height(132.dp).padding(bottom = 8.dp),
                        )
                    }
                    Text(
                        when (current) {
                            LoginStage.Choose -> "Comece por aqui"
                            LoginStage.Email -> "Entre com seu e-mail"
                            LoginStage.Code -> "Verifique seu e-mail"
                        },
                        fontSize = 30.sp,
                        lineHeight = 36.sp,
                        fontWeight = FontWeight.ExtraBold,
                        textAlign = TextAlign.Center,
                    )
                    Spacer(Modifier.height(10.dp))
                    Text(
                        when (current) {
                            LoginStage.Choose -> "Escolha como você quer continuar."
                            LoginStage.Email -> "Use a mesma conta no Android, iPhone e painel web."
                            LoginStage.Code -> "Digite o código de 6 números que enviamos para você."
                        },
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center,
                    )
                }
            }
        }

        Spacer(Modifier.height(30.dp))

        AnimatedContent(targetState = stage, label = "loginActions") { current ->
            Column(
                verticalArrangement = Arrangement.spacedBy(12.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                when (current) {
                    LoginStage.Choose -> {
                        if (platform.supportsAppleSignIn) {
                            AppleSignInButton(
                                enabled = !busy,
                                lightBackground = store.state.theme == PopThemeMode.Light,
                                onClick = {
                                    busy = true
                                    feedbackError = null
                                    scope.launch {
                                        feedbackError = store.completeSignIn(platform.signInWithApple())
                                        busy = false
                                    }
                                },
                                modifier = Modifier.fillMaxWidth().height(52.dp),
                            )
                        }
                        if (platform.supportsGoogleSignIn) {
                            OutlinedButton(
                                enabled = !busy,
                                onClick = {
                                    busy = true
                                    feedbackError = null
                                    scope.launch {
                                        feedbackError = store.completeSignIn(platform.signInWithGoogle())
                                        busy = false
                                    }
                                },
                                modifier = Modifier.fillMaxWidth().height(52.dp),
                            ) { Text(if (busy) "Conectando..." else "Continuar com Google") }
                        }
                        Button(
                            enabled = !busy,
                            onClick = { stage = LoginStage.Email; feedbackError = null; feedbackInfo = null },
                            modifier = Modifier.fillMaxWidth().height(52.dp),
                        ) {
                            Icon(Icons.Rounded.Email, null, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(8.dp))
                            Text("Entrar com e-mail", fontWeight = FontWeight.Bold)
                        }
                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = 4.dp)) {
                            HorizontalDivider(Modifier.weight(1f))
                            Text(
                                "ou",
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                fontSize = 12.sp,
                                modifier = Modifier.padding(horizontal = 12.dp),
                            )
                            HorizontalDivider(Modifier.weight(1f))
                        }
                        OutlinedButton(
                            onClick = store::continueAsGuest,
                            modifier = Modifier.fillMaxWidth().height(48.dp),
                        ) { Text("Continuar sem uma conta") }
                    }

                    LoginStage.Email -> {
                        OutlinedTextField(
                            email,
                            { email = it; feedbackError = null },
                            enabled = !busy,
                            label = { Text("E-mail") },
                            singleLine = true,
                            // Sem isto o iPhone abre o teclado alfabetico padrao, sem @ nem ponto.
                            keyboardOptions = KeyboardOptions(
                                keyboardType = KeyboardType.Email,
                                imeAction = ImeAction.Done,
                            ),
                            modifier = Modifier.fillMaxWidth(),
                        )
                        Button(
                            // contains("@") aceitava o proprio "@" sozinho; a expressao e a mesma
                            // do servidor, entao a recusa vem antes de gastar uma ida a rede.
                            enabled = !busy && isValidEmail(email),
                            onClick = { requestCode(resending = false) },
                            modifier = Modifier.fillMaxWidth().height(52.dp),
                        ) {
                            if (busy) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(20.dp),
                                    strokeWidth = 2.dp,
                                    color = MaterialTheme.colorScheme.onPrimary,
                                )
                            } else {
                                Text("Enviar código", fontWeight = FontWeight.Bold)
                            }
                        }
                        TextButton(
                            enabled = !busy,
                            onClick = { stage = LoginStage.Choose; feedbackError = null; feedbackInfo = null },
                        ) { Text("Voltar para outras opções") }
                    }

                    LoginStage.Code -> {
                        Surface(
                            color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = .55f),
                            shape = RoundedCornerShape(14.dp),
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 14.dp, vertical = 11.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Icon(Icons.Rounded.Email, null, tint = PopBlue, modifier = Modifier.size(18.dp))
                                Spacer(Modifier.width(9.dp))
                                Text(
                                    email.trim(),
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                )
                            }
                        }
                        EmailOtpField(
                            value = code,
                            onValueChange = { code = it; feedbackError = null },
                            enabled = !busy,
                        )
                        if (busy) {
                            CircularProgressIndicator(modifier = Modifier.size(24.dp), strokeWidth = 2.dp)
                        }
                        TextButton(
                            enabled = !busy && resendIn == 0,
                            onClick = { requestCode(resending = true) },
                        ) { Text(if (resendIn > 0) "Reenviar em ${resendIn}s" else "Reenviar código") }
                        TextButton(
                            enabled = !busy,
                            onClick = {
                                stage = LoginStage.Email
                                code = ""
                                resendIn = 0
                                feedbackError = null
                                feedbackInfo = null
                            },
                        ) { Text("Usar outro e-mail") }
                    }
                }
            }
        }

        // O aviso ficava no fim de uma lista rolavel: com o teclado aberto num iPhone pequeno ele
        // nascia fora da tela e o toque parecia nao ter feito nada.
        //
        // E depois disso ele ainda era 12sp cinza-avermelhado, centralizado, abaixo de tudo. Quando
        // o login com Apple falhou no primeiro iPhone que rodou o app, o motivo EXATO da falha
        // estava escrito ali -- e passou despercebido, porque o texto mais importante da tela era o
        // desenhado como menos importante. Custou uma ida e volta inteira de diagnostico.
        Spacer(Modifier.height(14.dp))
        val feedbackTexto = feedbackError ?: feedbackInfo.orEmpty()
        if (feedbackTexto.isNotBlank()) {
            val ehErro = feedbackError != null
            val tinta = if (ehErro) {
                MaterialTheme.colorScheme.error
            } else {
                MaterialTheme.colorScheme.onSurfaceVariant
            }
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        if (ehErro) {
                            MaterialTheme.colorScheme.error.copy(alpha = .12f)
                        } else {
                            MaterialTheme.colorScheme.surfaceVariant
                        },
                        MaterialTheme.shapes.medium,
                    )
                    .padding(horizontal = 14.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(
                    if (ehErro) Icons.Rounded.ErrorOutline else Icons.Rounded.Email,
                    null,
                    tint = tinta,
                    modifier = Modifier.size(18.dp),
                )
                Text(
                    feedbackTexto,
                    color = tinta,
                    fontSize = 13.sp,
                    lineHeight = 18.sp,
                    modifier = Modifier.padding(start = 10.dp),
                )
            }
        }
    }
}

private enum class LoginStage { Choose, Email, Code }

/**
 * Seis caixas desenhadas sobre um campo invisivel. Um OutlinedTextField comum nao mostra quantos
 * digitos faltam, e e o ponto de maior desistencia de qualquer login por codigo.
 */
@Composable
private fun EmailOtpField(value: String, onValueChange: (String) -> Unit, enabled: Boolean) {
    val focusRequester = remember { FocusRequester() }

    LaunchedEffect(Unit) { focusRequester.requestFocus() }

    BasicTextField(
        value = value,
        onValueChange = { onValueChange(it.filter(Char::isDigit).take(6)) },
        enabled = enabled,
        singleLine = true,
        keyboardOptions = KeyboardOptions(
            keyboardType = KeyboardType.NumberPassword,
            imeAction = ImeAction.Done,
        ),
        // O texto real fica invisivel: quem aparece sao as caixas do decorationBox.
        textStyle = TextStyle(color = Color.Transparent),
        cursorBrush = SolidColor(Color.Transparent),
        modifier = Modifier.fillMaxWidth().focusRequester(focusRequester),
        decorationBox = {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                repeat(6) { index ->
                    val filled = index < value.length
                    val isNext = index == value.length
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .height(56.dp)
                            .border(
                                width = if (isNext) 2.dp else 1.dp,
                                color = when {
                                    isNext -> PopBlue
                                    filled -> MaterialTheme.colorScheme.outline
                                    else -> MaterialTheme.colorScheme.outline.copy(alpha = .5f)
                                },
                                shape = RoundedCornerShape(12.dp),
                            ),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            if (filled) value[index].toString() else "",
                            fontSize = 22.sp,
                            lineHeight = 28.sp,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                }
            }
        },
    )
}


private enum class MainTab(val label: String, val icon: ImageVector) {
    Dashboard("Início", Icons.Rounded.Home),
    Tasks("Tarefas", Icons.Rounded.TaskAlt),
    Calendar("Calendário", Icons.Rounded.CalendarMonth),
    More("Mais", Icons.Rounded.MoreHoriz),
}

private enum class MorePage { Menu, Team, Sectors, Groups, Settings }

@Composable
private fun MainScreen(store: PopStore, platform: PopPlatformServices) {
    var tab by remember { mutableStateOf(MainTab.Dashboard) }
    var morePage by remember { mutableStateOf(MorePage.Menu) }
    var showTaskEditor by remember { mutableStateOf(false) }
    val canViewCalendar =
        store.state.workspace != WorkspaceKind.Company || store.permissions.canViewCalendar

    LaunchedEffect(canViewCalendar, tab) {
        if (!canViewCalendar && tab == MainTab.Calendar) tab = MainTab.Dashboard
    }

    // store.message carrega o retorno das acoes de servidor (criar empresa, criar setor,
    // convidar pessoa, sincronizar). Ate agora ela so aparecia dentro de Configuracoes, entao
    // uma falha na tela de Equipe nao dava sinal nenhum ao usuario.
    val snackbarHostState = remember { SnackbarHostState() }
    var lastMessage by remember { mutableStateOf(store.message) }
    LaunchedEffect(store.message) {
        if (store.message != lastMessage) {
            lastMessage = store.message
            snackbarHostState.showSnackbar(store.message)
        }
    }

    // A area segura de BAIXO nao entra aqui de proposito -- quem cuida dela e a barra de abas.
    //
    // Com `safeDrawing` inteiro, o Scaffold empurrava tambem a barra de abas para dentro da area
    // segura: a barra terminava ACIMA do indicador de home, e a faixa que sobrava embaixo mostrava
    // a cor de fundo do Scaffold (`background`) enquanto a barra usa `surface`. Como as duas cores
    // diferem nos dois temas, sobrava uma tira morta visivel -- escura no tema escuro, cinza-azulada
    // no claro. Apontado em aparelho em 27/08.
    //
    // `safeDrawing` inclui o teclado (ime), entao NAO somar `imePadding()` junto: a barra de abas
    // ja sobe sozinha quando o teclado abre, e as duas coisas juntas dobrariam o deslocamento.
    Scaffold(
        modifier = Modifier
            .fillMaxSize()
            .windowInsetsPadding(
                WindowInsets.safeDrawing.only(WindowInsetsSides.Top + WindowInsetsSides.Horizontal),
            ),
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            if (tab == MainTab.More && morePage != MorePage.Menu) {
                PageHeader(
                    title = when (morePage) {
                        MorePage.Team -> "Equipe"
                        MorePage.Sectors -> "Setores"
                        MorePage.Groups -> "Grupos"
                        MorePage.Settings -> "Configurações"
                        MorePage.Menu -> "Mais"
                    },
                    onBack = { morePage = MorePage.Menu },
                )
            } else {
                WorkspaceHeader(store)
            }
        },
        bottomBar = {
            // O "comprimido" que o Material 3 desenha atras do icone selecionado e o sinal mais
            // reconhecivel de app Android que existe -- nenhum app de iPhone marca a aba assim.
            // Trocado por cor: item ativo em azul da marca, inativo apagado. Mesma informacao, sem
            // o sotaque errado.
            // 49dp e a altura da barra de abas do iPhone. O padrao do Material 3 e 80dp, que e
            // medida de Android -- e como a area segura entra POR BAIXO desse valor, a barra
            // passou a ocupar ~114pt e a comecar alto demais na tela. Antes o defeito nao aparecia
            // porque os 34pt de area segura ficavam pintados com a cor de FUNDO: era a faixa morta.
            // Trocar uma coisa pela outra nao bastava; era preciso encolher o conteudo tambem.
            //
            // A area segura e lida e somada explicitamente porque a altura fixa do Modifier vale
            // para a barra INTEIRA: sem somar, o recuo do indicador de home comeria o espaco dos
            // icones em vez de se acrescentar a ele.
            val insetsInferior = WindowInsets.safeDrawing.only(WindowInsetsSides.Bottom)
            val areaSegura = with(LocalDensity.current) { insetsInferior.getBottom(this).toDp() }
            // A barra e montada a mao em vez de usar NavigationBar/NavigationBarItem do Material 3.
            //
            // O motivo: o NavigationBar nasce com 80.dp e o NavigationBarItem faz a propria conta de
            // posicionamento em cima dessa altura. Forcar 49.dp -- que e o padrao do iPhone -- nao
            // reposiciona nada, so espreme: no build 9 o icone ficou colado na borda de cima e o
            // rotulo colado na de baixo, sem respiro nenhum. Visto em aparelho pelo Guilherme e
            // confirmado na previa em 31/08.
            //
            // Uma Row com `Arrangement.Center` no eixo vertical resolve porque a altura passa a ser
            // premissa, e nao restricao brigando com a conta interna do Material.
            Surface(
                color = MaterialTheme.colorScheme.surface,
                tonalElevation = 0.dp,
            ) {
                Row(
                    // O padding da area segura vai AQUI, dentro da Surface: assim a barra pinta a
                    // propria cor ate a borda inferior, cobrindo a faixa atras do indicador de
                    // home, enquanto o conteudo fica nos 49.dp de cima. Como `safeDrawing` inclui o
                    // teclado, e tambem isto que faz a barra subir quando o teclado abre.
                    modifier = Modifier
                        .fillMaxWidth()
                        .windowInsetsPadding(insetsInferior)
                        .height(49.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    MainTab.entries.filter { item ->
                        item != MainTab.Calendar || canViewCalendar
                    }.forEach { item ->
                        val selected = tab == item
                        val cor = if (selected) {
                            PopBlue
                        } else {
                            MaterialTheme.colorScheme.onSurfaceVariant
                        }
                        Column(
                            modifier = Modifier
                                .weight(1f)
                                .fillMaxHeight()
                                // `indication = null` tira a onda do Material. Barra de abas do
                                // iPhone nao tem esse efeito: o item so troca de cor.
                                //
                                // Com a onda ligada, o toque desenhava um retangulo do tamanho da
                                // celula inteira, e era isso que denunciava a barra montada a mao
                                // -- o Guilherme descreveu como "da pra ver que foi feito uma
                                // gambiarra, sao 2 elementos distintos", porque o retangulo revela
                                // que o icone e o rotulo estao dentro de uma area clicavel maior
                                // em vez de formarem uma peca so.
                                .clickable(
                                    interactionSource = remember { MutableInteractionSource() },
                                    indication = null,
                                ) {
                                    tab = item
                                    if (item != MainTab.More) morePage = MorePage.Menu
                                },
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.Center,
                        ) {
                            Icon(item.icon, item.label, tint = cor, modifier = Modifier.size(24.dp))
                            Spacer(Modifier.height(2.dp))
                            Text(
                                item.label,
                                fontSize = 11.sp,
                                color = cor,
                                fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
                            )
                        }
                    }
                }
            }
        },
        floatingActionButton = {
            if (tab == MainTab.Tasks && store.permissions.canCreateTasks) {
                FloatingActionButton(onClick = { showTaskEditor = true }) { Icon(Icons.Rounded.Add, "Nova tarefa") }
            }
        },
    ) { padding ->
        AnimatedContent(targetState = tab to morePage, modifier = Modifier.padding(padding)) { (selected, page) ->
            when (selected) {
                MainTab.Dashboard -> Refreshable(store) {
                    DashboardScreen(store, onSeeAllTasks = { tab = MainTab.Tasks })
                }
                MainTab.Tasks -> Refreshable(store) { TasksScreen(store) }
                MainTab.Calendar -> Refreshable(store) { CalendarScreen(store) }
                MainTab.More -> when (page) {
                    MorePage.Menu -> MoreScreen(
                        store = store,
                        onPage = { morePage = it },
                    )
                    MorePage.Team -> if (store.permissions.canViewEmployees) {
                        TeamScreen(store)
                    } else {
                        MoreScreen(store = store, onPage = { morePage = it })
                    }
                    MorePage.Sectors -> if (store.permissions.canViewDepartments) {
                        SectorsScreen(store)
                    } else {
                        MoreScreen(store = store, onPage = { morePage = it })
                    }
                    MorePage.Groups -> if (store.permissions.canViewGroups) {
                        GroupsScreen(store)
                    } else {
                        MoreScreen(store = store, onPage = { morePage = it })
                    }
                    MorePage.Settings -> SettingsScreen(store, platform)
                }
            }
        }
    }

    if (showTaskEditor) TaskEditorDialog(store = store, onDismiss = { showTaskEditor = false })
}

/**
 * Puxar-para-atualizar. So faz sentido com sessao: no modo convidado nao ha servidor de onde
 * buscar, entao o gesto e desligado em vez de girar sem efeito.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun Refreshable(store: PopStore, content: @Composable () -> Unit) {
    if (store.state.apiToken.isNullOrBlank()) {
        content()
        return
    }
    PullToRefreshBox(
        isRefreshing = store.syncing,
        onRefresh = store::refreshNow,
        modifier = Modifier.fillMaxSize(),
    ) { content() }
}

@Composable
private fun WorkspaceHeader(store: PopStore) {
    var showMenu by remember { mutableStateOf(false) }
    var showCompanyEditor by remember { mutableStateOf(false) }

    val company = store.selectedCompany
    val inCompany = store.state.workspace == WorkspaceKind.Company && company != null
    // createCompany() ignora a chamada sem sessão ou a partir da terceira empresa; não oferecer
    // a opção nesses casos evita um item de menu que não faz nada.
    val canCreateCompany = !store.state.apiToken.isNullOrBlank() && store.state.companies.size < 3
    val canSwitch = store.state.companies.isNotEmpty() || canCreateCompany

    Surface(color = MaterialTheme.colorScheme.background) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(Modifier.weight(1f)) {
                Row(
                    modifier = Modifier.clickable(enabled = canSwitch) { showMenu = true },
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(Modifier.weight(1f, fill = false)) {
                        Text(
                            if (inCompany) company!!.name else "Meu espaço",
                            fontSize = 17.sp,
                            fontWeight = FontWeight.SemiBold,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                        Text(
                            if (inCompany) {
                                company!!.description.ifBlank { "Espaço da empresa" }
                            } else {
                                "Organização pessoal"
                            },
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontSize = 12.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                    if (canSwitch) {
                        Icon(
                            Icons.Rounded.ExpandMore,
                            "Trocar de espaço",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
                DropdownMenu(expanded = showMenu, onDismissRequest = { showMenu = false }) {
                    DropdownMenuItem(
                        text = { Text("Meu espaço") },
                        leadingIcon = { Icon(Icons.Rounded.Person, null) },
                        trailingIcon = {
                            if (!inCompany) Icon(Icons.Rounded.Check, null, tint = PopBlue)
                        },
                        onClick = {
                            showMenu = false
                            store.selectPersonal()
                        },
                    )
                    store.state.companies.forEach { item ->
                        DropdownMenuItem(
                            text = { Text(item.name) },
                            leadingIcon = { Icon(Icons.Rounded.Business, null) },
                            trailingIcon = {
                                if (inCompany && company!!.id == item.id) {
                                    Icon(Icons.Rounded.Check, null, tint = PopBlue)
                                }
                            },
                            onClick = {
                                showMenu = false
                                store.selectCompany(item.id)
                            },
                        )
                    }
                    if (canCreateCompany) {
                        DropdownMenuItem(
                            text = { Text("Criar empresa") },
                            leadingIcon = { Icon(Icons.Rounded.Add, null, tint = PopBlue) },
                            onClick = {
                                showMenu = false
                                showCompanyEditor = true
                            },
                        )
                    }
                }
            }
            // Sem este respiro o nome do espaco encostava no logotipo: com um nome de empresa
            // longo no cabecalho, o chevron de trocar de espaco ficava colado no "P" da marca e os
            // dois liam como um bloco so.
            Spacer(Modifier.width(12.dp))
            // Reduzido de 24sp para 16sp. Em 24 o logotipo era o MAIOR texto do cabecalho -- maior
            // que o nome do espaco, que e a informacao que a pessoa precisa ler ali. Marca nao
            // compete com conteudo; e assinatura, nao manchete. Em telas de login e onboarding ele
            // segue no tamanho cheio, que e onde apresentar o produto e a funcao da tela.
            PopLogo(fontSize = 16.sp)
        }
    }

    if (showCompanyEditor) CompanyEditorDialog(store) { showCompanyEditor = false }
}

@Composable
private fun PageHeader(title: String, onBack: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        IconButton(onClick = onBack) { Icon(Icons.Rounded.ArrowBack, "Voltar") }
        Text(title, fontSize = 20.sp, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun DashboardScreen(store: PopStore, onSeeAllTasks: () -> Unit) {
    val tasks = store.visibleTasks
    // Sem `remember`: com chave nenhuma, este valor viveria enquanto a composicao vivesse, e as
    // linhas de tarefa logo abaixo chamam todayDate() fresco. Com o app aberto atravessando a
    // meia-noite, o cartao de cima ainda contava a tarefa de ontem como "para hoje" enquanto a
    // linha de baixo ja escrevia "Ontem" -- duas afirmacoes contrarias sobre a mesma tarefa, uma
    // acima da outra. Recalcular e barato, e os `remember(tasks, today)` seguintes continuam
    // estaveis porque LocalDate tem igualdade estrutural: so invalidam quando o dia vira mesmo.
    val today = todayDate()
    val userName = store.state.currentUser?.firstName ?: "você"
    val shown = 4

    // "Hoje" e "atrasada" sao contas SEPARADAS, e a separacao custou caro para ser aprendida.
    //
    // Primeiro erro (corrigido em 26/08): o filtro era `offset <= 0`, sem piso, e pegava TODA
    // tarefa de hoje ou de qualquer dia passado, concluida ou nao. `completed` e `total` viravam o
    // acumulado de vida inteira e o anel so subia -- em dois meses ele travaria perto de 97% e
    // deixaria de significar coisa alguma.
    //
    // Segundo erro (este, corrigido em 27/08): o conserto anterior juntou hoje + atrasadas em
    // aberto numa lista so, com o argumento de que "atrasada tambem e para hoje". Defensavel no
    // papel, desmentido pelo primeiro contato com dado real. No iPhone, num espaco real, o cartao
    // anunciou **"349 tarefas para hoje"** com o anel em **0%**: eram 348 atrasadas de uma
    // importacao de planilha e UMA tarefa vencendo no dia. O maior texto da tela virou um numero
    // sem uso, e o anel, um enfeite travado em zero.
    //
    // Agora o titulo e o anel medem o DIA; atrasada tem linha propria e fica fora do denominador.
    // Concluida de hoje continua entrando -- ela e o numerador do anel.
    val todayTasks = remember(tasks, today) {
        tasks.filter { task ->
            parseIsoDate(task.dueDate)?.let { daysBetween(today, it) } == 0L
        }
    }
    val pendingToday = todayTasks.count { !it.completed }
    val doneToday = todayTasks.size - pendingToday
    // Atrasada ja concluida nao conta: e trabalho de outro dia, resolvido.
    val overdue = remember(tasks, today) {
        tasks.count { task ->
            val offset = parseIsoDate(task.dueDate)?.let { daysBetween(today, it) }
            !task.completed && offset != null && offset < 0L
        }
    }
    // A lista saia na ordem de armazenamento: as quatro primeiras eram as quatro primeiras a
    // existir, nao as quatro mais proximas. Uma tarefa atrasada de alta prioridade podia ficar
    // atras de tres de semana que vem, dentro do bloco chamado "Proximas tarefas".
    val upcoming = remember(tasks) { tasks.filterNot { it.completed }.sortedWith(taskListOrder) }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(18.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            TodayHeroCard(
                greeting = greetingForCurrentTime(),
                userName = userName,
                pending = pendingToday,
                completed = doneToday,
                total = todayTasks.size,
                overdue = overdue,
                hasFuture = upcoming.isNotEmpty(),
            )
        }
        item { SectionTitle("Próximas tarefas") }
        if (upcoming.isEmpty()) {
            item { EmptyState("Nenhuma tarefa pendente", "Crie uma atividade para organizar seu dia.") }
        } else {
            items(upcoming.take(shown), key = { it.id }) { task ->
                CompactTaskRow(task)
            }
            // A lista parava em tres e nao havia saida: o resto das tarefas simplesmente nao era
            // alcancavel a partir da home, e o que sobrava da tela era vazio. Agora ela diz quantas
            // ficaram de fora e leva para a aba onde estao.
            if (upcoming.size > shown) {
                item {
                    TextButton(onClick = onSeeAllTasks, modifier = Modifier.fillMaxWidth()) {
                        Text(
                            "Ver as outras ${upcoming.size - shown}",
                            color = PopBlue,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 14.sp,
                        )
                    }
                }
            }
        }
    }
}

/**
 * O unico elemento ousado da tela, e de proposito: tudo em volta fica quieto.
 *
 * Substitui tres cartoes de metrica ("Pendentes 2 / Concluidas 0 / Total 2") mais um cartao de
 * progresso. Aqueles quatro blocos diziam a mesma coisa quatro vezes -- e o terceiro numero era a
 * soma dos outros dois -- gastando metade da tela para nao responder a pergunta que alguem abre o
 * app para responder, que e "o que eu tenho para fazer agora".
 *
 * O gradiente e o --gradient-primary do painel web, e este e o unico lugar do app onde ele aparece:
 * um gradiente que se repete vira papel de parede e para de significar destaque.
 *
 * `total` e `pending` sao da AGENDA DE HOJE (vencidas incluidas), nao do espaco inteiro. O anel
 * mede o progresso do dia; medir o do espaco fazia a fracao andar para tras a cada tarefa futura
 * criada.
 */
@Composable
private fun TodayHeroCard(
    greeting: String,
    userName: String,
    pending: Int,
    completed: Int,
    total: Int,
    overdue: Int,
    hasFuture: Boolean,
) {
    val progress = if (total == 0) 0f else completed.toFloat() / total
    // `total` conta so o que vence hoje. Como atrasada saiu dessa conta, os dois casos de "nao ha
    // nada" precisam olhar tambem para `overdue`: dizer "Nada para hoje" ou "Tudo em dia" com a
    // linha logo abaixo anunciando 348 fora do prazo seria o cartao se contradizendo em duas
    // linhas seguidas -- que e exatamente o defeito que este conserto veio corrigir.
    val headline = when {
        total == 0 && overdue == 0 && !hasFuture -> "Nada na agenda"
        total == 0 && overdue == 0 -> "Nada para hoje"
        total == 0 -> "Nada vence hoje"
        pending == 0 && overdue == 0 -> "Tudo em dia"
        pending == 0 -> "Hoje está em dia"
        pending == 1 -> "1 tarefa para hoje"
        else -> "$pending tarefas para hoje"
    }
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.large,
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().background(PopBrandGradient).padding(20.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f)) {
                Text(
                    // Sem o nome, "Boa tarde, você" tratava a pessoa por um pronome. Cumprimento
                    // seco le melhor do que cumprimento com um substituto no lugar do nome.
                    if (userName.isBlank() || userName == "você") greeting else "$greeting, $userName",
                    color = Color.White.copy(alpha = .82f),
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium,
                )
                Spacer(Modifier.height(4.dp))
                Text(
                    headline,
                    color = Color.White,
                    // 25sp quebrava "2 tarefas para hoje" em duas linhas e empurrava o anel; 21
                    // cabe em uma linha ate em "12 tarefas para hoje", que e o pior caso realista.
                    fontSize = 21.sp,
                    fontWeight = FontWeight.Bold,
                    lineHeight = 26.sp,
                )
                if (overdue > 0) {
                    Spacer(Modifier.height(6.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Rounded.ErrorOutline,
                            null,
                            tint = Color.White,
                            modifier = Modifier.size(14.dp),
                        )
                        Text(
                            if (overdue == 1) "1 já passou do prazo" else "$overdue já passaram do prazo",
                            color = Color.White,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.padding(start = 5.dp),
                        )
                    }
                }
            }
            if (total > 0) {
                Spacer(Modifier.size(16.dp))
                ProgressRing(progress)
            }
        }
    }
}

/**
 * Anel em vez de barra. A barra linear que existia aqui ficava vazia em 0% -- um trilho cinza que
 * ocupava largura inteira para comunicar nada. O anel ocupa um canto, guarda o numero no meio e le
 * como indicador mesmo estando zerado.
 */
@Composable
private fun ProgressRing(progress: Float) {
    Box(contentAlignment = Alignment.Center) {
        Canvas(Modifier.size(58.dp)) {
            val stroke = 6.dp.toPx()
            val inset = stroke / 2f
            val arcSize = Size(size.width - stroke, size.height - stroke)
            drawArc(
                color = Color.White.copy(alpha = .3f),
                startAngle = -90f,
                sweepAngle = 360f,
                useCenter = false,
                topLeft = Offset(inset, inset),
                size = arcSize,
                style = Stroke(width = stroke, cap = StrokeCap.Round),
            )
            if (progress > 0f) {
                drawArc(
                    color = Color.White,
                    startAngle = -90f,
                    sweepAngle = 360f * progress.coerceIn(0f, 1f),
                    useCenter = false,
                    topLeft = Offset(inset, inset),
                    size = arcSize,
                    style = Stroke(width = stroke, cap = StrokeCap.Round),
                )
            }
        }
        Text(
            "${(progress * 100).toInt()}%",
            color = Color.White,
            fontSize = 13.sp,
            fontWeight = FontWeight.Bold,
        )
    }
}

private data class GrupoDeTarefas(
    val titulo: String,
    val tarefas: List<PopTask>,
    val abreFechado: Boolean,
)

/**
 * Agrupa a lista de Tarefas por ONDE a tarefa mora, nao por quem responde.
 *
 * O agrupamento antigo perguntava so `kind == Sector` e jogava TODO o resto num balde chamado
 * "Sem setor". Isso produziu o mesmo defeito duas vezes:
 *
 *  - em 27/08, no Meu espaco, onde nao existe setor: tudo caia no balde unico, que aparecia
 *    fechado e escondia a lista inteira, com "8 pendentes" escrito logo acima;
 *  - em 01/09, numa empresa que tem setores: a tarefa atribuida a uma PESSOA caia no mesmo balde,
 *    que entao virava cabecalho fechado no fim da ordem alfabetica. Nao dava para editar nem
 *    excluir, porque a aba Tarefas e onde essas operacoes acontecem.
 *
 * O conserto de 27/08 (`flatList`) tratou so o caso em que TUDO cai no balde. Este trata a classe:
 * **nao existe mais balde.** Todo alvo vira um grupo com nome verdadeiro, e nenhum nome mente
 * sobre o que ha dentro.
 *
 * A ordem coloca setores e grupos primeiro, e o que e de pessoa por ultimo -- pedido do Guilherme,
 * que preferiu o fim ao topo. O que conserta o defeito nao e a posicao e sim `abreFechado`: os
 * grupos de pessoa e de empresa nascem **abertos**. Setor continua nascendo fechado, que era uma
 * decisao anterior e boa quando ha varios.
 *
 * No Meu espaco nao ha alvo nenhum para agrupar, entao volta uma lista so, sem cabecalho.
 */
private fun agruparTarefas(
    tasks: List<PopTask>,
    espaco: WorkspaceKind,
    meuNome: String,
): List<GrupoDeTarefas> {
    if (espaco == WorkspaceKind.Personal) {
        return listOf(GrupoDeTarefas("", tasks.sortedWith(taskListOrder), abreFechado = false))
    }
    fun souEu(task: PopTask) =
        meuNome.isNotBlank() && task.assignment.label.equals(meuNome, ignoreCase = true)
    fun titulo(task: PopTask) = when (task.assignment.kind) {
        AssignmentKind.Sector, AssignmentKind.Group -> task.assignment.label
        AssignmentKind.None -> "Toda a empresa"
        AssignmentKind.Person -> if (souEu(task)) "Minhas tarefas" else task.assignment.label
    }
    // Setores e grupos (0) antes da empresa (1), das outras pessoas (2) e das minhas (3).
    fun ordem(task: PopTask) = when (task.assignment.kind) {
        AssignmentKind.Sector, AssignmentKind.Group -> 0
        AssignmentKind.None -> 1
        AssignmentKind.Person -> if (souEu(task)) 3 else 2
    }
    // Fechar setor e grupo por padrao foi decidido contra uma empresa de 16 setores e 361 tarefas,
    // onde abrir tudo daria uma rolagem infinita. Numa empresa pequena a mesma regra produz o
    // defeito oposto, e ele foi medido em aparelho: um espaco com 13 tarefas abria a aba Tarefas
    // como SETE cabecalhos fechados e nenhuma tarefa a vista -- um indice, nao uma lista.
    //
    // O que decide nao e quantos cabecalhos ha, e sim se a lista inteira cabe numa olhada. Contar
    // cabecalhos erraria nos dois sentidos: 3 setores com 200 tarefas rolaria sem fim, e 10 setores
    // com uma tarefa cada cabem folgados.
    val listaCurta = tasks.size <= LIMITE_PARA_ABRIR_TUDO
    return tasks.groupBy { ordem(it) to titulo(it) }
        .toList()
        // toSortedMap() vem de java.util e nao existe no commonMain; ordenar a lista de pares
        // pela ordem e depois pelo nome da o mesmo resultado.
        .sortedWith(compareBy({ it.first.first }, { it.first.second }))
        .map { (chave, doGrupo) ->
            GrupoDeTarefas(
                titulo = chave.second,
                tarefas = doGrupo.sortedWith(taskListOrder),
                abreFechado = chave.first == 0 && !listaCurta,
            )
        }
}

/**
 * Ate quantas tarefas a aba Tarefas nasce com tudo aberto.
 *
 * Nao e numero magico: 20 e mais ou menos o que uma empresa pequena tem em aberto num dia, e e o
 * ponto em que a rolagem deixa de ser leitura e vira procura. `alternados` guarda o DESVIO em
 * relacao a este padrao, entao quem fechar um cabecalho continua com ele fechado mesmo que a lista
 * encolha depois.
 */
private const val LIMITE_PARA_ABRIR_TUDO = 20

@Composable
private fun TasksScreen(store: PopStore) {
    val tasks = store.visibleTasks
    var removingId by remember { mutableStateOf<String?>(null) }
    var selectedTask by remember { mutableStateOf<PopTask?>(null) }
    var pendingDeleteTask by remember { mutableStateOf<PopTask?>(null) }
    // Guarda quem o usuario ALTERNOU, nao quem esta aberto.
    //
    // Antes guardava os expandidos, o que so funcionava porque todo grupo nascia fechado. Agora
    // nem todo grupo nasce fechado -- os de pessoa e de empresa nascem abertos --, e um conjunto
    // de "abertos" nao consegue representar "este, que nasce aberto, o usuario fechou".
    // Guardando o desvio em relacao ao padrao, um conjunto so cobre os dois casos, e um grupo
    // criado depois continua entrando com o padrao dele sem precisar ser descoberto.
    var alternados by remember { mutableStateOf(emptySet<String>()) }
    val scope = rememberCoroutineScope()
    // Pessoas entram junto de setores e grupos: AssignmentKind.Person ja existia e ja e convertido
    // nos dois sentidos (toApiTask/toPopTask), mas nunca tinha sido oferecido na interface.
    val moveTargets = rememberMoveTargets(store)
    val meuNome = store.state.currentUser?.name.orEmpty()
    val espaco = store.state.workspace
    val groupedTasks = remember(tasks, espaco, meuNome) { agruparTarefas(tasks, espaco, meuNome) }
    // Grupo unico e sem titulo e o Meu espaco: nao ha alvo nenhum para agrupar, entao a lista sai
    // plana, sem cabecalho.
    val flatList = groupedTasks.size == 1 && groupedTasks[0].titulo.isEmpty()

    fun deleteWithAnimation(task: PopTask, action: () -> Unit) {
        pendingDeleteTask = null
        removingId = task.id
        scope.launch {
            delay(230)
            action()
            removingId = null
        }
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 18.dp, top = 18.dp, end = 18.dp, bottom = 92.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        item {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Bottom) {
                Text(
                    "Tarefas",
                    fontSize = 27.sp,
                    lineHeight = 32.sp,
                    fontWeight = FontWeight.ExtraBold,
                    modifier = Modifier.weight(1f),
                )
                // A contagem sai da linha de baixo e vira companhia do titulo: eram duas linhas
                // para um dado de duas palavras, e a segunda empurrava a lista para baixo sem
                // acrescentar nada.
                Text(
                    plural(tasks.count { !it.completed }, "pendente", "pendentes"),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontSize = 13.sp,
                    modifier = Modifier.padding(bottom = 4.dp),
                )
            }
        }
        if (tasks.isEmpty()) {
            item { EmptyState("Seu espaço está livre", "Toque em + para criar a primeira tarefa.") }
        }
        groupedTasks.forEach { grupo ->
            val sector = grupo.titulo
            val sectorTasks = grupo.tarefas
            // Sem agrupamento real, nao ha cabecalho de grupo.
            if (flatList) {
                items(sectorTasks, key = { it.id }) { task ->
                    AnimatedVisibility(
                        visible = removingId != task.id,
                        enter = fadeIn() + expandVertically(),
                        exit = fadeOut(tween(220)) + shrinkVertically(tween(220)),
                    ) {
                        SwipeableTaskRow(
                            task = task,
                            moveTargets = moveTargets,
                            onOpen = { selectedTask = task },
                            onToggle = { store.toggleTask(task.id) },
                            onMove = { store.moveTask(task.id, it) },
                            onDelete = { pendingDeleteTask = task },
                        )
                    }
                }
                return@forEach
            }
            // Aberto = o padrao do grupo, invertido se o usuario tiver alternado este.
            val expanded = if (grupo.abreFechado) sector in alternados else sector !in alternados
            item(key = "sector-$sector") {
                val pending = sectorTasks.count { !it.completed }
                // Quantas deste grupo sao PARA HOJE.
                //
                // A contagem de pendentes responde "quanto falta neste grupo"; esta responde
                // "quanto falta AGORA", que e a pergunta de quem abre o aplicativo em pe, no
                // corredor. Quando ha alguma para hoje, ela substitui a de pendentes em vez de se
                // somar a ela: as duas juntas ("2 hoje · 5 pendentes") sao a string mais longa que
                // este cabecalho jamais teria, e ele divide a linha com um nome de setor que pode
                // ser comprido. Assim a string fica MENOR que a de hoje, sem risco de quebrar
                // linha, e o total continua a um toque de distancia.
                //
                // ATRASO vem antes de HOJE, e isso foi conserto: a primeira versao contava so
                // `dueDate == hoje` e deixava o ramo de pendentes de fora quando havia alguma de
                // hoje. Um grupo com 1 de hoje e 12 atrasadas anunciava "1 hoje" -- o numero MENOS
                // urgente dos dois -- enquanto o calendario mostrava as 12 em vermelho. Duas telas,
                // dois recados.
                //
                // `todayIso()` icado para fora do `count`: la dentro ele le o relogio e converte
                // fuso uma vez POR TAREFA, a cada recomposicao do cabecalho.
                val hojeIso = todayIso()
                val atrasadas = sectorTasks.count { !it.completed && it.dueDate < hojeIso }
                val hoje = sectorTasks.count { !it.completed && it.dueDate == hojeIso }
                Surface(
                    modifier = Modifier.fillMaxWidth().clickable {
                        alternados = if (sector in alternados) {
                            alternados - sector
                        } else {
                            alternados + sector
                        }
                    },
                    shape = RoundedCornerShape(14.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = .55f),
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(start = 14.dp, top = 11.dp, end = 8.dp, bottom = 11.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(sector, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                        Text(
                            // Com o grupo fechado o que importa e quanto falta, nao o total.
                            when {
                                pending == 0 -> "tudo concluído"
                                atrasadas > 0 -> "$atrasadas em atraso"
                                hoje > 0 -> "$hoje hoje"
                                else -> plural(pending, "pendente", "pendentes")
                            },
                            color = when {
                                pending == 0 -> PopGreen
                                atrasadas > 0 -> PopRed
                                hoje > 0 -> PopBlue
                                else -> MaterialTheme.colorScheme.onSurfaceVariant
                            },
                            fontSize = 12.sp,
                            fontWeight = if (atrasadas > 0 || hoje > 0) FontWeight.Bold else FontWeight.Normal,
                        )
                        Icon(
                            if (expanded) Icons.Rounded.ExpandLess else Icons.Rounded.ExpandMore,
                            if (expanded) "Recolher $sector" else "Expandir $sector",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
            if (expanded) {
                items(sectorTasks, key = { it.id }) { task ->
                    AnimatedVisibility(
                        visible = removingId != task.id,
                        enter = fadeIn() + expandVertically(),
                        exit = fadeOut(tween(220)) + shrinkVertically(tween(220)),
                    ) {
                        SwipeableTaskRow(
                            task = task,
                            moveTargets = moveTargets,
                            onOpen = { selectedTask = task },
                            onToggle = { store.toggleTask(task.id) },
                            onMove = { store.moveTask(task.id, it) },
                            onDelete = { pendingDeleteTask = task },
                        )
                    }
                }
            }
        }
    }

    selectedTask?.let { task ->
        TaskDetailsDialog(
            task = task,
            store = store,
            onTaskChanged = { selectedTask = it },
            onDismiss = { selectedTask = null },
        )
    }

    pendingDeleteTask?.let { task ->
        TaskDeleteDialog(
            task = task,
            onDismiss = { pendingDeleteTask = null },
            onDelete = { deleteWithAnimation(task) { store.deleteTask(task.id) } },
            onDeleteSeries = { deleteWithAnimation(task) { store.deleteTaskSeries(task.id) } },
        )
    }
}

/**
 * Para quem a tarefa pode ser reatribuida.
 *
 * Vive aqui, e nao dentro do TasksScreen, porque o calendario passou a oferecer a mesma acao e
 * duas copias desta lista sairiam de sincronia na primeira vez que a regra mudasse.
 *
 * A lista e passada para cada TaskRow, entao reconstrui-la a cada recomposicao custa caro com
 * equipe e lista grandes. So muda quando a empresa ou a permissao mudam.
 */
@Composable
private fun rememberMoveTargets(store: PopStore): List<AssignmentTarget> {
    // `selectedCompany` significa "a ULTIMA empresa escolhida", nao "estamos numa empresa": ele
    // continua apontando para ela dentro do Meu Espaco. Sem esta guarda, arrastar uma tarefa
    // pessoal oferecia os funcionarios e os setores da empresa, e reatribuir gravava o id de uma
    // pessoa de OUTRO espaco dentro da carga do espaco pessoal. Visto em aparelho em 27/08.
    val company = store.selectedCompany.takeIf { store.state.workspace == WorkspaceKind.Company }
    // Reatribuir exige a permissao tasks.assign, resolvida pelo servidor.
    val canAssign = store.permissions.canAssignTasks
    return remember(company, canAssign) {
        // Sem empresa nao ha para quem reatribuir, e lista com so "Sem responsavel" seria um gesto
        // que nao leva a lugar nenhum. Lista vazia desliga o arraste inteiro (ver `podeReatribuir`).
        if (!canAssign || company == null) {
            emptyList()
        } else {
            buildList {
                // `activeMembers`: oferecer um convite pendente como responsavel mandaria ao
                // servidor um nome que ele nao resolve, e a tarefa voltaria sem responsavel.
                company?.activeMembers.orEmpty().forEach {
                    add(AssignmentTarget(AssignmentKind.Person, it.id, it.name))
                }
                company?.sectors.orEmpty().sortedBy { it.name.lowercase() }.forEach {
                    add(AssignmentTarget(AssignmentKind.Sector, it.id, it.name))
                }
                company?.groups.orEmpty().sortedBy { it.name.lowercase() }.forEach {
                    add(AssignmentTarget(AssignmentKind.Group, it.id, it.name))
                }
                add(AssignmentTarget(AssignmentKind.None, null, "Sem responsável"))
            }
        }
    }
}

/**
 * Detalhes da tarefa. Estava embutido no TasksScreen; virou composable proprio para o calendario
 * poder abrir a mesma tarefa em vez de mostrar uma linha inerte.
 *
 * `onTaskChanged` existe porque marcar um item do checklist grava no store e devolve uma copia
 * nova de PopTask: sem reapontar o dialogo para ela, a marca so apareceria ao fechar e reabrir.
 */
@Composable
private fun TaskDetailsDialog(
    task: PopTask,
    store: PopStore,
    onTaskChanged: (PopTask?) -> Unit,
    onDismiss: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(task.title, fontWeight = FontWeight.ExtraBold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                if (task.description.isNotBlank()) Text(task.description)
                // taskDateLabel, e nao a data crua: este era o unico ponto do app que mostrava
                // "2026-08-24" em vez de "seg, 24 de agosto". Ficava atras do dialogo a mesma
                // tarefa na lista, escrita do jeito certo, uma ao lado da outra.
                //
                // A funcao ja faz o mesmo filter/joinToString que estava aqui e devolve dueDate
                // como veio quando ela e vazia ou nao e ISO, entao nao ha caso perdido na troca.
                Text(
                    taskDateLabel(task.dueDate, task.dueTime, todayDate()),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                // A prioridade era o unico campo de PopTask que este dialogo nao mostrava, embora
                // a lista de onde ele e aberto estampe "Alta" e "Urgente" em cor. Quem abria para
                // ver a tarefa inteira perdia justamente o campo mais visivel da linha.
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        Modifier
                            .size(8.dp)
                            .clip(CircleShape)
                            .background(priorityColor(task.priority)),
                    )
                    Spacer(Modifier.width(8.dp))
                    Text(
                        "Prioridade ${task.priority.label.lowercase()}",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                // Isto dizia "Responsável" e mostrava o ALVO: numa tarefa de setor saia
                // "Responsável: Comercial", que e um setor e nao uma pessoa. Sao dois campos
                // distintos no servidor (`target` e `responsibleIds`), e a partir do build 12 os
                // dois chegam ate aqui.
                if (task.assignment.label != "Sem responsável") {
                    Text(
                        if (task.assignment.kind == AssignmentKind.Person) {
                            "Responsável: ${task.assignment.label}"
                        } else {
                            "Em: ${task.assignment.label}"
                        },
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                if (task.assignment.kind != AssignmentKind.Person) {
                    val daLista = task.assignees.orEmpty().filter { it.isNotBlank() }
                    val responsaveis = if (daLista.isNotEmpty()) {
                        daLista
                    } else if (task.assignee.isNotBlank()) {
                        listOf(task.assignee)
                    } else {
                        emptyList()
                    }
                    if (responsaveis.isNotEmpty()) {
                        Text(
                            "Responsável: ${responsaveis.joinToString(", ")}",
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
                if (task.reminder.isNotBlank() && task.reminder != "Sem lembrete") {
                    Text(
                        "Lembrete: ${task.reminder}",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                if (task.duration.isNotBlank() && task.duration != "Sem duração") {
                    Text(
                        "Duração: ${task.duration}",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                if (task.createdBy.isNotBlank()) {
                    Text(
                        "Criada por: ${task.createdBy}",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                if (task.recurrence != RecurrenceKind.None) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Rounded.Repeat,
                            null,
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(15.dp),
                        )
                        Spacer(Modifier.width(6.dp))
                        Text(
                            task.recurrence.label,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
                if (task.checklist.isNotEmpty()) {
                    Spacer(Modifier.height(4.dp))
                    Text("Checklist", fontWeight = FontWeight.Bold)
                    task.checklist.forEach { item ->
                        Row(
                            modifier = Modifier.fillMaxWidth().clickable(
                                enabled = store.isCurrentUserAdmin,
                            ) {
                                store.toggleChecklistItem(task.id, item.id)
                                onTaskChanged(store.state.tasks.firstOrNull { it.id == task.id })
                            },
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Checkbox(
                                checked = item.done,
                                onCheckedChange = if (store.isCurrentUserAdmin) {
                                    {
                                        store.toggleChecklistItem(task.id, item.id)
                                        onTaskChanged(store.state.tasks.firstOrNull { it.id == task.id })
                                    }
                                } else {
                                    null
                                },
                            )
                            Text(item.title, modifier = Modifier.weight(1f))
                        }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) { Text("Fechar") }
        },
    )
}

/**
 * Confirmacao de exclusao. Numa tarefa comum, confirma e exclui. Numa tarefa RECORRENTE oferece as
 * duas saidas: somente esta data, ou a serie inteira. As duas ficaram desligadas do build 9 ate
 * 04/09 porque o contrato movel nao tinha como sustenta-las; o historico esta no `confirmButton`.
 *
 * Recebe a acao pronta em vez do store porque quem chama e que sabe animar a saida da linha antes
 * de a tarefa sumir de fato.
 */
@Composable
private fun TaskDeleteDialog(
    task: PopTask,
    onDismiss: () -> Unit,
    onDelete: () -> Unit,
    onDeleteSeries: () -> Unit,
) {
    val isRecurring = task.recurrence != RecurrenceKind.None
    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                if (isRecurring) "Atividade recorrente" else "Excluir atividade",
                fontWeight = FontWeight.ExtraBold,
            )
        },
        text = {
            Text(
                if (isRecurring) {
                    "“${task.title}” se repete. Excluir somente esta data mantém as outras; " +
                        "excluir a recorrência apaga a série inteira."
                } else {
                    "Confirma a exclusão de “${task.title}”?"
                },
            )
        },
        // As acoes vao juntas no confirmButton, e o dismissButton fica de fora.
        //
        // O AlertDialog do Material 3 dispoe dismissButton e confirmButton lado a lado, na mesma
        // linha. Com o confirmButton sendo uma Column de dois botoes, a linha alinhava o "Cancelar"
        // pelo centro vertical da coluna -- e ele aterrissava POR CIMA do botao vermelho. Nao era
        // margem apertada: era sobreposicao, com o texto de um lendo em cima do outro. Visto em
        // aparelho em 27/08, no build 7.
        //
        // POR QUE ESTES DOIS BOTOES FICARAM DESLIGADOS DO BUILD 9 ATE 04/09/2026, e o que mudou.
        // Vale ler antes de mexer, porque cada um dos tres motivos abaixo estragava dado de um
        // jeito diferente, e o terceiro estragava para o Android e para o painel tambem.
        //
        // 1. O servidor RECRIAVA a ocorrencia apagada. `materializeRecurringTasks`
        //    (src/lib/recurrence.server.ts) caminha da data do modelo ate hoje e cria toda data que
        //    nao esteja entre as existentes nem em `recurrenceExcludedDates`, e nao havia como
        //    dizer "pule esta data". RESOLVIDO no servidor, e nao aqui: ao apagar uma ocorrencia
        //    pelo endpoint movel ele registra a data nas linhas que sobram da serie, que e o mesmo
        //    que o painel ja fazia. O app so precisa apagar; nao monta nem devolve exclusao.
        // 2. Nao havia id de serie deste lado -- `recurrenceSeriesId` era null em toda tarefa
        //    vinda do servidor, e "toda a recorrencia" casava exatamente UMA linha. RESOLVIDO: o
        //    servidor manda `recurrenceParentId ?: id` e o `toPopTask` o carrega.
        // 3. "Somente esta data" avancava a `dueDate` localmente, e como todo `update` reenvia a
        //    lista visivel inteira, o servidor gravava essa data -- o PUT faz
        //    `existing.dueDate = item.dueDate`, ADOTA o que o aparelho manda. A serie saia de fase
        //    de forma PERMANENTE. NAO VOLTOU, e nao pode voltar: hoje "somente esta data" e uma
        //    exclusao comum, e nenhum caminho daqui mexe em `dueDate`.
        confirmButton = {
            Column(
                horizontalAlignment = Alignment.End,
                verticalArrangement = Arrangement.spacedBy(2.dp),
            ) {
                Button(
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                    onClick = if (isRecurring) onDeleteSeries else onDelete,
                ) {
                    Text(if (isRecurring) "Toda a recorrência" else "Excluir")
                }
                if (isRecurring) {
                    TextButton(onClick = onDelete) { Text("Somente esta data") }
                }
                TextButton(onClick = onDismiss) { Text("Cancelar") }
            }
        },
    )
}

@Composable
private fun TaskRow(
    task: PopTask,
    /**
     * A hora desta linha na agenda do calendario, ou `null` fora dela.
     *
     * Nao e `task.dueTime`: uma serie que repete varias vezes ao dia rende varias linhas da mesma
     * tarefa, cada uma com o seu horario. String vazia significa "nesta agenda, sem hora marcada".
     *
     * `null` desliga a calha E devolve o rotulo de data, porque fora de um cabecalho de dia a data
     * e a unica pista de prazo que a linha tem.
     */
    horario: String? = null,
    /**
     * Falso nas linhas repetidas da mesma tarefa dentro de um dia. Ver `CalendarRow.Entry.comAcoes`.
     *
     * O menu `⋮` CONTINUA em todas: reatribuir e excluir valem para a tarefa inteira, e fazer isso
     * a partir de qualquer uma das linhas dela nao surpreende ninguem. O circulo e outra coisa --
     * ele diz um ESTADO, e o estado e um so.
     */
    mostrarAcoes: Boolean = true,
    moveTargets: List<AssignmentTarget>,
    onOpen: () -> Unit,
    onToggle: () -> Unit,
    onMove: (AssignmentTarget) -> Unit,
    onDelete: () -> Unit,
) {
    var showMenu by remember { mutableStateOf(false) }
    val isUrgent = task.priority == Priority.Urgent && !task.completed
    val isOverdue = !task.completed && task.dueDate < todayIso()
    // Mesma correcao aplicada ao CompactTaskRow da tela inicial: urgencia marcada por contorno, e
    // nao pintando o cartao inteiro de vermelho. Numa lista com varias tarefas o efeito era pior
    // que na home -- um bloco vermelho solido no meio da rolagem apaga tudo em volta.
    Card(
        modifier = Modifier.fillMaxWidth().animateContentSize().clickable(onClick = onOpen),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface,
            contentColor = MaterialTheme.colorScheme.onSurface,
        ),
        border = BorderStroke(
            1.dp,
            if (isUrgent) PopRed.copy(alpha = .55f) else MaterialTheme.colorScheme.outline,
        ),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            // Largura de um IconButton, para a calha e os titulos seguirem alinhados na coluna
            // mesmo nas linhas que nao mostram o circulo.
            if (!mostrarAcoes) Spacer(Modifier.width(48.dp))
            // Tarefa que EXIGE revisao e ja foi enviada para ela nao aceita toque de quem nao e o
            // revisor, e o motivo esta no servidor: o `replaceMobileTasks` so mexe no status
            // quando o `completed` que chega difere do que ele tem, e para ele "waiting_review"
            // ja nao e concluida. O toque nao fazia nada, sem aviso nenhum.
            //
            // Antes de o servidor mandar estes campos era pior: a tarefa em revisao chegava como
            // um circulo vazio comum, a pessoa marcava, o servidor a devolvia para revisao e a
            // leitura seguinte trazia `completed = false` -- do lado de quem usa, o aplicativo
            // "desmarcou sozinho". Era o mesmo sintoma que ja custou uma investigacao inteira.
            //
            // Para o REVISOR nada muda: ele cai no outro ramo do servidor e conclui normalmente.
            val aguardaRevisao = task.awaitingReview && !task.isReviewer
            // `canComplete` vem do servidor e cobre os dois sentidos (la ele e
            // `permissions.canComplete || permissions.canReopen`). Sem isto o circulo era clicavel
            // para quem o servidor ia recusar, e a tarefa marcava e desmarcava sozinha na
            // sincronizacao seguinte -- o mesmo sintoma da tarefa em revisao, por outra causa.
            if (mostrarAcoes) IconButton(
                onClick = onToggle,
                enabled = task.canComplete && !aguardaRevisao,
            ) {
                Icon(
                    when {
                        aguardaRevisao -> Icons.Rounded.HourglassEmpty
                        task.completed -> Icons.Rounded.CheckCircle
                        else -> Icons.Rounded.RadioButtonUnchecked
                    },
                    when {
                        aguardaRevisao -> "Aguarda revisão"
                        task.completed -> "Reabrir"
                        else -> "Concluir"
                    },
                    // Era um "check" colorido pela prioridade em toda tarefa PENDENTE, o que lia
                    // como se ja estivesse concluida -- e a cor da prioridade ja aparece no rotulo
                    // ao lado, entao o icone repetia a informacao e mentia sobre o estado. Circulo
                    // vazio para pendente, circulo marcado para concluida: o icone passa a dizer o
                    // estado, e a cor passa a dizer a acao.
                    tint = when {
                        aguardaRevisao -> PopOrange
                        task.completed -> PopGreen
                        else -> MaterialTheme.colorScheme.onSurfaceVariant
                    },
                )
            }
            // A calha. Largura FIXA de proposito: e o que faz os horarios se alinharem coluna
            // abaixo, e alinhados eles podem ser lidos de relance como um dia. Deixando a largura
            // ao texto, "9:00" e "14:30" sairiam desencontrados e a coluna deixaria de ser regua.
            if (horario != null) {
                // A calha guarda a hora E o selo de recorrencia, um sob o outro.
                //
                // O selo ficava numa linha propria abaixo do titulo, e na agenda aquela linha nao
                // tinha mais nada: o rotulo de data e omitido porque o cabecalho do dia e a calha
                // ja dizem quando e. Medido na previa, a 393dp: o cartao tinha ~101dp de altura e
                // ~25dp iam para uma linha que mostrava um glifo de 9dp. A calha, ao lado, tinha
                // folga vertical sobrando.
                //
                // **Por que nao foi por largura.** A tentativa obvia era caber o titulo em uma
                // linha so. Medido: "Assar a fornada da manhã" pede ~206dp e ha 174dp. Recuperar
                // 32dp exigiria encolher os dois alvos de toque abaixo dos 44dp que a Apple pede
                // E o corpo do texto. Altura sai de graca; largura sairia caro.
                Column(
                    modifier = Modifier.width(40.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text(
                        // Sem hora marcada mostra um travessao, nao vazio: o vazio leria como falha
                        // de desenho, o travessao diz que a tarefa e do dia mas nao tem hora.
                        horario.ifBlank { "—" },
                        color = if (task.completed) {
                            MaterialTheme.colorScheme.onSurfaceVariant
                        } else {
                            MaterialTheme.colorScheme.onSurface
                        },
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        // Sem isto, escala de fonte grande (Dynamic Type) quebraria "14:30" em duas
                        // linhas dentro dos 40dp, esticando o cartao e destruindo justamente o
                        // alinhamento de coluna que a calha existe para criar. A previa nao pega
                        // isso: no desktop a escala e sempre 1.0.
                        maxLines = 1,
                        softWrap = false,
                    )
                    if (task.recurrence != RecurrenceKind.None) {
                        Spacer(Modifier.height(2.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Rounded.Repeat,
                                task.recurrence.label,
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(11.dp),
                            )
                            // Qual ocorrencia da serie. Ver a nota longa no rodape sobre por que
                            // este numero existe: sem ele duas linhas com o MESMO titulo leem como
                            // tarefa duplicada.
                            if (task.recurrenceOccurrence > 1) {
                                Spacer(Modifier.width(2.dp))
                                Text(
                                    "${task.recurrenceOccurrence}ª",
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    maxLines = 1,
                                    softWrap = false,
                                )
                            }
                        }
                    }
                }
            }
            Column(Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        task.title,
                        fontWeight = FontWeight.SemiBold,
                        color = if (task.completed) {
                            MaterialTheme.colorScheme.onSurfaceVariant
                        } else {
                            MaterialTheme.colorScheme.onSurface
                        },
                        modifier = Modifier.weight(1f),
                    )
                    // Na agenda o rotulo escrito sai, e a borda vermelha do cartao fica sozinha
                    // dizendo a urgencia.
                    //
                    // Nao e economia gratuita: medido na previa, a calha mais o circulo mais o
                    // `⋮` mais este rotulo deixavam o titulo com largura para TRES linhas --
                    // "Retorno da / Mel — pós- / cirúrgico". A calha existe para tornar o dia
                    // legivel de relance, e nao para picar o titulo. Fora da agenda nada muda:
                    // lá não há calha e o rotulo continua.
                    if (isUrgent && horario == null) {
                        Spacer(Modifier.width(8.dp))
                        Text("Urgente", color = PopRed, fontSize = 10.sp, fontWeight = FontWeight.SemiBold)
                    }
                }
                if (task.description.isNotBlank()) {
                    Text(
                        task.description,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 12.sp,
                        maxLines = 2,
                    )
                }
                // O rodape so existe FORA da agenda.
                //
                // Na agenda o cabecalho do dia ja diz a data, a calha diz a hora, e o selo de
                // recorrencia subiu para a calha -- entao nao sobrava nada para mostrar aqui. A
                // Row continuava sendo criada mesmo assim, e uma linha vazia mais o espacador
                // custavam ~25dp dos ~101dp do cartao. Com ela fora, cabe um cartao a mais na
                // mesma dobra.
                if (horario == null) {
                    Spacer(Modifier.height(5.dp))
                    val dateTint =
                        if (isOverdue) PopRed else MaterialTheme.colorScheme.onSurfaceVariant
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            // Era a data ISO crua: "2026-08-20 • 09:00". Ninguem le assim.
                            taskDateLabel(task.dueDate, task.dueTime, todayDate()),
                            color = dateTint,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                        )
                    // Antes so os detalhes contavam que a tarefa se repete, e era preciso abrir
                    // uma por uma para descobrir.
                    if (task.recurrence != RecurrenceKind.None) {
                        Spacer(Modifier.width(6.dp))
                        Icon(
                            Icons.Rounded.Repeat,
                            task.recurrence.label,
                            tint = dateTint,
                            modifier = Modifier.size(13.dp),
                        )
                        // Qual ocorrencia da serie -- e o que faz duas linhas com o MESMO titulo
                        // pararem de parecer tarefa duplicada.
                        //
                        // No servidor cada ocorrencia e uma linha propria (cloneOccurrence, ligadas
                        // por recurrenceParentId), e o materializeRecurringTasks cria as que
                        // faltam caminhando ate hoje -- em toda leitura E em toda escrita. Entao a
                        // ocorrencia nova aparece de repente, colada a uma acao sem relacao
                        // nenhuma, e a lista mostrava dois cartoes iguais distinguidos so por
                        // "Ontem"/"Hoje" em corpo 11. Foi lido como "a tarefa que eu concluí
                        // voltou", em 01/09.
                        //
                        // O numero ja vinha no cofre da recorrencia desde o build 8; so nunca
                        // tinha sido mostrado.
                        if (task.recurrenceOccurrence > 1) {
                            Spacer(Modifier.width(3.dp))
                            Text(
                                "${task.recurrenceOccurrence}ª",
                                color = dateTint,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold,
                            )
                        }
                    }
                    }
                }
            }
            Box {
                IconButton(onClick = { showMenu = true }) {
                    Icon(
                        Icons.Rounded.MoreVert,
                        "Mais opções",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                DropdownMenu(expanded = showMenu, onDismissRequest = { showMenu = false }) {
                    if (moveTargets.isNotEmpty()) {
                        Text(
                            "Responsável",
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                        )
                    }
                    moveTargets.forEach { target ->
                        val current = target.kind == task.assignment.kind && target.id == task.assignment.id
                        DropdownMenuItem(
                            // Rotulo e icone saem dos mesmos helpers que o dialogo do gesto usa.
                            // Eram dois `when` escritos a mao aqui; com o gesto seriam quatro, e
                            // ai bastava alguem acrescentar um tipo de responsavel para os dois
                            // caminhos passarem a discordar em silencio.
                            text = { Text(assignmentLabel(target)) },
                            leadingIcon = { Icon(assignmentIcon(target.kind), null) },
                            trailingIcon = {
                                if (current) Icon(Icons.Rounded.Check, null, tint = PopBlue)
                            },
                            onClick = {
                                if (!current) onMove(target)
                                showMenu = false
                            },
                        )
                    }
                    // Sem `canDelete` o menu oferecia excluir a quem o servidor ia recusar com
                    // 403: a linha sumia da tela, a sincronizacao falhava, e ela voltava. Melhor
                    // nao oferecer do que desfazer na cara de quem clicou.
                    if (task.canDelete) {
                        DropdownMenuItem(
                            text = {
                                Text("Excluir atividade", color = MaterialTheme.colorScheme.error)
                            },
                            leadingIcon = {
                                Icon(
                                    Icons.Rounded.DeleteOutline,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.error,
                                )
                            },
                            onClick = {
                                showMenu = false
                                onDelete()
                            },
                        )
                    }
                }
            }
        }
    }
}

/**
 * Gestao rapida por gesto na lista de tarefas.
 *
 * Arrastar para a ESQUERDA pede exclusao; para a DIREITA, troca o responsavel. A escolha do lado
 * segue a convencao do iOS, onde o gesto destrutivo vem da direita para a esquerda -- e Mail,
 * Lembretes e Mensagens ensinam isso ao usuario antes de ele abrir este app.
 *
 * Nenhuma das duas acoes e nova: `onDelete` ja abre o dialogo de confirmacao que existia, e
 * `onMove` ja e o mesmo caminho do menu de tres pontos. O gesto so encurta o percurso, e por isso
 * nao ha regra de negocio nova aqui para dar errado.
 *
 * `confirmValueChange` devolve **false** de proposito nos dois lados. Devolver true faria o cartao
 * sair da tela: certo para um "arraste para arquivar", errado aqui, porque excluir ainda precisa de
 * confirmacao e trocar responsavel nao remove nada da lista. Com false, o cartao volta ao lugar e
 * quem decide o que acontece com ele e o dialogo.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SwipeableTaskRow(
    task: PopTask,
    moveTargets: List<AssignmentTarget>,
    onOpen: () -> Unit,
    onToggle: () -> Unit,
    onMove: (AssignmentTarget) -> Unit,
    onDelete: () -> Unit,
) {
    var showAssign by remember { mutableStateOf(false) }
    // Sem a permissao tasks.assign o servidor recusa a troca, e rememberMoveTargets devolve lista
    // vazia. Nesse caso o gesto para a direita fica desligado, em vez de abrir um dialogo sem
    // nenhuma opcao dentro.
    val podeReatribuir = moveTargets.isNotEmpty()

    val estado = rememberSwipeToDismissBoxState(
        confirmValueChange = { valor ->
            when (valor) {
                SwipeToDismissBoxValue.EndToStart -> onDelete()
                SwipeToDismissBoxValue.StartToEnd -> if (podeReatribuir) showAssign = true
                SwipeToDismissBoxValue.Settled -> Unit
            }
            false
        },
    )

    SwipeToDismissBox(
        state = estado,
        enableDismissFromStartToEnd = podeReatribuir,
        enableDismissFromEndToStart = true,
        backgroundContent = { TaskSwipeBackground(estado.dismissDirection) },
    ) {
        TaskRow(
            task = task,
            moveTargets = moveTargets,
            onOpen = onOpen,
            onToggle = onToggle,
            onMove = onMove,
            onDelete = onDelete,
        )
    }

    if (showAssign) {
        TaskAssignDialog(
            task = task,
            targets = moveTargets,
            onPick = onMove,
            onDismiss = { showAssign = false },
        )
    }
}

/** O que aparece atras do cartao enquanto ele desliza: cor, icone e a palavra do que vai acontecer. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TaskSwipeBackground(direcao: SwipeToDismissBoxValue) {
    if (direcao == SwipeToDismissBoxValue.Settled) return
    val excluir = direcao == SwipeToDismissBoxValue.EndToStart
    Box(
        Modifier
            .fillMaxSize()
            .clip(MaterialTheme.shapes.medium)
            .background(if (excluir) MaterialTheme.colorScheme.error else PopBlue)
            .padding(horizontal = 22.dp),
        // O rotulo nasce do lado de onde o dedo veio, e nao no centro: assim ele aparece ja no
        // primeiro centimetro do gesto, antes de o cartao ter saido do lugar.
        contentAlignment = if (excluir) Alignment.CenterEnd else Alignment.CenterStart,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(
                if (excluir) Icons.Rounded.DeleteOutline else Icons.Rounded.Person,
                null,
                tint = Color.White,
                modifier = Modifier.size(20.dp),
            )
            Text(
                if (excluir) "Excluir" else "Responsável",
                color = Color.White,
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(start = 8.dp),
            )
        }
    }
}

/** Lista de responsaveis possiveis, aberta pelo gesto. Mesma fonte de dados do menu de tres pontos. */
@Composable
private fun TaskAssignDialog(
    task: PopTask,
    targets: List<AssignmentTarget>,
    onPick: (AssignmentTarget) -> Unit,
    onDismiss: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Responsável") },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState())) {
                targets.forEach { target ->
                    val atual = target.kind == task.assignment.kind && target.id == task.assignment.id
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(MaterialTheme.shapes.small)
                            .clickable {
                                if (!atual) onPick(target)
                                onDismiss()
                            }
                            .padding(horizontal = 10.dp, vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(
                            assignmentIcon(target.kind),
                            null,
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(20.dp),
                        )
                        Text(
                            assignmentLabel(target),
                            modifier = Modifier.padding(start = 12.dp).weight(1f),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                        if (atual) Icon(Icons.Rounded.Check, null, tint = PopBlue)
                    }
                }
            }
        },
        confirmButton = { TextButton(onClick = onDismiss) { Text("Fechar") } },
    )
}

/**
 * "1 pendentes" aparecia no cabecalho de todo setor com uma tarefa so, e o mesmo defeito estava em
 * "1 atrasadas" e "1 concluídas" no cartao de conta. Concordancia errada num numero pequeno nao
 * quebra nada, mas e o tipo de coisa que quem usa nota antes de notar qualquer acerto.
 */
private fun plural(quantidade: Int, singular: String, plural: String): String =
    "$quantidade ${if (quantidade == 1) singular else plural}"

/** Rotulo e icone de um destino de atribuicao, para o menu e para o dialogo dizerem a mesma coisa. */
private fun assignmentLabel(target: AssignmentTarget): String = when (target.kind) {
    AssignmentKind.Person -> target.label
    AssignmentKind.Group -> "Grupo: ${target.label}"
    AssignmentKind.Sector -> "Setor: ${target.label}"
    AssignmentKind.None -> target.label
}

private fun assignmentIcon(kind: AssignmentKind): ImageVector = when (kind) {
    AssignmentKind.Person -> Icons.Rounded.Person
    AssignmentKind.Group -> Icons.Rounded.Groups
    AssignmentKind.Sector -> Icons.Rounded.Apartment
    AssignmentKind.None -> Icons.Rounded.MoreHoriz
}

@Composable
private fun CompactTaskRow(task: PopTask) {
    val isUrgent = task.priority == Priority.Urgent && !task.completed
    val isOverdue = !task.completed && task.dueDate < todayIso()
    val accent = priorityColor(task.priority)

    // A tarefa urgente pintava o cartao INTEIRO de vermelho solido. Com o cartao azul do topo na
    // mesma tela, viravam dois blocos saturados disputando o olho -- e urgencia que aparece como
    // parede de cor deixa de ser aviso e vira ruido. Aqui o vermelho fica numa faixa lateral e no
    // rotulo: continua sendo a primeira coisa que se ve numa lista, sem gritar por cima do resto.
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface,
            contentColor = MaterialTheme.colorScheme.onSurface,
        ),
        border = BorderStroke(1.dp, if (isUrgent) PopRed.copy(alpha = .55f) else MaterialTheme.colorScheme.outline),
    ) {
        // Uma faixa vertical vermelha na borda esquerda foi tentada aqui e removida: o raio de
        // canto do cartao a recorta e sobra um risco no meio da lateral. O contorno vermelho ja
        // marca o cartao inteiro, entao a faixa era acessorio sem funcao.
        Row(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(Modifier.size(9.dp).background(accent, CircleShape))
            Spacer(Modifier.size(11.dp))
            Column(Modifier.weight(1f)) {
                Text(task.title, fontWeight = FontWeight.SemiBold)
                Text(
                    taskDateLabel(task.dueDate, task.dueTime, todayDate()),
                    color = if (isOverdue) PopRed else MaterialTheme.colorScheme.onSurfaceVariant,
                    fontSize = 11.sp,
                )
            }
            Spacer(Modifier.size(10.dp))
            Text(
                task.priority.label,
                color = accent,
                fontSize = 10.sp,
                fontWeight = FontWeight.SemiBold,
            )
        }
    }
}

/**
 * Linha da agenda. Modelar as linhas como dados, em vez de despejar item/items soltos dentro da
 * LazyColumn, e o que torna possivel saber em que indice cada dia caiu -- sem isso o toque num dia
 * da grade nao teria como rolar a lista ate ele.
 */
private sealed interface CalendarRow {
    /** Tudo que e anterior a hoje, recolhido numa secao so. */
    data class PastHeader(val overdueCount: Int, val total: Int) : CalendarRow
    data class DayHeader(val date: LocalDate) : CalendarRow
    data class Section(val date: LocalDate, val label: String) : CalendarRow

    /**
     * Uma tarefa posicionada na agenda. O `horario` NAO e um campo da tarefa: e a posicao dela
     * dentro do dia, produzida por `expandirDia`. Uma serie que repete tres vezes ao dia gera
     * TRES Entry da mesma tarefa, com horarios diferentes -- e por isso que o horario entra na
     * chave da LazyColumn.
     *
     * `null` significa "fora de uma agenda de dia": e o caso das linhas de "Atrasadas", que nao
     * tem cabecalho de dia acima e por isso precisam mostrar a data.
     */
    data class Entry(
        val task: PopTask,
        val horario: String? = null,
        /**
         * Falso nas linhas REPETIDAS da mesma tarefa no mesmo dia.
         *
         * Uma serie de tres horarios rende tres linhas, mas o servidor guarda UMA linha por DATA --
         * nao existe conclusao por horario no contrato. Com o circulo em todas, concluir a das 8h
         * marcaria as tres, inclusive a das 20h que ninguem fez. Melhor nao oferecer a acao do que
         * oferece-la mentindo.
         */
        val comAcoes: Boolean = true,
    ) : CalendarRow

    /** A regua do "agora", so no dia de hoje e so entre tarefas com horario. */
    data class Now(val hora: String) : CalendarRow
}

private fun calendarRowKey(row: CalendarRow): String = when (row) {
    is CalendarRow.PastHeader -> "antes-de-hoje"
    is CalendarRow.DayHeader -> "dia-${row.date}"
    // A data entra na chave porque "Agenda do dia" se repete a cada dia, e chave repetida derruba
    // a LazyColumn em tempo de execucao, nao de compilacao.
    is CalendarRow.Section -> "secao-${row.date}-${row.label}"
    // O horario entra na chave porque a MESMA tarefa aparece mais de uma vez no mesmo dia quando
    // a serie repete varias vezes ao dia -- e chave repetida derruba a LazyColumn em tempo de
    // execucao, nao de compilacao.
    is CalendarRow.Entry -> "tarefa-${row.task.id}-${row.horario ?: "sem-hora"}"
    is CalendarRow.Now -> "agora"
}

/**
 * Ordem da lista de tarefas dentro de um setor: pendentes antes de concluidas, depois o prazo mais
 * proximo, e a prioridade desempata. A tela nao ordenava nada -- as tarefas sairam na ordem em que
 * chegaram, com urgente e concluida embaralhadas -- enquanto o Android ja poe pendente antes de
 * concluida e ordena por data.
 *
 * O `ifBlank` nao e detalhe: dueDate e String, e a string vazia ordena ANTES de "2026-...", entao
 * sem ele a tarefa sem data pularia para o topo em vez de ir para o fim.
 */
private val taskListOrder = compareBy<PopTask>(
    { it.completed },
    { it.dueDate.ifBlank { "9999-12-31" } },
    { -it.priority.ordinal },
)

/**
 * O codigo de dia da semana que atravessa o fio. Identico nos dois lados, conferido literalmente:
 * `dayTokens` em `mobile-api.server.ts` na escrita e o `dayMap` na leitura, e o mesmo mapa no app
 * Android. 1 = segunda ... 7 = domingo, que e o que `isoDayNumber` devolve.
 *
 * A semantica do `recurrenceDetail` MUDA conforme a regra, e trocar as duas inverte o resultado:
 * em "Diária" ele lista os dias a PULAR, em "Semanal" os dias a INCLUIR, e em "Mensal" e o dia do
 * mes escrito como numero.
 */
private val codigoDoDia = mapOf(
    "S" to 1, "T" to 2, "Q" to 3, "Q2" to 4, "S2" to 5, "Sá" to 6, "D" to 7,
)

/**
 * A proxima data de uma serie, a partir de uma data qualquer dela.
 *
 * Portado do app Android (`advanceRecurrenceDate`), que e codigo ja provado em producao, com uma
 * traducao obrigatoria: la e `java.time` (`plusDays`, `plusMonths`, `withDayOfMonth`,
 * `lengthOfMonth`), que nao existe no commonMain. Aqui tudo sai de `DatePeriod`, do construtor de
 * `LocalDate` e dos ajudantes do `PopDates.kt` -- as mesmas APIs que ja compilaram verdes, pela
 * regra de nao apostar em binding de Kotlin/Native sem gastar um build inteiro para descobrir.
 *
 * Devolve nulo para regra que nao se sabe avancar, inclusive "Personalizada": o dominio nao a
 * representa, e chutar uma data seria pior que nao desenhar ponto nenhum.
 */
private fun advanceRecurrenceDate(task: PopTask, from: LocalDate): LocalDate? {
    val intervalo = task.recurrenceInterval.coerceAtLeast(1)
    val dias = task.recurrenceDetail.split(",").mapNotNull { codigoDoDia[it.trim()] }
    return when (task.recurrenceRule) {
        "Diária" -> {
            val excluidos = dias.toSet()
            var proxima = from.plus(DatePeriod(days = intervalo))
            // Teto de 7: se a pessoa excluir os sete dias da semana, sem ele o laco nao termina.
            var tentativas = 0
            while (isoDayNumber(proxima) in excluidos && tentativas < 7) {
                proxima = proxima.plus(DatePeriod(days = 1))
                tentativas += 1
            }
            if (isoDayNumber(proxima) in excluidos) null else proxima
        }
        "Semanal" -> {
            val escolhidos = dias.sorted().ifEmpty { listOf(isoDayNumber(from)) }
            val diaAtual = isoDayNumber(from)
            val inicioDaSemana = from.plus(DatePeriod(days = -(diaAtual - 1)))
            val aindaNestaSemana = escolhidos.firstOrNull { it > diaAtual }
            if (aindaNestaSemana != null) {
                inicioDaSemana.plus(DatePeriod(days = aindaNestaSemana - 1))
            } else {
                inicioDaSemana
                    .plus(DatePeriod(days = 7 * intervalo))
                    .plus(DatePeriod(days = escolhidos.first() - 1))
            }
        }
        "Mensal" -> {
            val alvo = from.plus(DatePeriod(months = intervalo))
            // Dia 31 em fevereiro nao existe. O `plus` ja acomoda o mes, e o `coerceIn` acomoda o
            // dia pedido: uma serie do dia 31 cai no dia 28 ou 29 e volta ao 31 no mes seguinte.
            val ultimoDia = daysInMonth(alvo.year, alvo.monthNumber)
            val dia = task.recurrenceDetail.trim().toIntOrNull()?.coerceIn(1, ultimoDia)
                ?: from.dayOfMonth.coerceAtMost(ultimoDia)
            LocalDate(alvo.year, alvo.monthNumber, dia)
        }
        "Anual" -> from.plus(DatePeriod(years = intervalo))
        else -> null
    }
}

/** Prefixo do id de uma ocorrencia que so existe na tela. Ver `projetarOcorrencias`. */
private const val PREFIXO_PROJECAO = "proj:"

/** Teto de voltas por serie, para que dado estranho nao trave a interface. */
private const val LIMITE_DE_PROJECAO = 400

internal fun ehProjecao(task: PopTask): Boolean = task.id.startsWith(PREFIXO_PROJECAO)

/**
 * As ocorrencias futuras de cada serie, ate `ate`, que o servidor ainda nao materializou.
 *
 * **Por que isto existe.** O servidor cria a linha de uma ocorrencia recorrente dia a dia, quando
 * chega a data. Ate aqui o calendario so desenhava o que ja era registro, entao um mes inteiro de
 * tarefa diaria aparecia com um punhado de pontos: o dia de hoje aceso e os proximos vazios. Quem
 * tem tarefa todo dia via um calendario que dizia que nao tinha nada para fazer.
 *
 * **Por que a projecao entra ANTES do agrupamento por data, e nao so na grade.** A grade e a agenda
 * leem a mesma fonte de proposito -- ha um comentario na tela dizendo isso. Projetar so na grade
 * acenderia um ponto que o toque nao cumpre, que e exatamente o defeito que aquela decisao evita.
 *
 * **O que NAO se projeta:**
 * - data que a pessoa apagou (`recurrenceExcludedDates`), senao a tela ressuscitaria justamente o
 *   que ela mandou sumir;
 * - data que ja existe como registro, para a ocorrencia real nao aparecer em dobro;
 * - alem do fim da serie, nos dois modos que o contrato tem ("Após" N vezes e "Em uma data");
 * - **nada ANTES de `de`**, que a tela passa como hoje. O passado e o que o servidor registrou, e
 *   so ele sabe o que de fato aconteceu. Projetar para tras inventaria tarefas atrasadas que
 *   ninguem pode concluir, porque nao existe linha do outro lado para marcar -- engordaria o
 *   contador de "Atrasadas" com fantasmas.
 *
 * A copia sai com `serverId` nulo, sem checklist marcada e com `completed = false`: ela nao e uma
 * linha do servidor, e mostrar o progresso da ocorrencia de hoje numa data futura seria mentira.
 */
private fun projetarOcorrencias(
    tasks: List<PopTask>,
    de: LocalDate,
    ate: LocalDate,
): List<PopTask> {
    // A chave da serie. `recurrenceSeriesId` e o caminho certo -- e o `recurrenceParentId ?: id` do
    // servidor --, mas ele pode vir nulo contra servidor anterior ao build 14.
    //
    // **Cair para o `id` da tarefa seria pior que nao projetar.** Duas ocorrencias reais da mesma
    // serie viram DUAS series, cada uma com seu proprio conjunto de "datas que ja existem": a
    // projecao da primeira nao enxerga a data real da segunda e desenha uma ocorrencia fantasma
    // por cima de uma tarefa que existe de verdade. O usuario ve a mesma tarefa duas vezes no
    // mesmo dia -- exatamente o sintoma "a tarefa que eu concluí voltou" que ja custou uma
    // investigacao inteira neste projeto.
    //
    // O recuo e por titulo e alvo, que sao identicos entre ocorrencias da mesma serie.
    fun serieDe(task: PopTask) = task.recurrenceSeriesId?.takeIf { it.isNotBlank() }
        ?: "${task.title}|${task.assignment.kind}|${task.assignment.id.orEmpty()}"
    val jaExistem = tasks.mapTo(mutableSetOf()) { "${serieDe(it)}:${it.dueDate}" }
    val projetadas = mutableListOf<PopTask>()

    tasks.filter { it.recurrenceRule.isNotBlank() && it.recurrenceRule != "Não repetir" }
        .groupBy { serieDe(it) }
        .forEach { (serie, daSerie) ->
            // O modelo e a ocorrencia MAIS RECENTE da serie: e dela que o servidor partiria, e e
            // ela que carrega a contagem de ocorrencias em dia.
            val modelo = daSerie.maxByOrNull { it.dueDate } ?: return@forEach
            var data = parseIsoDate(modelo.dueDate) ?: return@forEach
            var ocorrencia = modelo.recurrenceOccurrence
            var voltas = 0

            while (voltas < LIMITE_DE_PROJECAO) {
                data = advanceRecurrenceDate(modelo, data) ?: break
                ocorrencia += 1
                voltas += 1
                if (data > ate) break

                val dentroDoFim = when (modelo.recurrenceEndMode) {
                    "Após" -> ocorrencia <= (modelo.recurrenceEndValue.trim().toIntOrNull() ?: 1)
                    "Em uma data" ->
                        parseIsoDate(modelo.recurrenceEndValue)?.let { data <= it } ?: true
                    else -> true
                }
                if (!dentroDoFim) break

                if (data < de) continue
                val iso = data.toString()
                if (iso in modelo.recurrenceExcludedDates) continue
                if (!jaExistem.add("$serie:$iso")) continue

                projetadas += modelo.copy(
                    id = "$PREFIXO_PROJECAO$serie:$iso",
                    serverId = null,
                    dueDate = iso,
                    completed = false,
                    recurrenceOccurrence = ocorrencia,
                    checklist = modelo.checklist.map { it.copy(done = false) },
                )
            }
        }
    return projetadas
}

/** Uma tarefa posicionada num horario do dia. Ver `expandirDia`. */
private data class NaAgenda(val task: PopTask, val horario: String?)

/**
 * Dentro de um dia a cascata e outra, de proposito: a data ja e a mesma para todos, entao quem
 * manda e o HORARIO.
 *
 * O horario vem antes de `completed`, ao contrario da `taskListOrder` da aba Tarefas. Nao e
 * descuido: numa lista de afazeres o que importa e o que falta fazer, e pendente sobe; numa agenda
 * o que importa e a ordem do dia, e uma tarefa das 9h concluida vem antes de uma das 10h pendente
 * porque foi isso que aconteceu. E a mesma ordem que o painel web adotou.
 */
private val agendaOrder = compareBy<NaAgenda>(
    // Sem horario vai para o fim. "99:99" nao e hora valida e nunca colide com uma de verdade.
    { it.horario ?: "99:99" },
    { it.task.completed },
    { -it.task.priority.ordinal },
    { it.task.title },
)

/**
 * Os horarios de uma tarefa dentro de um dia.
 *
 * `recurrenceTimes` manda quando existe: e o campo que guarda os horarios de uma serie que repete
 * varias vezes ao dia, e o `dueTime` de uma tarefa assim e so o primeiro deles. Mesma precedencia
 * que o painel web usa.
 *
 * Lista vazia significa "sem hora marcada", que e diferente de "nao aparece": a tarefa entra na
 * agenda, no fim do dia, sob "Sem horário definido".
 */
private fun horariosDaTarefa(task: PopTask): List<String> {
    // `horaComparavel` porque o `dueTime` e texto livre dos dois lados do fio e pode chegar "9:00".
    // O `recurrenceTimes` ja vem validado por regex e nao precisaria, mas passar os dois pelo mesmo
    // caminho evita que a lista saia com formatos misturados na mesma coluna.
    val doCofre = task.recurrenceTimes.filter { it.isNotBlank() }.map { horaComparavel(it) }
    if (doCofre.isNotEmpty()) return doCofre.distinct().sorted()
    return if (task.dueTime.isNotBlank()) listOf(horaComparavel(task.dueTime)) else emptyList()
}

/**
 * Abre as tarefas de um dia em uma linha POR HORARIO, e ordena.
 *
 * Uma serie que repete as 8h, 14h e 20h ocupa tres lugares na agenda do dia, e nao um -- e o que
 * torna a lista uma agenda em vez de um resumo. O servidor guarda uma linha por DATA
 * (materializeRecurringTasks), nunca uma por horario, entao esta expansao e local e nao vai para o
 * fio: `toApiTask` continua enviando uma tarefa so.
 */
private fun expandirDia(tasks: List<PopTask>): List<NaAgenda> =
    tasks.flatMap { task ->
        val horarios = horariosDaTarefa(task)
        if (horarios.isEmpty()) listOf(NaAgenda(task, null)) else horarios.map { NaAgenda(task, it) }
    }.sortedWith(agendaOrder)

/**
 * Os nomes de quem esta encarregado de uma tarefa.
 *
 * O `assignee` do servidor e `assignees.join(", ")` -- numa tarefa com dois responsaveis ele
 * chega como "Ana, Bruno" numa string so. Sem separar, o nome composto nao casa com funcionario
 * nenhum, e o filtro por setor perderia a tarefa.
 */
private fun responsaveisDaTarefa(task: PopTask): List<String> {
    val daLista = task.assignees.orEmpty().filter { it.isNotBlank() }
    if (daLista.isNotEmpty()) return daLista
    // "Sem responsável" e a string LITERAL que o servidor manda quando nao ha ninguem
    // (`assignees.join(", ") || "Sem responsável"`), e nao um nome. Sem esta guarda a funcao
    // devolveria uma pessoa inexistente e o proximo a usa-la herdaria a mentira.
    return task.assignee.split(",")
        .map { it.trim() }
        .filter { it.isNotBlank() && !it.equals("Sem responsável", ignoreCase = true) }
}

/**
 * A que setores uma tarefa pertence, para o filtro do calendario.
 *
 * Nao e "o alvo da tarefa": regra portada do `getCalendarTaskDepartmentIds` do painel web, que
 * vive em `src/components/calendar/calendar-task.ts` -- **na `main`, ainda nao mesclada aqui**;
 * procurar por ele nesta branch nao acha nada. Uma tarefa entra num setor se
 *
 *   - o ALVO dela e aquele setor; ou
 *   - alguem ligado a ela pertence ao setor -- o alvo quando e pessoa, cada responsavel, e os
 *     membros do grupo quando o alvo e um grupo.
 *
 * Sem a segunda regra, filtrar "Comercial" esconderia a tarefa que o gerente do Comercial atribuiu
 * a uma pessoa da equipe dele, que e justamente o que ele quer ver.
 *
 * Responsavel casa por NOME, nao por id, porque nome e a unica coisa que o fio carrega. E o mesmo
 * critério que o servidor usa em `mobileResponsibleId`.
 */
private fun setoresDaTarefa(task: PopTask, company: CompanyWorkspace?): Set<String> {
    if (company == null) return emptySet()
    val setores = mutableSetOf<String>()
    if (task.assignment.kind == AssignmentKind.Sector) task.assignment.id?.let { setores += it }

    // `activeMembers` e propriedade CALCULADA: cada acesso filtra a lista inteira de novo. Esta
    // funcao roda uma vez por tarefa do espaco, entao ler tres vezes aqui dentro multiplicava o
    // filtro por 3x o numero de tarefas -- num espaco de centenas de tarefas isso pesa. Uma vez so.
    val pessoasReais = company.activeMembers
    val pessoas = mutableSetOf<CompanyMember>()
    when (task.assignment.kind) {
        AssignmentKind.Person ->
            pessoasReais.firstOrNull { it.id == task.assignment.id }?.let { pessoas += it }
        AssignmentKind.Group ->
            company.groups.firstOrNull { it.id == task.assignment.id }
                ?.memberIds.orEmpty()
                .forEach { id ->
                    pessoasReais.firstOrNull { it.id == id }?.let { pessoas += it }
                }
        AssignmentKind.Sector, AssignmentKind.None -> Unit
    }
    responsaveisDaTarefa(task).forEach { nome ->
        // Aqui o casamento e por NOME, e e justamente onde o convite pendente mais engana: ele tem
        // o mesmo nome da pessoa de verdade e um `sectorId` proprio, entao entraria arrastando um
        // setor para o filtro do calendario.
        pessoasReais.firstOrNull { it.name.equals(nome, ignoreCase = true) }?.let { pessoas += it }
    }
    pessoas.forEach { pessoa -> pessoa.sectorId?.takeIf { it.isNotBlank() }?.let { setores += it } }

    // Setor que nao existe mais na empresa nao pode aparecer no filtro nem casar com ele.
    return setores.filter { id -> company.sectors.any { it.id == id } }.toSet()
}

/**
 * Calendario: grade mensal no topo, agenda continua embaixo.
 *
 * A tela anterior tinha 18 linhas e imprimia a data ISO crua ("2026-08-20") como cabecalho de
 * grupo, com as tarefas numa linha compacta que nao respondia a toque nenhum -- nao dava para
 * abrir, concluir nem reatribuir nada a partir daqui.
 */
@Composable
private fun CalendarScreen(store: PopStore) {
    val tasks = store.visibleTasks
    // Lido a cada recomposicao em vez de guardado num remember: e uma leitura de relogio barata, e
    // um app deixado aberto durante a virada da meia-noite continua chamando de "Hoje" o dia certo.
    val today = todayDate()
    // Mesma razao do `today`: leitura de relogio barata, e a regua do "agora" acompanha.
    //
    // Ela se reposiciona a cada recomposicao, NAO num temporizador. Rolar, tocar ou atualizar a
    // recoloca; deixar a tela parada por uma hora a deixa uma hora atrasada. Um relogio proprio
    // gastaria bateria para mover um tracinho, e a decisao foi nao ter.
    val agora = horaAgora()
    // `selectedCompany` e "a ULTIMA empresa escolhida", nao "estamos numa empresa" -- sem esta
    // guarda o filtro por setor apareceria dentro do Meu Espaco, oferecendo os setores da empresa.
    val company = store.selectedCompany.takeIf { store.state.workspace == WorkspaceKind.Company }

    var setorFiltro by remember { mutableStateOf<String?>(null) }
    var soPendentes by remember { mutableStateOf(false) }
    // Trocar de espaco troca a lista de setores. Um id que nao existe mais no espaco novo nao
    // casaria com tarefa nenhuma e a agenda apareceria vazia, sem nada na tela explicando por que.
    LaunchedEffect(company?.id) { setorFiltro = null }

    var selectedDate by remember { mutableStateOf(today) }
    var visibleYear by remember { mutableIntStateOf(today.year) }
    var visibleMonth by remember { mutableIntStateOf(today.monthNumber) }
    var pastExpanded by remember { mutableStateOf(false) }
    var selectedTask by remember { mutableStateOf<PopTask?>(null) }
    var pendingDeleteTask by remember { mutableStateOf<PopTask?>(null) }
    var removingId by remember { mutableStateOf<String?>(null) }

    val listState = rememberLazyListState()
    val scope = rememberCoroutineScope()
    val moveTargets = rememberMoveTargets(store)

    // Uma tarefa com dueDate vazio ou fora do ISO nao tem lugar num calendario. A tela antiga a
    // agrupava sob um cabecalho em branco; aqui ela fica de fora da agenda, mas o rodape diz
    // quantas sao, para que nao sumam sem aviso.
    // O filtro entra ANTES do `dated`, e isso nao e detalhe de organizacao.
    //
    // A grade do mes acende um ponto nos dias que tem tarefa, e ela le o `tasksByDate`, que sai
    // daqui. Filtrando so a lista de baixo, a grade continuaria acendendo dias que a agenda
    // filtrada nao entrega -- prometendo um dia que o toque nao cumpre. Filtrando na origem, a
    // grade e a agenda contam a mesma historia de graca.
    val filtradas = remember(tasks, setorFiltro, soPendentes, company) {
        tasks.filter { task ->
            (!soPendentes || !task.completed) &&
                (setorFiltro == null || setorFiltro in setoresDaTarefa(task, company))
        }
    }
    // As ocorrencias que o servidor ainda nao materializou, ate o fim do mes que esta na tela.
    //
    // Entram AQUI, junto das reais, e nao so na grade: a grade e a agenda leem a mesma fonte de
    // proposito (ver o comentario acima), e acender um ponto que a agenda nao entrega e justamente
    // o defeito que aquela decisao evita.
    //
    // A chave inclui o mes visivel, entao navegar para frente recalcula e a serie continua
    // aparecendo em vez de acabar na virada do mes.
    val fimDoMesVisivel = remember(visibleYear, visibleMonth) {
        LocalDate(visibleYear, visibleMonth, daysInMonth(visibleYear, visibleMonth))
    }
    val comProjecao = remember(filtradas, today, fimDoMesVisivel) {
        filtradas + projetarOcorrencias(filtradas, today, fimDoMesVisivel)
    }
    val dated = remember(comProjecao) {
        comProjecao.mapNotNull { task -> parseIsoDate(task.dueDate)?.let { date -> date to task } }
    }
    // Conta sobre `filtradas`, e nao `dated.size`. Desde que a projecao entrou, `dated` tem MAIS
    // linhas que `filtradas`, e a subtracao antiga devolvia numero negativo -- o rodape passaria a
    // anunciar "-8 tarefas sem data".
    val undatedCount = filtradas.count { parseIsoDate(it.dueDate) == null }
    val tasksByDate = remember(dated) { dated.groupBy({ it.first }, { it.second }) }

    // Tudo que ficou para tras entra aqui, concluido ou nao. Filtrar so as pendentes deixaria a
    // tarefa atrasada que acabou de ser concluida num vao: fora de "Atrasadas" por estar
    // concluida, e fora da agenda por ser anterior a hoje. Ela sumiria da lista enquanto o ponto
    // dela seguiria aceso na grade, prometendo um dia que a agenda nao entregava.
    val past = remember(dated, today) {
        dated.filter { it.first < today }
            .sortedWith(compareBy({ it.second.completed }, { it.first }))
            .map { it.second }
    }
    val overdueCount = past.count { !it.completed }
    val upcoming = remember(tasksByDate, today) {
        tasksByDate.filterKeys { it >= today }.toList().sortedBy { it.first }
    }

    val rows = remember(past, overdueCount, upcoming, pastExpanded, today, agora) {
        buildList<CalendarRow> {
            if (past.isNotEmpty()) {
                add(CalendarRow.PastHeader(overdueCount = overdueCount, total = past.size))
                if (pastExpanded) past.forEach { add(CalendarRow.Entry(it)) }
            }
            upcoming.forEach { (date, dayTasks) ->
                add(CalendarRow.DayHeader(date))
                val naAgenda = expandirDia(dayTasks)
                val comHora = naAgenda.filter { it.horario != null }
                val semHora = naAgenda.filter { it.horario == null }
                // Os dois rotulos so aparecem quando existem os dois grupos: num dia em que tudo
                // tem horario, "Agenda do dia" sozinho nao separa coisa nenhuma.
                val separar = comHora.isNotEmpty() && semHora.isNotEmpty()
                if (separar) add(CalendarRow.Section(date, "Agenda do dia"))
                // A regua do agora entra so HOJE, e so onde ha horario para dividir: num dia
                // futuro ela nao significa nada, e num dia sem hora marcada nao ha regua nenhuma.
                var faltaOAgora = date == today && comHora.isNotEmpty()
                // `add` devolve true so na PRIMEIRA vez que ve o id -- e exatamente "esta e a
                // primeira linha desta tarefa neste dia".
                val jaVista = mutableSetOf<String>()
                comHora.forEach { item ->
                    val hora = item.horario ?: ""
                    if (faltaOAgora && hora >= agora) {
                        add(CalendarRow.Now(agora))
                        faltaOAgora = false
                    }
                    // Ocorrencia projetada nao tem linha no servidor: concluir ou excluir nao teria
                    // onde pegar, e o `toggleTask` sairia calado sem fazer nada. Mesma regra da
                    // linha repetida -- melhor nao oferecer a acao do que oferece-la mentindo.
                    val comAcoes = jaVista.add(item.task.id) && !ehProjecao(item.task)
                    add(CalendarRow.Entry(item.task, item.horario, comAcoes))
                }
                // Tudo de hoje ja passou: a regua vai para o fim, em vez de nao aparecer.
                if (faltaOAgora) add(CalendarRow.Now(agora))
                if (separar) add(CalendarRow.Section(date, "Sem horário definido"))
                // String VAZIA, e nao `null`: vazia diz "nesta agenda, sem hora marcada" -- mantem a
                // calha (com um travessao) e portanto o alinhamento com as linhas de cima, e continua
                // suprimindo o rotulo de data, que aqui repetiria o cabecalho do dia. `null` e
                // reservado para linha FORA de agenda, como as de "Atrasadas".
                semHora.forEach { add(CalendarRow.Entry(it.task, "")) }
            }
        }
    }

    fun goToDate(date: LocalDate) {
        selectedDate = date
        if (date < today) {
            // Dias passados nao tem cabecalho proprio: vivem todos dentro da secao recolhivel.
            // Rolar ate um cabecalho inexistente nao levaria a lugar nenhum, entao abrir a secao
            // e o que corresponde ao toque.
            pastExpanded = true
            scope.launch { listState.animateScrollToItem(1) }
            return
        }
        val index = rows.indexOfFirst { it is CalendarRow.DayHeader && it.date == date }
        // O +1 pula o cabecalho, que ocupa o indice 0 da lista.
        if (index >= 0) scope.launch { listState.animateScrollToItem(index + 1) }
    }

    fun shiftMonth(step: Int) {
        val moved = LocalDate(visibleYear, visibleMonth, 1).plus(DatePeriod(months = step))
        visibleYear = moved.year
        visibleMonth = moved.monthNumber
    }

    fun deleteWithAnimation(task: PopTask, action: () -> Unit) {
        pendingDeleteTask = null
        removingId = task.id
        scope.launch {
            delay(230)
            action()
            removingId = null
        }
    }

    LazyColumn(
        state = listState,
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 18.dp, top = 18.dp, end = 18.dp, bottom = 92.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        item(key = "cabecalho") {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                // Mesmo tratamento da tela de Tarefas: titulo e contagem na mesma linha. Em duas
                // linhas a contagem empurrava a grade do mes para baixo, e a grade e o conteudo
                // pelo qual a pessoa abriu a tela.
                Row(verticalAlignment = Alignment.Bottom) {
                    Text(
                        "Calendário",
                        fontSize = 27.sp,
                        lineHeight = 32.sp,
                        fontWeight = FontWeight.ExtraBold,
                    )
                    Spacer(Modifier.width(10.dp))
                    Text(
                        // Conta so o que EXISTE, nunca a projecao. Medido na previa: com as
                        // ocorrencias projetadas entrando na conta, cinco tarefas viraram "34 em
                        // aberto", e numa empresa com meia duzia de series diarias passaria de
                        // noventa. O numero descreveria o calendario, nao o trabalho -- e leria
                        // como uma empresa afogada.
                        "${dated.count { !it.second.completed && !ehProjecao(it.second) }} em aberto",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 13.sp,
                        modifier = Modifier.weight(1f).padding(bottom = 4.dp),
                    )
                    // Sem este botao, voltar de uma navegacao de varios meses so seria possivel
                    // mes a mes, no toque.
                    TextButton(
                        onClick = {
                            visibleYear = today.year
                            visibleMonth = today.monthNumber
                            goToDate(today)
                        },
                    ) { Text("Hoje") }
                }
                // Espaco pessoal nao tem setor, e empresa sem setor cadastrado teria um filtro de
                // uma opcao so. Nos dois casos a barra nao aparece.
                if (company != null && company.sectors.isNotEmpty()) {
                    CalendarFilterBar(
                        sectors = company.sectors.sortedBy { it.name.lowercase() },
                        setorFiltro = setorFiltro,
                        onSetor = { setorFiltro = it },
                        soPendentes = soPendentes,
                        onSoPendentes = { soPendentes = it },
                    )
                }
                CalendarMonthGrid(
                    year = visibleYear,
                    month = visibleMonth,
                    today = today,
                    selectedDate = selectedDate,
                    tasksByDate = tasksByDate,
                    // Lambda, e nao ::goToDate: referencia a funcao local nao e garantida em
                    // Kotlin, e aqui so se descobre no CI.
                    onSelect = { goToDate(it) },
                    onPreviousMonth = { shiftMonth(-1) },
                    onNextMonth = { shiftMonth(1) },
                )
            }
        }

        if (rows.isEmpty()) {
            item(key = "vazio") {
                // Com filtro ligado, "Nenhum prazo" seria falso: as tarefas existem e estao
                // escondidas por uma escolha da propria pessoa. Dizer qual escolha e o que
                // devolve o caminho de volta.
                if (setorFiltro != null || soPendentes) {
                    EmptyState("Nada com este filtro", "Troque o setor ou desligue “Só pendentes”.")
                } else {
                    EmptyState("Nenhum prazo", "As tarefas com data aparecerão aqui.")
                }
            }
        }

        items(rows, key = ::calendarRowKey) { row ->
            when (row) {
                is CalendarRow.PastHeader -> {
                    // So vira alarme quando ha o que cobrar. Um punhado de tarefas antigas ja
                    // concluidas nao merece a mesma tarja vermelha de um prazo estourado.
                    val hasOverdue = row.overdueCount > 0
                    val tint = if (hasOverdue) PopRed else MaterialTheme.colorScheme.onSurfaceVariant
                    Surface(
                        modifier = Modifier.fillMaxWidth().clickable { pastExpanded = !pastExpanded },
                        shape = RoundedCornerShape(14.dp),
                        color = if (hasOverdue) {
                            PopRed.copy(alpha = .12f)
                        } else {
                            MaterialTheme.colorScheme.surfaceVariant.copy(alpha = .55f)
                        },
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth()
                                .padding(start = 14.dp, top = 11.dp, end = 8.dp, bottom = 11.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                if (hasOverdue) "Atrasadas" else "Antes de hoje",
                                fontWeight = FontWeight.Bold,
                                color = tint,
                                modifier = Modifier.weight(1f),
                            )
                            Text(
                                // "3 de 8" quando parte ja foi concluida: o numero sozinho nao
                                // bateria com o tanto de linha que a secao abre.
                                when {
                                    !hasOverdue -> "${row.total}"
                                    row.total == row.overdueCount -> "${row.overdueCount}"
                                    else -> "${row.overdueCount} de ${row.total}"
                                },
                                color = tint,
                                fontWeight = FontWeight.ExtraBold,
                            )
                            Icon(
                                if (pastExpanded) Icons.Rounded.ExpandLess else Icons.Rounded.ExpandMore,
                                if (pastExpanded) "Recolher" else "Expandir",
                                tint = tint,
                            )
                        }
                    }
                }

                is CalendarRow.DayHeader -> Text(
                    dayHeaderLabel(row.date, today),
                    color = if (row.date == today) PopBlue else MaterialTheme.colorScheme.onSurface,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(top = 8.dp),
                )

                is CalendarRow.Section -> Text(
                    row.label,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                )

                is CalendarRow.Now -> Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        row.hora,
                        color = PopRed,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.ExtraBold,
                        maxLines = 1,
                        softWrap = false,
                        modifier = Modifier.width(40.dp),
                    )
                    Box(Modifier.weight(1f).height(2.dp).background(PopRed.copy(alpha = .5f)))
                }

                is CalendarRow.Entry -> AnimatedVisibility(
                    visible = removingId != row.task.id,
                    enter = fadeIn() + expandVertically(),
                    exit = fadeOut(tween(220)) + shrinkVertically(tween(220)),
                ) {
                    TaskRow(
                        task = row.task,
                        horario = row.horario,
                        mostrarAcoes = row.comAcoes,
                        moveTargets = moveTargets,
                        onOpen = { selectedTask = row.task },
                        onToggle = { store.toggleTask(row.task.id) },
                        onMove = { store.moveTask(row.task.id, it) },
                        onDelete = { pendingDeleteTask = row.task },
                    )
                }
            }
        }

        if (undatedCount > 0) {
            item(key = "sem-data") {
                Text(
                    if (undatedCount == 1) {
                        "1 tarefa sem data não aparece aqui."
                    } else {
                        "$undatedCount tarefas sem data não aparecem aqui."
                    },
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontSize = 11.sp,
                    modifier = Modifier.padding(top = 6.dp),
                )
            }
        }
    }

    selectedTask?.let { task ->
        TaskDetailsDialog(
            task = task,
            store = store,
            onTaskChanged = { selectedTask = it },
            onDismiss = { selectedTask = null },
        )
    }

    pendingDeleteTask?.let { task ->
        TaskDeleteDialog(
            task = task,
            onDismiss = { pendingDeleteTask = null },
            onDelete = { deleteWithAnimation(task) { store.deleteTask(task.id) } },
            onDeleteSeries = { deleteWithAnimation(task) { store.deleteTaskSeries(task.id) } },
        )
    }
}

/**
 * Filtros da agenda: por setor, e "só pendentes".
 *
 * NAO ha checagem de administrador aqui, e a ausencia e deliberada. Quem nao e administrador ja
 * recebe do servidor so o que pode ver, entao o filtro dele teria uma opcao so -- e a condicao de
 * exibicao de quem chama (ha empresa, e ha setor cadastrado) resolve esse caso sozinha, sem
 * inventar uma regra de permissao no aplicativo que possa divergir da do servidor. O painel web
 * chegou a mesma decisao.
 */
@Composable
private fun CalendarFilterBar(
    sectors: List<CompanySector>,
    setorFiltro: String?,
    onSetor: (String?) -> Unit,
    soPendentes: Boolean,
    onSoPendentes: (Boolean) -> Unit,
) {
    var aberto by remember { mutableStateOf(false) }
    val nomeAtual = sectors.firstOrNull { it.id == setorFiltro }?.name ?: "Todos os setores"
    val ativo = setorFiltro != null
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.weight(1f)) {
            Surface(
                modifier = Modifier.fillMaxWidth().clickable { aberto = true },
                shape = RoundedCornerShape(12.dp),
                color = if (ativo) {
                    PopBlue.copy(alpha = .14f)
                } else {
                    MaterialTheme.colorScheme.surfaceVariant.copy(alpha = .55f)
                },
            ) {
                Row(
                    modifier = Modifier.padding(start = 12.dp, top = 9.dp, end = 6.dp, bottom = 9.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        Icons.Rounded.Apartment,
                        null,
                        tint = if (ativo) PopBlue else MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(16.dp),
                    )
                    Spacer(Modifier.width(7.dp))
                    Text(
                        nomeAtual,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 1,
                        color = if (ativo) PopBlue else MaterialTheme.colorScheme.onSurface,
                        modifier = Modifier.weight(1f),
                    )
                    Icon(
                        Icons.Rounded.ExpandMore,
                        "Escolher setor",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(18.dp),
                    )
                }
            }
            DropdownMenu(expanded = aberto, onDismissRequest = { aberto = false }) {
                DropdownMenuItem(
                    text = { Text("Todos os setores") },
                    trailingIcon = {
                        if (setorFiltro == null) Icon(Icons.Rounded.Check, null, tint = PopBlue)
                    },
                    onClick = {
                        onSetor(null)
                        aberto = false
                    },
                )
                sectors.forEach { setor ->
                    DropdownMenuItem(
                        text = { Text(setor.name) },
                        leadingIcon = { Icon(Icons.Rounded.Apartment, null) },
                        trailingIcon = {
                            if (setor.id == setorFiltro) Icon(Icons.Rounded.Check, null, tint = PopBlue)
                        },
                        onClick = {
                            onSetor(setor.id)
                            aberto = false
                        },
                    )
                }
            }
        }
        Surface(
            modifier = Modifier.clickable { onSoPendentes(!soPendentes) },
            shape = RoundedCornerShape(12.dp),
            color = if (soPendentes) {
                PopBlue.copy(alpha = .14f)
            } else {
                MaterialTheme.colorScheme.surfaceVariant.copy(alpha = .55f)
            },
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 11.dp, vertical = 9.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(
                    if (soPendentes) Icons.Rounded.CheckCircle else Icons.Rounded.RadioButtonUnchecked,
                    null,
                    tint = if (soPendentes) PopBlue else MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.size(15.dp),
                )
                Spacer(Modifier.width(6.dp))
                Text(
                    "Só pendentes",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = if (soPendentes) PopBlue else MaterialTheme.colorScheme.onSurface,
                )
            }
        }
    }
}

@Composable
private fun CalendarMonthGrid(
    year: Int,
    month: Int,
    today: LocalDate,
    selectedDate: LocalDate,
    tasksByDate: Map<LocalDate, List<PopTask>>,
    onSelect: (LocalDate) -> Unit,
    onPreviousMonth: () -> Unit,
    onNextMonth: () -> Unit,
) {
    val cells = remember(year, month) {
        val offset = isoDayNumber(LocalDate(year, month, 1)) - 1
        val head = List<Int?>(offset) { null } + (1..daysInMonth(year, month)).toList()
        // Fecha so a ultima semana. O Android fixa 42 celulas, o que deixa uma sexta linha inteira
        // vazia na maioria dos meses, gastando altura de tela a toa.
        head + List<Int?>((7 - head.size % 7) % 7) { null }
    }

    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onPreviousMonth) { Icon(Icons.Rounded.ChevronLeft, "Mês anterior") }
            Text(
                monthTitle(year, month),
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center,
                modifier = Modifier.weight(1f),
            )
            IconButton(onClick = onNextMonth) { Icon(Icons.Rounded.ChevronRight, "Próximo mês") }
        }
        Row(Modifier.fillMaxWidth()) {
            weekdayLabels.forEach { label ->
                Text(
                    label,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.weight(1f),
                )
            }
        }
        cells.chunked(7).forEach { week ->
            Row(Modifier.fillMaxWidth()) {
                week.forEach { day ->
                    Box(Modifier.weight(1f), contentAlignment = Alignment.Center) {
                        if (day == null) {
                            Spacer(Modifier.height(44.dp))
                        } else {
                            val date = LocalDate(year, month, day)
                            CalendarDayCell(
                                day = day,
                                isToday = date == today,
                                isSelected = date == selectedDate,
                                dayTasks = tasksByDate[date].orEmpty(),
                                onClick = { onSelect(date) },
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun CalendarDayCell(
    day: Int,
    isToday: Boolean,
    isSelected: Boolean,
    dayTasks: List<PopTask>,
    onClick: () -> Unit,
) {
    // Pendentes primeiro: se o dia tem mais marcadores do que cabem, o que precisa aparecer e o
    // que ainda falta fazer, nao o que ja foi feito.
    val ordered = dayTasks.filterNot { it.completed } + dayTasks.filter { it.completed }
    val markers = ordered.take(3)
    val extra = ordered.size - markers.size

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(10.dp))
            .clickable(onClick = onClick)
            .padding(vertical = 4.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(3.dp),
    ) {
        Box(
            modifier = Modifier.size(26.dp).then(
                // O Android pinta "hoje" e "dia selecionado" exatamente igual, entao com outro dia
                // escolhido nao da para achar hoje na grade. Aqui o selecionado e preenchido e o
                // hoje e contornado: dois estados, duas aparencias.
                when {
                    isSelected -> Modifier.background(PopBlue, CircleShape)
                    isToday -> Modifier.border(1.5.dp, PopBlue, CircleShape)
                    else -> Modifier
                },
            ),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                day.toString(),
                fontSize = 12.sp,
                color = when {
                    isSelected -> Color.White
                    isToday -> PopBlue
                    else -> MaterialTheme.colorScheme.onSurface
                },
                fontWeight = if (isSelected || isToday) FontWeight.Bold else FontWeight.Normal,
            )
        }
        Row(
            modifier = Modifier.height(8.dp),
            horizontalArrangement = Arrangement.spacedBy(2.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            markers.forEach { task ->
                Box(
                    Modifier.size(5.dp).background(
                        if (task.completed) MaterialTheme.colorScheme.outline else priorityColor(task.priority),
                        CircleShape,
                    ),
                )
            }
            // O "+N" no lugar de mais pontos: o Android chega a desenhar 20 bolinhas de 2dp em
            // orbita num circulo de 38dp, o que vira um borrao que ninguem consegue contar. O
            // numero tambem nao depende de distinguir matiz, ao contrario da cor sozinha.
            if (extra > 0) {
                Text(
                    "+$extra",
                    fontSize = 8.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontWeight = FontWeight.Bold,
                )
            }
        }
    }
}

@Composable
private fun MoreScreen(store: PopStore, onPage: (MorePage) -> Unit) {
    val company = store.selectedCompany
    val inCompany = store.state.workspace == WorkspaceKind.Company && company != null
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(18.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        // Nao ha titulo "Mais" aqui de proposito. Ele nomeava a ABA, nao o conteudo -- e a aba ja
        // se nomeia na barra de baixo, dois centimetros abaixo. Somado ao cabecalho de espaco que
        // fica logo acima, a tela abria com tres titulos empilhados, dois deles dizendo "Meu
        // espaco". O cartao de conta assume o topo: e identidade, e nao se repete em lugar nenhum.
        item { AccountCard(store) }
        // Empresa antes de Aplicativo: quem abre esta aba vem atras de equipe, setor ou grupo.
        // Configuracoes e o destino raro, e destino raro vai para o fim da lista.
        if (
            inCompany &&
            (store.permissions.canViewEmployees ||
                store.permissions.canViewDepartments ||
                store.permissions.canViewGroups)
        ) {
            item { SectionTitle("Empresa") }
            if (store.permissions.canViewEmployees) {
                item {
                    MoreItem(
                        Icons.Rounded.Person,
                        "Equipe",
                        "${company!!.activeMembers.size} pessoas cadastradas",
                    ) { onPage(MorePage.Team) }
                }
            }
            if (store.permissions.canViewDepartments) {
                item {
                    MoreItem(
                        Icons.Rounded.Apartment,
                        "Setores",
                        "${company!!.sectors.size} setores",
                    ) { onPage(MorePage.Sectors) }
                }
            }
            if (store.permissions.canViewGroups) {
                item {
                    MoreItem(
                        Icons.Rounded.Groups,
                        "Grupos",
                        "${company!!.groups.size} grupos",
                    ) { onPage(MorePage.Groups) }
                }
            }
        }
        item { SectionTitle("Aplicativo") }
        item { MoreItem(Icons.Rounded.Settings, "Configurações", "Tema, conta e suporte") { onPage(MorePage.Settings) } }
    }
}

/**
 * Cartao de conta: quem esta logado, e quanto ha em aberto no espaco atual.
 *
 * Substitui um cartao que repetia o nome do espaco que ja estava no cabecalho da tela. Nao e
 * clicavel e nao leva chevron -- nao existe tela de perfil para abrir, e um chevron que nao abre
 * nada e uma promessa quebrada.
 */
@Composable
private fun AccountCard(store: PopStore) {
    val user = store.state.currentUser
    val name = user?.name?.trim().orEmpty().ifBlank { "Visitante" }
    val tasks = store.visibleTasks
    // Sem `remember`, pelo mesmo motivo do DashboardScreen: congelado, o cartao de conta seguiria
    // contando pelo dia anterior depois da meia-noite.
    val today = todayDate()
    val pending = tasks.count { !it.completed }
    val done = tasks.size - pending
    val late = remember(tasks, today) {
        tasks.count { task ->
            val offset = parseIsoDate(task.dueDate)?.let { daysBetween(today, it) } ?: 0L
            !task.completed && offset < 0L
        }
    }
    PopCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier.size(52.dp).clip(CircleShape).background(PopBrandGradient),
                contentAlignment = Alignment.Center,
            ) {
                Text(initialsOf(name), color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.Bold)
            }
            Column(Modifier.padding(start = 14.dp).weight(1f)) {
                Text(
                    name,
                    fontSize = 17.sp,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    // Sem conta, o e-mail nao existe. Dizer o que a sessao E vale mais do que
                    // deixar a linha vazia ou inventar um espaco reservado.
                    user?.email ?: "Sessão local, sem conta",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontSize = 12.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
        HorizontalDivider(
            Modifier.padding(vertical = 14.dp),
            color = MaterialTheme.colorScheme.outlineVariant,
        )
        Row(Modifier.fillMaxWidth()) {
            // Nao repete o herói do Início: la o numero e de HOJE, aqui e o total em aberto no
            // espaco. Sao respostas diferentes para perguntas diferentes.
            AccountStat("$pending", "em aberto", Modifier.weight(1f))
            // O terceiro numero era o total, ou seja, a soma dos outros dois -- o mesmo defeito que
            // custou os tres cartoes de metrica do Inicio. "Atrasadas" nao sai de conta nenhuma.
            AccountStat("$late", if (late == 1) "atrasada" else "atrasadas", Modifier.weight(1f), if (late > 0) PopRed else null)
            AccountStat("$done", if (done == 1) "concluída" else "concluídas", Modifier.weight(1f))
        }
    }
}

@Composable
private fun AccountStat(
    value: String,
    label: String,
    modifier: Modifier = Modifier,
    valueColor: Color? = null,
) {
    Column(modifier) {
        Text(
            value,
            fontSize = 19.sp,
            fontWeight = FontWeight.Bold,
            color = valueColor ?: MaterialTheme.colorScheme.onSurface,
        )
        Text(
            label,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

/** Iniciais do primeiro e do ultimo nome; um so nome devolve uma letra, e vazio devolve "?". */
private fun initialsOf(name: String): String {
    val parts = name.trim().split(' ').filter { it.isNotBlank() }
    return when (parts.size) {
        0 -> "?"
        1 -> parts[0].take(1).uppercase()
        else -> (parts.first().take(1) + parts.last().take(1)).uppercase()
    }
}

@Composable
private fun MoreItem(icon: ImageVector, title: String, detail: String, onClick: () -> Unit) {
    PopCard(modifier = Modifier.clickable(onClick = onClick)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(42.dp).background(MaterialTheme.colorScheme.primaryContainer, RoundedCornerShape(14.dp)), contentAlignment = Alignment.Center) {
                Icon(icon, null, tint = MaterialTheme.colorScheme.primary)
            }
            Column(Modifier.padding(horizontal = 12.dp).weight(1f)) {
                Text(title, fontWeight = FontWeight.Bold)
                Text(detail, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
            }
            Icon(Icons.Rounded.ChevronRight, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun TeamScreen(store: PopStore) {
    val company = store.selectedCompany
    var showEditor by remember { mutableStateOf(false) }
    // Convidar alguem exige um setor: addMember() usa o primeiro setor da empresa como destino.
    val hasSector = company?.sectors?.isNotEmpty() == true
    val canAdd = store.permissions.canManageEmployees && hasSector
    // So gente de verdade. Os convites pendentes chegam nesta mesma lista e tem o MESMO nome das
    // pessoas que ja aceitaram, entao sem o filtro a Equipe mostra cada pessoa duas vezes.
    val members = company?.activeMembers.orEmpty()
    EntityListScreen(
        header = if (members.size == 1) "1 pessoa cadastrada" else "${members.size} pessoas cadastradas",
        emptyTitle = "Nenhum colaborador",
        emptyDetail = when {
            !store.permissions.canManageEmployees -> "Somente quem administra a equipe pode convidar."
            !hasSector -> "Cadastre um setor antes de convidar alguém."
            else -> null
        },
        items = members.map { member ->
            EntityRow(
                title = member.name,
                // O setor sai da linha do e-mail e vira a legenda do nome: e a informacao que se
                // usa para decidir a quem atribuir tarefa, e o e-mail e a que se le por ultimo.
                subtitle = company?.sectors?.firstOrNull { it.id == member.sectorId }?.name.orEmpty(),
                // Linha propria e de largura cheia. Concatenado ao cargo com um ponto, o e-mail
                // quebrava em duas linhas no primeiro cartao e sobrava um "Administrador -" solto.
                detail = member.email,
                initials = initialsOf(member.name),
                badge = member.role.takeIf { it.isNotBlank() },
            )
        },
        onAdd = if (canAdd) ({ showEditor = true }) else null,
    )
    if (showEditor) MemberEditorDialog(store) { showEditor = false }
}

@Composable
private fun SectorsScreen(store: PopStore) {
    val company = store.selectedCompany ?: store.state.companies.firstOrNull()
    var showEditor by remember { mutableStateOf(false) }
    val canAdd = store.permissions.canManageDepartments
    // Ordem alfabetica, e nao a de criacao. O aplicativo ja se contradizia: a aba Tarefas agrupa
    // por nome e a barra de filtro do calendario ordena, mas esta tela saia "Administrativo, Salao,
    // Cozinha, Balcao, Estoque" -- a ordem em que foram cadastrados, que nao significa nada para
    // quem procura um setor.
    val sectors = company?.sectors.orEmpty().sortedBy { it.name.lowercase() }
    // O contador de cada setor sai daqui. Com `members` cru ele dobrava: convite pendente carrega
    // `sectorId` e tem o mesmo nome de quem ja aceitou.
    val members = company?.activeMembers.orEmpty()
    EntityListScreen(
        header = "Estrutura por setores",
        emptyTitle = "Nenhum setor",
        emptyDetail = if (canAdd) {
            "Cadastre o primeiro setor para poder convidar pessoas."
        } else {
            "Somente quem administra a empresa pode criar setores."
        },
        items = sectors.map { sector ->
            val people = members.count { it.sectorId == sector.id }
            EntityRow(
                title = sector.name,
                subtitle = sector.description,
                icon = Icons.Rounded.Apartment,
                badge = if (people == 1) "1 pessoa" else "$people pessoas",
            )
        },
        onAdd = if (canAdd) ({ showEditor = true }) else null,
    )
    if (showEditor) {
        SimpleEntityEditorDialog(
            title = "Novo setor",
            onSave = { name, description -> store.addSector(name, description) },
            onDismiss = { showEditor = false },
        )
    }
}

@Composable
private fun GroupsScreen(store: PopStore) {
    val company = store.selectedCompany ?: store.state.companies.firstOrNull()
    var showEditor by remember { mutableStateOf(false) }
    val canAdd = store.permissions.canManageGroups
    // Ids de quem e pessoa de verdade, em conjunto, montado UMA vez.
    val idsReais = company?.activeMembers.orEmpty().mapTo(mutableSetOf()) { it.id }
    EntityListScreen(
        header = "Grupos de trabalho",
        emptyTitle = "Nenhum grupo",
        emptyDetail = if (canAdd) null else "Somente quem administra a empresa pode criar grupos.",
        items = company?.groups.orEmpty().sortedBy { it.name.lowercase() }.map { group ->
            // Contar `memberIds` cru repetiria aqui o erro que o `pending` acabou de resolver nos
            // setores: convite pendente pode estar na lista de membros do grupo e inflaria o
            // numero. Conta-se so quem casa com uma pessoa de verdade.
            // Fora do `count`: `activeMembers` filtra a lista toda a cada leitura, e ali dentro
            // seria uma vez por id de membro, de cada grupo.
            val pessoas = group.memberIds.count { id -> idsReais.contains(id) }
            EntityRow(
                title = group.name,
                subtitle = group.description,
                icon = Icons.Rounded.Groups,
                badge = if (pessoas == 1) "1 pessoa" else "$pessoas pessoas",
            )
        },
        onAdd = if (canAdd) ({ showEditor = true }) else null,
    )
    if (showEditor) {
        SimpleEntityEditorDialog(
            title = "Novo grupo",
            onSave = { name, description -> store.addGroup(name, description) },
            onDismiss = { showEditor = false },
        )
    }
}

/**
 * Uma linha das listas de Equipe, Setores e Grupos.
 *
 * As tres desenhavam `Pair<String, String>`: titulo em negrito e uma segunda linha com tudo o mais
 * concatenado. Tres telas iguais, sem hierarquia interna e sem nenhum sinal visual de que tipo de
 * coisa estava listada ali.
 */
private data class EntityRow(
    val title: String,
    /** Legenda curta, ao lado do avatar. */
    val subtitle: String = "",
    /** Linha de largura cheia, abaixo. Para texto que nao pode ser cortado, como e-mail. */
    val detail: String = "",
    /** Avatar circular com iniciais -- pessoas. */
    val initials: String? = null,
    /** Caixa com icone -- setores e grupos. */
    val icon: ImageVector? = null,
    /** Selo a direita: cargo, ou quantas pessoas. */
    val badge: String? = null,
)

@Composable
private fun EntityListScreen(
    header: String,
    emptyTitle: String,
    items: List<EntityRow>,
    onAdd: (() -> Unit)? = null,
    emptyDetail: String? = null,
) {
    // Sem onAdd a tela e somente leitura e o vazio precisa mandar o usuario para o painel web.
    val detail = emptyDetail
        ?: if (onAdd != null) "Toque em + para cadastrar." else "Cadastre pela versão web."
    Box(Modifier.fillMaxSize()) {
        LazyColumn(
            contentPadding = PaddingValues(18.dp, 6.dp, 18.dp, 88.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            item { SectionTitle(header) }
            if (items.isEmpty()) item { EmptyState(emptyTitle, detail) }
            items(items) { row -> EntityCard(row) }
        }
        if (onAdd != null) {
            FloatingActionButton(onClick = onAdd, modifier = Modifier.align(Alignment.BottomEnd).padding(18.dp)) {
                Icon(Icons.Rounded.Add, "Adicionar")
            }
        }
    }
}

@Composable
private fun EntityCard(row: EntityRow) {
    PopCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            if (row.initials != null) {
                Box(
                    Modifier.size(40.dp).clip(CircleShape).background(PopBrandGradient),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(row.initials, color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                }
            } else if (row.icon != null) {
                Box(
                    Modifier.size(40.dp).background(MaterialTheme.colorScheme.primaryContainer, RoundedCornerShape(13.dp)),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(row.icon, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
                }
            }
            Column(
                Modifier
                    .padding(start = if (row.initials != null || row.icon != null) 12.dp else 0.dp)
                    .weight(1f),
            ) {
                Text(row.title, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                if (row.subtitle.isNotBlank()) {
                    Text(
                        row.subtitle,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 12.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
            if (row.badge != null) {
                Text(
                    row.badge,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier
                        .padding(start = 8.dp)
                        .background(MaterialTheme.colorScheme.primaryContainer, MaterialTheme.shapes.extraSmall)
                        .padding(horizontal = 8.dp, vertical = 4.dp),
                )
            }
        }
        if (row.detail.isNotBlank()) {
            Text(
                row.detail,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                fontSize = 12.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.padding(top = 10.dp),
            )
        }
    }
}

@Composable
private fun SettingsScreen(store: PopStore, platform: PopPlatformServices) {
    val light = store.state.theme == PopThemeMode.Light
    var showDeleteConfirmation by remember { mutableStateOf(false) }
    var deleting by remember { mutableStateOf(false) }
    var deletionError by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(18.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            PopCard {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(if (light) Icons.Rounded.LightMode else Icons.Rounded.DarkMode, null, tint = PopBlue)
                    Column(Modifier.padding(horizontal = 12.dp).weight(1f)) {
                        Text("Tema claro", fontWeight = FontWeight.Bold)
                        Text("No tema branco, a marca usa letras pretas.", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                    }
                    Switch(checked = light, onCheckedChange = { store.setTheme(if (it) PopThemeMode.Light else PopThemeMode.Dark) })
                }
            }
        }
        item { MoreItem(Icons.Rounded.Email, "Falar com o suporte", "contato@poporganize.com", platform::openSupportEmail) }
        item {
            MoreItem(Icons.Rounded.ListAlt, "Termos de Uso", "Leia os termos do serviço") {
                platform.openExternalUrl("https://app.poporganize.com.br/termos")
            }
        }
        item {
            MoreItem(Icons.Rounded.Settings, "Política de Privacidade", "Como tratamos seus dados") {
                platform.openExternalUrl("https://app.poporganize.com.br/privacidade")
            }
        }
        if (!store.state.apiToken.isNullOrBlank()) item {
            OutlinedButton(onClick = { showDeleteConfirmation = true }, modifier = Modifier.fillMaxWidth()) {
                Icon(Icons.Rounded.DeleteOutline, null)
                Text("Excluir minha conta", modifier = Modifier.padding(start = 8.dp))
            }
        }
        item {
            OutlinedButton(onClick = store::signOut, modifier = Modifier.fillMaxWidth()) { Text("Sair da conta") }
        }
        // Havia aqui uma linha permanente com `store.message` -- o ultimo retorno de servidor, cru.
        // Em 27/08 ela estava exibindo **"Lista de tarefas invalida."** logo abaixo de "Sair da
        // conta", parada, sem contexto: parecia defeito da tela de Configuracoes quando na verdade
        // era a sincronizacao de tarefas sendo recusada por um schema do servidor.
        //
        // Retirada, e nada se perde: o mesmo `store.message` ja aparece no snackbar do Scaffold
        // (ver o LaunchedEffect la em cima), que e passageiro e aparece na hora do evento -- que e
        // como recado de servidor deve se comportar. Mensagem de estado permanente pede um estado
        // permanente atras dela, e nao existe um.
    }

    if (showDeleteConfirmation) {
        AlertDialog(
            onDismissRequest = { if (!deleting) showDeleteConfirmation = false },
            title = { Text("Excluir conta permanentemente?") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Seu espaço pessoal, sessões e dados associados serão removidos. Esta ação não pode ser desfeita.")
                    deletionError?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                }
            },
            dismissButton = {
                TextButton(enabled = !deleting, onClick = { showDeleteConfirmation = false }) { Text("Cancelar") }
            },
            confirmButton = {
                TextButton(
                    enabled = !deleting,
                    onClick = {
                        deleting = true
                        deletionError = null
                        scope.launch {
                            deletionError = store.deleteAccount()
                            deleting = false
                            if (deletionError == null) showDeleteConfirmation = false
                        }
                    },
                ) { Text(if (deleting) "Excluindo..." else "Excluir conta") }
            },
        )
    }
}

// FlowRow no lugar de Row nas fileiras de opcao. Nao e ajuste de estetica: Row simples nao quebra
// linha nem rola, entao o que nao coubesse na largura era CORTADO e ficava inalcancavel. Com cinco
// valores em RecurrenceKind, so tres apareciam -- nao havia como criar tarefa mensal nem anual pelo
// iPhone. O mesmo valia para "Grupo" em Atribuir para. Encontrado abrindo o dialogo na previa.
@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
private fun TaskEditorDialog(store: PopStore, onDismiss: () -> Unit) {
    var title by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var dueDate by remember { mutableStateOf(todayIso()) }
    var dueTime by remember { mutableStateOf("") }
    var priority by remember { mutableStateOf(Priority.Medium) }
    var assignmentKind by remember { mutableStateOf(AssignmentKind.None) }
    var assignment by remember { mutableStateOf(AssignmentTarget()) }
    var responsaveis by remember { mutableStateOf(emptyList<String>()) }
    var checklistText by remember { mutableStateOf("") }
    var recurrence by remember { mutableStateOf(RecurrenceKind.None) }
    // Mesma armadilha do rememberMoveTargets: `selectedCompany` sobrevive a troca para o Meu
    // Espaco. O dialogo "Nova tarefa" abria no espaco pessoal com "Atribuir para" listando as
    // pessoas e os setores da empresa -- e criar assim mandaria o id de alguem de outro
    // espaco na carga. Encontrado em aparelho em 27/08.
    val company = store.selectedCompany.takeIf { store.state.workspace == WorkspaceKind.Company }
    val assignmentOptions = when (assignmentKind) {
        AssignmentKind.None -> emptyList()
        AssignmentKind.Person -> company?.activeMembers.orEmpty().map { AssignmentTarget(assignmentKind, it.id, it.name) }
        AssignmentKind.Sector -> company?.sectors.orEmpty().sortedBy { it.name.lowercase() }
            .map { AssignmentTarget(assignmentKind, it.id, it.name) }
        AssignmentKind.Group -> company?.groups.orEmpty().sortedBy { it.name.lowercase() }
            .map { AssignmentTarget(assignmentKind, it.id, it.name) }
    }
    // Quem pode responder, DENTRO do que ja foi escolhido.
    //
    // So faz sentido para setor e grupo: com alvo Pessoa a propria pessoa ja e a responsavel (o
    // `toApiTask` resolve isso), e "Sem responsável" -- que no espaco de empresa vira alvo
    // `company` -- nao delimita ninguem, entao a lista seria a empresa inteira e nao ajudaria a
    // escolher. Sem um alvo especifico escolhido, tambem nao ha de onde recortar.
    val candidatos = when {
        assignment.id == null -> emptyList()
        assignmentKind == AssignmentKind.Sector ->
            company?.activeMembers.orEmpty().filter { it.sectorId == assignment.id }
        assignmentKind == AssignmentKind.Group ->
            company?.groups.orEmpty().firstOrNull { it.id == assignment.id }
                ?.memberIds.orEmpty()
                .mapNotNull { id -> company?.activeMembers.orEmpty().firstOrNull { it.id == id } }
        else -> emptyList()
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Nova tarefa") },
        text = {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                item { OutlinedTextField(title, { title = it }, label = { Text("Título") }, modifier = Modifier.fillMaxWidth()) }
                item { OutlinedTextField(description, { description = it }, label = { Text("Descrição") }, minLines = 2, modifier = Modifier.fillMaxWidth()) }
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(dueDate, { dueDate = it }, label = { Text("Data AAAA-MM-DD") }, modifier = Modifier.weight(1f))
                        OutlinedTextField(
                            dueTime,
                            { dueTime = it },
                            label = { Text("Hora") },
                            // Nao valida formato -- o servidor tambem nao --, mas tira do caminho o
                            // teclado de texto e torna "9:00" bem menos provavel que "09:00".
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.weight(.65f),
                        )
                    }
                }
                item {
                    Text("Prioridade", fontWeight = FontWeight.SemiBold)
                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        Priority.entries.forEach {
                            FilterChip(selected = priority == it, onClick = { priority = it }, label = { Text(it.label, fontSize = 11.sp) })
                        }
                    }
                }
                item {
                    Text("Recorrência", fontWeight = FontWeight.SemiBold)
                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        RecurrenceKind.entries.forEach {
                            FilterChip(
                                selected = recurrence == it,
                                onClick = { recurrence = it },
                                label = { Text(it.label, fontSize = 10.sp) },
                            )
                        }
                    }
                }
                if (store.isCurrentUserAdmin) {
                    item {
                        OutlinedTextField(
                            value = checklistText,
                            onValueChange = { checklistText = it },
                            label = { Text("Checklist (um item por linha)") },
                            leadingIcon = { Icon(Icons.Rounded.ListAlt, null) },
                            minLines = 4,
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }
                }
                if (company != null) {
                    item {
                        Text("Atribuir para", fontWeight = FontWeight.SemiBold)
                        FlowRow(
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp),
                        ) {
                            AssignmentKind.entries.forEach {
                                FilterChip(
                                    selected = assignmentKind == it,
                                    // Zerar o responsavel junto e obrigatorio: a lista de
                                    // candidatos e recortada pelo alvo, e um nome que sobrou do
                                    // alvo anterior seria enviado sem aparecer na tela.
                                    onClick = {
                                        assignmentKind = it
                                        assignment = AssignmentTarget()
                                        responsaveis = emptyList()
                                    },
                                    label = { Text(it.label, fontSize = 10.sp) },
                                )
                            }
                        }
                    }
                    if (assignmentOptions.isNotEmpty()) {
                        item {
                            Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
                                assignmentOptions.forEach { option ->
                                    FilterChip(
                                        selected = assignment.id == option.id,
                                        // Zerar o responsavel junto: a lista de candidatos e
                                        // recortada pelo alvo, e um nome que sobrou do setor
                                        // anterior seria enviado sem aparecer na tela.
                                        onClick = {
                                            assignment = option
                                            responsaveis = emptyList()
                                        },
                                        label = { Text(option.label) },
                                    )
                                }
                            }
                        }
                    }
                    // Vem DEPOIS da escolha do alvo, e nao antes, porque e recortado por ela: sem
                    // um setor escolhido nao ha de onde tirar candidato, e a lista nem aparece.
                    if (candidatos.isNotEmpty()) {
                        item {
                            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Text("Responsável (opcional)", fontWeight = FontWeight.SemiBold)
                                Text(
                                    // Dizer isto na tela evita a duvida que o proprio recurso
                                    // cria: escolher uma pessoa aqui NAO tira a tarefa de onde
                                    // ela esta.
                                    "A tarefa continua aparecendo em ${assignment.label}.",
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    fontSize = 11.sp,
                                )
                                FlowRow(
                                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                                    verticalArrangement = Arrangement.spacedBy(6.dp),
                                ) {
                                    candidatos.forEach { pessoa ->
                                        val escolhida = pessoa.name in responsaveis
                                        FilterChip(
                                            selected = escolhida,
                                            // O teto de tres e do SERVIDOR, nao gosto meu: com
                                            // quatro nomes o schema reprova a carga inteira.
                                            // Parar de aceitar no terceiro e melhor que deixar
                                            // escolher e perder na sincronizacao, calado.
                                            enabled = escolhida || responsaveis.size < 3,
                                            onClick = {
                                                responsaveis = if (escolhida) {
                                                    responsaveis - pessoa.name
                                                } else {
                                                    responsaveis + pessoa.name
                                                }
                                            },
                                            label = { Text(pessoa.name, fontSize = 10.sp) },
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                // O painel web exige 3 caracteres no titulo (pop-organize.functions.ts:88). O
                // endpoint movel nao valida, entao sem isto o iPhone criaria uma tarefa que o
                // site recusaria — e que quebraria ao ser editada por la.
                enabled = title.hasAtLeast(3),
                onClick = {
                    store.addTask(
                        title = title,
                        description = description,
                        dueDate = dueDate,
                        dueTime = dueTime,
                        priority = priority,
                        assignment = assignment,
                        checklistTitles = checklistText.lines(),
                        recurrence = recurrence,
                        responsaveis = responsaveis,
                    )
                    onDismiss()
                },
            ) { Text("Criar tarefa") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancelar") } },
    )
}

@Composable
private fun CompanyEditorDialog(store: PopStore, onDismiss: () -> Unit) {
    var name by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Criar minha empresa") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(
                    name,
                    { name = it },
                    label = { Text("Nome da empresa") },
                    singleLine = true,
                    // createCompany nao exige descricao, so o nome com 2 caracteres.
                    isError = name.isNotEmpty() && !name.hasAtLeast(2),
                    supportingText = if (name.isNotEmpty() && !name.hasAtLeast(2)) {
                        ({ Text("Pelo menos 2 caracteres.") })
                    } else {
                        null
                    },
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    description,
                    { description = it },
                    label = { Text("Pequena descrição (opcional)") },
                    minLines = 2,
                    modifier = Modifier.fillMaxWidth(),
                )
                Text("${store.state.companies.size}/3 empresas criadas", style = MaterialTheme.typography.bodySmall)
            }
        },
        confirmButton = {
            Button(
                enabled = name.hasAtLeast(2) && store.state.companies.size < 3,
                onClick = { store.createCompany(name, description); onDismiss() },
            ) { Text("Criar") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancelar") } },
    )
}

@Composable
private fun MemberEditorDialog(store: PopStore, onDismiss: () -> Unit) {
    var name by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var role by remember { mutableStateOf("Colaborador") }
    var touched by remember { mutableStateOf(false) }
    val nameOk = name.hasAtLeast(2)
    val emailOk = isValidEmail(email)
    val roleOk = role.hasAtLeast(2)
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Cadastrar pessoa") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(
                    name,
                    { name = it },
                    label = { Text("Nome") },
                    singleLine = true,
                    isError = touched && !nameOk,
                    supportingText = if (touched && !nameOk) ({ Text("Pelo menos 2 caracteres.") }) else null,
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    email,
                    { email = it },
                    label = { Text("E-mail") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next),
                    isError = touched && !emailOk,
                    supportingText = if (touched && !emailOk) ({ Text("Informe um e-mail válido.") }) else null,
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    role,
                    { role = it },
                    label = { Text("Função") },
                    singleLine = true,
                    isError = touched && !roleOk,
                    supportingText = if (touched && !roleOk) ({ Text("Pelo menos 2 caracteres.") }) else null,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    touched = true
                    if (nameOk && emailOk && roleOk) {
                        store.addMember(name, email, role)
                        onDismiss()
                    }
                },
            ) { Text("Cadastrar") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancelar") } },
    )
}

@Composable
private fun SimpleEntityEditorDialog(
    title: String,
    onSave: (String, String) -> Unit,
    onDismiss: () -> Unit,
    // Setor e grupo exigem descricao com 3 caracteres no servidor; deixar explicito evita que um
    // reuso futuro herde a regra sem perceber.
    descriptionMinLength: Int = 3,
) {
    var name by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var touched by remember { mutableStateOf(false) }
    val nameOk = name.hasAtLeast(2)
    val descriptionOk = description.hasAtLeast(descriptionMinLength)
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(
                    name,
                    { name = it },
                    label = { Text("Nome") },
                    singleLine = true,
                    isError = touched && !nameOk,
                    supportingText = if (touched && !nameOk) ({ Text("Pelo menos 2 caracteres.") }) else null,
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    description,
                    { description = it },
                    label = { Text("Descrição") },
                    isError = touched && !descriptionOk,
                    supportingText = {
                        Text(
                            if (touched && !descriptionOk) {
                                "Pelo menos $descriptionMinLength caracteres."
                            } else {
                                "Obrigatória, mínimo de $descriptionMinLength caracteres."
                            },
                        )
                    },
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    touched = true
                    if (nameOk && descriptionOk) {
                        onSave(name, description)
                        onDismiss()
                    }
                },
            ) { Text("Salvar") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancelar") } },
    )
}

@Composable
private fun PopCard(
    modifier: Modifier = Modifier,
    containerColor: Color = MaterialTheme.colorScheme.surface,
    contentColor: Color = MaterialTheme.colorScheme.onSurface,
    content: @Composable ColumnScope.() -> Unit,
) {
    // O painel web separa cartao do fundo com --shadow-elegant. Aqui isso nao funciona: sombra
    // preta sobre fundo quase preto nao aparece. A definicao vem de um fio de contorno, que e como
    // o proprio iOS separa cartao do fundo no escuro.
    //
    // Aplicado so quando o cartao usa a cor de superficie padrao -- cartao colorido (tarefa urgente,
    // em vermelho) ja se separa sozinho, e um contorno ali so sujaria a borda.
    val isDefaultSurface = containerColor == MaterialTheme.colorScheme.surface
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = containerColor, contentColor = contentColor),
        border = if (isDefaultSurface) BorderStroke(1.dp, MaterialTheme.colorScheme.outline) else null,
    ) {
        Column(Modifier.fillMaxWidth().padding(16.dp), content = content)
    }
}

@Composable
private fun SectionTitle(title: String) {
    // Era negrito 16sp, do mesmo tamanho e peso do conteudo que anunciava -- entao nao anunciava
    // nada. Rotulo pequeno, apagado e com letra aberta separa as secoes por hierarquia em vez de
    // por volume, e e a convencao de lista agrupada do iOS em vez da de cabecalho do Material.
    Text(
        title,
        style = MaterialTheme.typography.labelMedium,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        fontWeight = FontWeight.SemiBold,
        modifier = Modifier.padding(start = 4.dp, top = 8.dp),
    )
}

@Composable
private fun EmptyState(title: String, detail: String) {
    PopCard {
        Text(title, fontWeight = FontWeight.Bold)
        Text(detail, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
    }
}

/**
 * Espelham a validacao do servidor para que a interface recuse antes de gastar uma ida a rede.
 * requiredText() em mobile-api.server.ts:596 compara depois de trim, e o minimo padrao e 2;
 * descricao de setor e de grupo exige 3. A expressao e a mesma de mobile-api.server.ts:809.
 */
internal fun String.hasAtLeast(minimum: Int) = trim().length >= minimum

private val emailPattern = Regex("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")

internal fun isValidEmail(value: String) = emailPattern.matches(value.trim())

private fun priorityColor(priority: Priority): Color = when (priority) {
    Priority.Low -> PopGreen
    Priority.Medium -> Color(0xFFFFB000)
    Priority.High -> PopOrange
    Priority.Urgent -> PopRed
}

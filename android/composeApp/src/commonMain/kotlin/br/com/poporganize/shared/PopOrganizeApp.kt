package br.com.poporganize.shared

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.tween
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.border
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
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
import androidx.compose.material.icons.rounded.ExpandLess
import androidx.compose.material.icons.rounded.ExpandMore
import androidx.compose.material.icons.rounded.Groups
import androidx.compose.material.icons.rounded.Home
import androidx.compose.material.icons.rounded.LightMode
import androidx.compose.material.icons.rounded.ListAlt
import androidx.compose.material.icons.rounded.MoreHoriz
import androidx.compose.material.icons.rounded.MoreVert
import androidx.compose.material.icons.rounded.NotificationsActive
import androidx.compose.material.icons.rounded.Person
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
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.datetime.DatePeriod
import kotlinx.datetime.LocalDate
import kotlinx.datetime.plus

@Composable
fun PopOrganizeApp(platform: PopPlatformServices) {
    val store = remember(platform) { PopStore(platform) }
    val state = store.state

    SideEffect { platform.applyTheme(state.theme == PopThemeMode.Light) }

    LaunchedEffect(platform) { platform.observeForeground { store.refreshNow() } }

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
    }
}

@Composable
private fun PopLogo(modifier: Modifier = Modifier) {
    Row(modifier = modifier, verticalAlignment = Alignment.CenterVertically) {
        Text(
            text = "P",
            color = MaterialTheme.colorScheme.onBackground,
            fontSize = 24.sp,
            fontWeight = FontWeight.ExtraBold,
        )
        Box(Modifier.padding(horizontal = 1.dp).size(17.dp).background(PopBlue, CircleShape))
        Text(
            text = "p Organize",
            color = MaterialTheme.colorScheme.onBackground,
            fontSize = 24.sp,
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
        modifier = Modifier.fillMaxSize().windowInsetsPadding(WindowInsets.safeDrawing).padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.SpaceBetween,
    ) {
        PopLogo()
        AnimatedContent(targetState = page) { index ->
            val item = pages[index]
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Box(
                    modifier = Modifier.size(218.dp).background(MaterialTheme.colorScheme.surface, RoundedCornerShape(52.dp)),
                    contentAlignment = Alignment.Center,
                ) {
                    Box(
                        modifier = Modifier.size(126.dp).background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(34.dp)),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(item.third, null, tint = PopBlue, modifier = Modifier.size(58.dp))
                    }
                }
                Spacer(Modifier.height(34.dp))
                Text(item.first, fontSize = 30.sp, fontWeight = FontWeight.ExtraBold, textAlign = TextAlign.Center)
                Spacer(Modifier.height(12.dp))
                Text(item.second, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
            }
        }
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Row(horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                pages.indices.forEach { index ->
                    Box(
                        Modifier.size(if (index == page) 22.dp else 8.dp, 8.dp)
                            .background(if (index == page) PopBlue else MaterialTheme.colorScheme.outline, CircleShape),
                    )
                }
            }
            Spacer(Modifier.height(20.dp))
            Button(
                modifier = Modifier.fillMaxWidth().height(54.dp),
                onClick = { if (page < pages.lastIndex) page++ else onFinish() },
            ) {
                Text(if (page == pages.lastIndex) "Começar" else "Continuar", fontWeight = FontWeight.Bold)
            }
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

        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            AnimatedContent(targetState = stage, label = "loginTitle") { current ->
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        when (current) {
                            LoginStage.Choose -> "Comece por aqui"
                            LoginStage.Email -> "Entre com seu e-mail"
                            LoginStage.Code -> "Verifique seu e-mail"
                        },
                        fontSize = 30.sp,
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
        Spacer(Modifier.height(10.dp))
        Text(
            feedbackError ?: feedbackInfo.orEmpty(),
            color = if (feedbackError != null) {
                MaterialTheme.colorScheme.error
            } else {
                MaterialTheme.colorScheme.onSurfaceVariant
            },
            fontSize = 12.sp,
            textAlign = TextAlign.Center,
            minLines = 2,
            modifier = Modifier.fillMaxWidth(),
        )
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

    Scaffold(
        modifier = Modifier.fillMaxSize().windowInsetsPadding(WindowInsets.safeDrawing),
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
            NavigationBar {
                MainTab.entries.forEach { item ->
                    NavigationBarItem(
                        selected = tab == item,
                        onClick = { tab = item; if (item != MainTab.More) morePage = MorePage.Menu },
                        icon = { Icon(item.icon, item.label) },
                        label = { Text(item.label) },
                    )
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
                MainTab.Dashboard -> Refreshable(store) { DashboardScreen(store) }
                MainTab.Tasks -> Refreshable(store) { TasksScreen(store) }
                MainTab.Calendar -> Refreshable(store) { CalendarScreen(store) }
                MainTab.More -> when (page) {
                    MorePage.Menu -> MoreScreen(
                        store = store,
                        onPage = { morePage = it },
                    )
                    MorePage.Team -> TeamScreen(store)
                    MorePage.Sectors -> SectorsScreen(store)
                    MorePage.Groups -> GroupsScreen(store)
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
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold,
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
            PopLogo()
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
private fun DashboardScreen(store: PopStore) {
    val tasks = store.visibleTasks
    val pending = tasks.count { !it.completed }
    val completed = tasks.size - pending
    val userName = store.state.currentUser?.firstName ?: "você"

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(18.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            Text("${greetingForCurrentTime()}, $userName", fontSize = 27.sp, fontWeight = FontWeight.ExtraBold)
            Text("Aqui está a visão geral do seu dia.", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                MetricCard("Pendentes", pending.toString(), PopOrange, Modifier.weight(1f))
                MetricCard("Concluídas", completed.toString(), PopGreen, Modifier.weight(1f))
                MetricCard("Total", tasks.size.toString(), PopBlue, Modifier.weight(1f))
            }
        }
        item {
            SectionTitle("Progresso")
            PopCard {
                val progress = if (tasks.isEmpty()) 0f else completed.toFloat() / tasks.size
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Atividades concluídas", fontWeight = FontWeight.SemiBold)
                    Text("${(progress * 100).toInt()}%", color = PopBlue, fontWeight = FontWeight.Bold)
                }
                Spacer(Modifier.height(12.dp))
                LinearProgressIndicator(progress = { progress }, modifier = Modifier.fillMaxWidth().height(8.dp))
            }
        }
        item { SectionTitle("Próximas tarefas") }
        if (tasks.none { !it.completed }) {
            item { EmptyState("Nenhuma tarefa pendente", "Crie uma atividade para organizar seu dia.") }
        } else {
            items(tasks.filterNot { it.completed }.take(3), key = { it.id }) { task ->
                CompactTaskRow(task)
            }
        }
    }
}

@Composable
private fun MetricCard(label: String, value: String, color: Color, modifier: Modifier = Modifier) {
    Card(modifier = modifier, colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
        Column(Modifier.padding(14.dp)) {
            Text(value, color = color, fontSize = 26.sp, fontWeight = FontWeight.ExtraBold)
            Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp, maxLines = 1)
        }
    }
}

@Composable
private fun TasksScreen(store: PopStore) {
    val tasks = store.visibleTasks
    var removingId by remember { mutableStateOf<String?>(null) }
    var selectedTask by remember { mutableStateOf<PopTask?>(null) }
    var pendingDeleteTask by remember { mutableStateOf<PopTask?>(null) }
    // Guardar os expandidos, e nao os recolhidos, para que os setores comecem fechados e um setor
    // criado depois tambem entre fechado, sem precisar ser descoberto e adicionado ao conjunto.
    var expandedSectors by remember { mutableStateOf(emptySet<String>()) }
    val scope = rememberCoroutineScope()
    // Pessoas entram junto de setores e grupos: AssignmentKind.Person ja existia e ja e convertido
    // nos dois sentidos (toApiTask/toPopTask), mas nunca tinha sido oferecido na interface.
    val moveTargets = rememberMoveTargets(store)
    // toSortedMap() vem de java.util e nao existe no commonMain; a lista de pares ordenada
    // preserva a mesma ordenacao natural por nome de setor.
    val groupedTasks = remember(tasks) {
        tasks.groupBy {
            if (it.assignment.kind == AssignmentKind.Sector) it.assignment.label else "Sem setor"
        }.toList().sortedBy { it.first }
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
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 18.dp, top = 18.dp, end = 18.dp, bottom = 92.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        item {
            Text("Tarefas", fontSize = 27.sp, fontWeight = FontWeight.ExtraBold)
            Text("${tasks.count { !it.completed }} pendentes", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        if (tasks.isEmpty()) {
            item { EmptyState("Seu espaço está livre", "Toque em + para criar a primeira tarefa.") }
        }
        groupedTasks.forEach { (sector, sectorTasks) ->
            item(key = "sector-$sector") {
                val expanded = sector in expandedSectors
                val pending = sectorTasks.count { !it.completed }
                Surface(
                    modifier = Modifier.fillMaxWidth().clickable {
                        expandedSectors = if (expanded) {
                            expandedSectors - sector
                        } else {
                            expandedSectors + sector
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
                            // Com o setor fechado o que importa e quanto falta, nao o total.
                            if (pending == 0) "tudo concluído" else "$pending pendentes",
                            color = if (pending == 0) PopGreen else MaterialTheme.colorScheme.onSurfaceVariant,
                            fontSize = 12.sp,
                        )
                        Icon(
                            if (expanded) Icons.Rounded.ExpandLess else Icons.Rounded.ExpandMore,
                            if (expanded) "Recolher $sector" else "Expandir $sector",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
            if (sector in expandedSectors) {
                items(sectorTasks, key = { it.id }) { task ->
                    AnimatedVisibility(
                        visible = removingId != task.id,
                        enter = fadeIn() + expandVertically(),
                        exit = fadeOut(tween(220)) + shrinkVertically(tween(220)),
                    ) {
                        TaskRow(
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
            onDeleteOccurrence = {
                deleteWithAnimation(task) { store.deleteRecurringOccurrence(task.id) }
            },
            onDeleteAll = {
                deleteWithAnimation(task) {
                    if (task.recurrence == RecurrenceKind.None) {
                        store.deleteTask(task.id)
                    } else {
                        store.deleteTaskSeries(task.id)
                    }
                }
            },
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
    val company = store.selectedCompany
    // Reatribuir exige a permissao tasks.assign, resolvida pelo servidor.
    val canAssign = store.permissions.canAssignTasks
    return remember(company, canAssign) {
        if (!canAssign) {
            emptyList()
        } else {
            buildList {
                company?.members.orEmpty().forEach {
                    add(AssignmentTarget(AssignmentKind.Person, it.id, it.name))
                }
                company?.sectors.orEmpty().forEach {
                    add(AssignmentTarget(AssignmentKind.Sector, it.id, it.name))
                }
                company?.groups.orEmpty().forEach {
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
                Text(
                    listOf(task.dueDate, task.dueTime).filter { it.isNotBlank() }.joinToString(" • "),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                if (task.assignment.label != "Sem responsável") {
                    Text(
                        "Responsável: ${task.assignment.label}",
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
 * Confirmacao de exclusao. Numa tarefa recorrente oferece excluir so aquela data ou a serie
 * inteira; numa tarefa comum, so confirma.
 *
 * Recebe as duas acoes prontas em vez do store porque quem chama e que sabe animar a saida da
 * linha antes de a tarefa sumir de fato.
 */
@Composable
private fun TaskDeleteDialog(
    task: PopTask,
    onDismiss: () -> Unit,
    onDeleteOccurrence: () -> Unit,
    onDeleteAll: () -> Unit,
) {
    val isRecurring = task.recurrence != RecurrenceKind.None
    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                if (isRecurring) "Excluir atividade recorrente" else "Excluir atividade",
                fontWeight = FontWeight.ExtraBold,
            )
        },
        text = {
            Text(
                if (isRecurring) {
                    "Deseja excluir somente esta data ou toda a recorrência?"
                } else {
                    "Confirma a exclusão de “${task.title}”?"
                },
            )
        },
        confirmButton = {
            Column(horizontalAlignment = Alignment.End) {
                if (isRecurring) {
                    TextButton(onClick = onDeleteOccurrence) { Text("Somente esta data") }
                }
                Button(
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                    onClick = onDeleteAll,
                ) {
                    Text(if (isRecurring) "Toda a recorrência" else "Excluir")
                }
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancelar") }
        },
    )
}

@Composable
private fun TaskRow(
    task: PopTask,
    moveTargets: List<AssignmentTarget>,
    onOpen: () -> Unit,
    onToggle: () -> Unit,
    onMove: (AssignmentTarget) -> Unit,
    onDelete: () -> Unit,
) {
    var showMenu by remember { mutableStateOf(false) }
    val isUrgent = task.priority == Priority.Urgent && !task.completed
    val isOverdue = !task.completed && task.dueDate < todayIso()
    PopCard(
        modifier = Modifier.animateContentSize().clickable(onClick = onOpen),
        containerColor = if (isUrgent) PopRed else MaterialTheme.colorScheme.surface,
        contentColor = if (isUrgent) Color.White else MaterialTheme.colorScheme.onSurface,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onToggle) {
                Icon(
                    if (task.completed) Icons.Rounded.CheckCircle else Icons.Rounded.Check,
                    if (task.completed) "Reabrir" else "Concluir",
                    tint = when {
                        task.completed -> PopGreen
                        isUrgent -> Color.White
                        else -> priorityColor(task.priority)
                    },
                )
            }
            Column(Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        task.title,
                        fontWeight = FontWeight.Bold,
                        color = when {
                            task.completed -> MaterialTheme.colorScheme.onSurfaceVariant
                            isUrgent -> Color.White
                            else -> MaterialTheme.colorScheme.onSurface
                        },
                        modifier = Modifier.weight(1f),
                    )
                    if (isUrgent) {
                        Text("URGENTE", color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.ExtraBold)
                    }
                }
                if (task.description.isNotBlank()) {
                    Text(
                        task.description,
                        color = if (isUrgent) Color.White.copy(alpha = .82f) else MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 12.sp,
                        maxLines = 2,
                    )
                }
                Spacer(Modifier.height(5.dp))
                val dateTint = when {
                    isUrgent -> Color.White.copy(alpha = .9f)
                    isOverdue -> PopRed
                    else -> priorityColor(task.priority)
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        // Era a data ISO crua: "2026-08-20 • 09:00". Ninguem le uma agenda assim.
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
                    }
                }
            }
            Box {
                IconButton(onClick = { showMenu = true }) {
                    Icon(
                        Icons.Rounded.MoreVert,
                        "Mais opções",
                        tint = if (isUrgent) Color.White else MaterialTheme.colorScheme.onSurfaceVariant,
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
                            text = {
                                Text(
                                    when (target.kind) {
                                        AssignmentKind.Person -> target.label
                                        AssignmentKind.Group -> "Grupo: ${target.label}"
                                        AssignmentKind.Sector -> "Setor: ${target.label}"
                                        AssignmentKind.None -> target.label
                                    },
                                )
                            },
                            leadingIcon = {
                                Icon(
                                    when (target.kind) {
                                        AssignmentKind.Person -> Icons.Rounded.Person
                                        AssignmentKind.Group -> Icons.Rounded.Groups
                                        AssignmentKind.Sector -> Icons.Rounded.Apartment
                                        AssignmentKind.None -> Icons.Rounded.MoreHoriz
                                    },
                                    null,
                                )
                            },
                            trailingIcon = {
                                if (current) Icon(Icons.Rounded.Check, null, tint = PopBlue)
                            },
                            onClick = {
                                if (!current) onMove(target)
                                showMenu = false
                            },
                        )
                    }
                    DropdownMenuItem(
                        text = { Text("Excluir atividade", color = MaterialTheme.colorScheme.error) },
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

@Composable
private fun CompactTaskRow(task: PopTask) {
    val isUrgent = task.priority == Priority.Urgent && !task.completed
    val isOverdue = !task.completed && task.dueDate < todayIso()
    PopCard(
        containerColor = if (isUrgent) PopRed else MaterialTheme.colorScheme.surface,
        contentColor = if (isUrgent) Color.White else MaterialTheme.colorScheme.onSurface,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(9.dp).background(if (isUrgent) Color.White else priorityColor(task.priority), CircleShape))
            Spacer(Modifier.size(11.dp))
            Column(Modifier.weight(1f)) {
                Text(task.title, fontWeight = FontWeight.SemiBold)
                Text(
                    taskDateLabel(task.dueDate, task.dueTime, todayDate()),
                    color = when {
                        isUrgent -> Color.White.copy(alpha = .9f)
                        isOverdue -> PopRed
                        else -> MaterialTheme.colorScheme.onSurfaceVariant
                    },
                    fontSize = 11.sp,
                )
            }
            Text(
                task.priority.label,
                color = if (isUrgent) Color.White else priorityColor(task.priority),
                fontSize = 10.sp,
                fontWeight = if (isUrgent) FontWeight.ExtraBold else FontWeight.SemiBold,
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
    data class Entry(val task: PopTask) : CalendarRow
}

private fun calendarRowKey(row: CalendarRow): String = when (row) {
    is CalendarRow.PastHeader -> "antes-de-hoje"
    is CalendarRow.DayHeader -> "dia-${row.date}"
    // A data entra na chave porque "Agenda do dia" se repete a cada dia, e chave repetida derruba
    // a LazyColumn em tempo de execucao, nao de compilacao.
    is CalendarRow.Section -> "secao-${row.date}-${row.label}"
    is CalendarRow.Entry -> "tarefa-${row.task.id}"
}

/**
 * Dentro de um dia: pendentes antes de concluidas, com horario antes de sem horario, e a
 * prioridade decide o resto. E a mesma cascata que o Android usa.
 */
private val dayTaskOrder = compareBy<PopTask>(
    { it.completed },
    { it.dueTime.isBlank() },
    { it.dueTime },
    { -it.priority.ordinal },
)

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
    val dated = remember(tasks) {
        tasks.mapNotNull { task -> parseIsoDate(task.dueDate)?.let { date -> date to task } }
    }
    val undatedCount = tasks.size - dated.size
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

    val rows = remember(past, overdueCount, upcoming, pastExpanded, today) {
        buildList<CalendarRow> {
            if (past.isNotEmpty()) {
                add(CalendarRow.PastHeader(overdueCount = overdueCount, total = past.size))
                if (pastExpanded) past.forEach { add(CalendarRow.Entry(it)) }
            }
            upcoming.forEach { (date, dayTasks) ->
                add(CalendarRow.DayHeader(date))
                val sorted = dayTasks.sortedWith(dayTaskOrder)
                val timed = sorted.filter { it.dueTime.isNotBlank() }
                val untimed = sorted.filter { it.dueTime.isBlank() }
                // Os dois rotulos so aparecem quando existem os dois grupos: num dia em que tudo
                // tem horario, "Agenda do dia" sozinho nao separa coisa nenhuma.
                if (timed.isNotEmpty() && untimed.isNotEmpty()) {
                    add(CalendarRow.Section(date, "Agenda do dia"))
                    timed.forEach { add(CalendarRow.Entry(it)) }
                    add(CalendarRow.Section(date, "Sem horário definido"))
                    untimed.forEach { add(CalendarRow.Entry(it)) }
                } else {
                    sorted.forEach { add(CalendarRow.Entry(it)) }
                }
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
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text("Calendário", fontSize = 27.sp, fontWeight = FontWeight.ExtraBold)
                        Text(
                            "${dated.count { !it.second.completed }} com prazo em aberto",
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
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
                EmptyState("Nenhum prazo", "As tarefas com data aparecerão aqui.")
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

                is CalendarRow.Entry -> AnimatedVisibility(
                    visible = removingId != row.task.id,
                    enter = fadeIn() + expandVertically(),
                    exit = fadeOut(tween(220)) + shrinkVertically(tween(220)),
                ) {
                    TaskRow(
                        task = row.task,
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
            onDeleteOccurrence = {
                deleteWithAnimation(task) { store.deleteRecurringOccurrence(task.id) }
            },
            onDeleteAll = {
                deleteWithAnimation(task) {
                    if (task.recurrence == RecurrenceKind.None) {
                        store.deleteTask(task.id)
                    } else {
                        store.deleteTaskSeries(task.id)
                    }
                }
            },
        )
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
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(18.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        item {
            Text("Mais", fontSize = 27.sp, fontWeight = FontWeight.ExtraBold)
            Text("Conta e preferências", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        item {
            val company = store.selectedCompany
            val inCompany = store.state.workspace == WorkspaceKind.Company && company != null
            val pending = store.visibleTasks.count { !it.completed }
            PopCard {
                Text(if (inCompany) company!!.name else "Meu espaço", fontWeight = FontWeight.Bold)
                Text(
                    if (pending == 1) "1 atividade pendente" else "$pending atividades pendentes",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontSize = 12.sp,
                )
            }
        }
        item { SectionTitle("Aplicativo") }
        item { MoreItem(Icons.Rounded.Settings, "Configurações", "Tema, conta e suporte") { onPage(MorePage.Settings) } }
        if (
            store.state.workspace == WorkspaceKind.Company &&
            store.selectedCompany != null
        ) {
            val company = store.selectedCompany!!
            item { SectionTitle("Empresa") }
            item {
                MoreItem(
                    Icons.Rounded.Person,
                    "Equipe",
                    "${company.members.size} pessoas cadastradas",
                ) { onPage(MorePage.Team) }
            }
            item {
                MoreItem(
                    Icons.Rounded.Apartment,
                    "Setores",
                    "${company.sectors.size} setores",
                ) { onPage(MorePage.Sectors) }
            }
            item {
                MoreItem(
                    Icons.Rounded.Groups,
                    "Grupos",
                    "${company.groups.size} grupos",
                ) { onPage(MorePage.Groups) }
            }
        }
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
    EntityListScreen(
        title = "Pessoas cadastradas",
        emptyTitle = "Nenhum colaborador",
        emptyDetail = when {
            !store.permissions.canManageEmployees -> "Somente quem administra a equipe pode convidar."
            !hasSector -> "Cadastre um setor antes de convidar alguém."
            else -> null
        },
        items = company?.members.orEmpty().map { it.name to "${it.role} • ${it.email}" },
        onAdd = if (canAdd) ({ showEditor = true }) else null,
    )
    if (showEditor) MemberEditorDialog(store) { showEditor = false }
}

@Composable
private fun SectorsScreen(store: PopStore) {
    val company = store.selectedCompany ?: store.state.companies.firstOrNull()
    var showEditor by remember { mutableStateOf(false) }
    val canAdd = store.permissions.canManageDepartments
    EntityListScreen(
        title = "Estrutura por setores",
        emptyTitle = "Nenhum setor",
        emptyDetail = if (canAdd) {
            "Cadastre o primeiro setor para poder convidar pessoas."
        } else {
            "Somente quem administra a empresa pode criar setores."
        },
        items = company?.sectors.orEmpty().map { it.name to it.description },
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
    EntityListScreen(
        title = "Grupos de trabalho",
        emptyTitle = "Nenhum grupo",
        emptyDetail = if (canAdd) null else "Somente quem administra a empresa pode criar grupos.",
        items = company?.groups.orEmpty().map { it.name to it.description },
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

@Composable
private fun EntityListScreen(
    title: String,
    emptyTitle: String,
    items: List<Pair<String, String>>,
    onAdd: (() -> Unit)? = null,
    emptyDetail: String? = null,
) {
    // Sem onAdd a tela e somente leitura e o vazio precisa mandar o usuario para o painel web.
    val detail = emptyDetail
        ?: if (onAdd != null) "Toque em + para cadastrar." else "Cadastre pela versão web."
    Box(Modifier.fillMaxSize()) {
        LazyColumn(
            contentPadding = PaddingValues(18.dp, 14.dp, 18.dp, 88.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            item { Text(title, color = MaterialTheme.colorScheme.onSurfaceVariant) }
            if (items.isEmpty()) item { EmptyState(emptyTitle, detail) }
            items(items) { item ->
                PopCard {
                    Text(item.first, fontWeight = FontWeight.Bold)
                    if (item.second.isNotBlank()) Text(item.second, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                }
            }
        }
        if (onAdd != null) {
            FloatingActionButton(onClick = onAdd, modifier = Modifier.align(Alignment.BottomEnd).padding(18.dp)) {
                Icon(Icons.Rounded.Add, "Adicionar")
            }
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
        item { Text(store.message, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth()) }
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TaskEditorDialog(store: PopStore, onDismiss: () -> Unit) {
    var title by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var dueDate by remember { mutableStateOf(todayIso()) }
    var dueTime by remember { mutableStateOf("") }
    var priority by remember { mutableStateOf(Priority.Medium) }
    var assignmentKind by remember { mutableStateOf(AssignmentKind.None) }
    var assignment by remember { mutableStateOf(AssignmentTarget()) }
    var checklistText by remember { mutableStateOf("") }
    var recurrence by remember { mutableStateOf(RecurrenceKind.None) }
    val company = store.selectedCompany
    val assignmentOptions = when (assignmentKind) {
        AssignmentKind.None -> emptyList()
        AssignmentKind.Person -> company?.members.orEmpty().map { AssignmentTarget(assignmentKind, it.id, it.name) }
        AssignmentKind.Sector -> company?.sectors.orEmpty().map { AssignmentTarget(assignmentKind, it.id, it.name) }
        AssignmentKind.Group -> company?.groups.orEmpty().map { AssignmentTarget(assignmentKind, it.id, it.name) }
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
                        OutlinedTextField(dueTime, { dueTime = it }, label = { Text("Hora") }, modifier = Modifier.weight(.65f))
                    }
                }
                item {
                    Text("Prioridade", fontWeight = FontWeight.SemiBold)
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Priority.entries.forEach {
                            FilterChip(selected = priority == it, onClick = { priority = it }, label = { Text(it.label, fontSize = 11.sp) })
                        }
                    }
                }
                item {
                    Text("Recorrência", fontWeight = FontWeight.SemiBold)
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
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
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            AssignmentKind.entries.forEach {
                                FilterChip(
                                    selected = assignmentKind == it,
                                    onClick = { assignmentKind = it; assignment = AssignmentTarget() },
                                    label = { Text(it.label, fontSize = 10.sp) },
                                )
                            }
                        }
                    }
                    if (assignmentOptions.isNotEmpty()) {
                        item {
                            Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
                                assignmentOptions.forEach { option ->
                                    FilterChip(selected = assignment.id == option.id, onClick = { assignment = option }, label = { Text(option.label) })
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
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = containerColor, contentColor = contentColor),
    ) {
        Column(Modifier.fillMaxWidth().padding(16.dp), content = content)
    }
}

@Composable
private fun SectionTitle(title: String) {
    Text(title, fontSize = 16.sp, fontWeight = FontWeight.Bold)
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

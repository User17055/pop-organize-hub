package br.com.poporganize.shared

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.tween
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.Apartment
import androidx.compose.material.icons.rounded.ArrowBack
import androidx.compose.material.icons.rounded.Business
import androidx.compose.material.icons.rounded.CalendarMonth
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.ChevronRight
import androidx.compose.material.icons.rounded.DarkMode
import androidx.compose.material.icons.rounded.DeleteOutline
import androidx.compose.material.icons.rounded.Email
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
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@Composable
fun PopOrganizeApp(platform: PopPlatformServices) {
    val store = remember(platform) { PopStore(platform) }
    val state = store.state

    SideEffect { platform.applyTheme(state.theme == PopThemeMode.Light) }

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
    var name by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    fun consume(result: AuthResult) {
        when (result) {
            is AuthResult.Success -> store.signIn(result.user)
            is AuthResult.Failure -> store.updateMessage(result.message)
            AuthResult.Cancelled -> store.updateMessage("Login cancelado")
        }
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().windowInsetsPadding(WindowInsets.safeDrawing).imePadding(),
        contentPadding = PaddingValues(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            PopLogo(Modifier.padding(top = 12.dp, bottom = 18.dp))
            Text("Entre na sua conta", fontSize = 28.sp, fontWeight = FontWeight.ExtraBold)
            Text("Use a mesma conta no Android, iPhone e painel web.", color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
        }
        item {
            OutlinedTextField(name, { name = it }, label = { Text("Seu nome") }, singleLine = true, modifier = Modifier.fillMaxWidth())
        }
        item {
            OutlinedTextField(email, { email = it }, label = { Text("E-mail") }, singleLine = true, modifier = Modifier.fillMaxWidth())
        }
        item {
            OutlinedTextField(
                password,
                { password = it },
                label = { Text("Senha") },
                visualTransformation = PasswordVisualTransformation(),
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
        }
        item {
            Button(
                onClick = {
                    if (name.isNotBlank() && email.isNotBlank()) {
                        store.signIn(UserProfile(newId("user"), name.trim(), email.trim()))
                    } else store.updateMessage("Preencha seu nome e e-mail")
                },
                modifier = Modifier.fillMaxWidth().height(52.dp),
            ) { Text("Entrar", fontWeight = FontWeight.Bold) }
        }
        item {
            OutlinedButton(
                enabled = !busy,
                onClick = {
                    busy = true
                    scope.launch {
                        consume(platform.signInWithGoogle())
                        busy = false
                    }
                },
                modifier = Modifier.fillMaxWidth().height(52.dp),
            ) { Text(if (busy) "Conectando..." else "Continuar com Google") }
        }
        if (platform.supportsAppleSignIn) {
            item {
                FilledTonalButton(
                    enabled = !busy,
                    onClick = {
                        busy = true
                        scope.launch {
                            consume(platform.signInWithApple())
                            busy = false
                        }
                    },
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                ) { Text("Continuar com Apple") }
            }
        }
        item {
            TextButton(onClick = store::continueAsGuest) { Text("Continuar sem conta") }
            Text(store.message, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp, textAlign = TextAlign.Center)
        }
    }
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

    Scaffold(
        modifier = Modifier.fillMaxSize().windowInsetsPadding(WindowInsets.safeDrawing),
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
                WorkspaceHeader()
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
            if (tab == MainTab.Tasks) {
                FloatingActionButton(onClick = { showTaskEditor = true }) { Icon(Icons.Rounded.Add, "Nova tarefa") }
            }
        },
    ) { padding ->
        AnimatedContent(targetState = tab to morePage, modifier = Modifier.padding(padding)) { (selected, page) ->
            when (selected) {
                MainTab.Dashboard -> DashboardScreen(store)
                MainTab.Tasks -> TasksScreen(store)
                MainTab.Calendar -> CalendarScreen(store)
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

@Composable
private fun WorkspaceHeader() {
    var showComingSoon by remember { mutableStateOf(false) }

    Surface(color = MaterialTheme.colorScheme.background) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(
                modifier = Modifier.weight(1f).clickable { showComingSoon = true },
            ) {
                Text("Meu espaço", fontSize = 18.sp, fontWeight = FontWeight.Bold)
                Text(
                    "Organização pessoal",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontSize = 12.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            PopLogo()
        }
    }

    if (showComingSoon) {
        AlertDialog(
            onDismissRequest = { showComingSoon = false },
            title = { Text("Meu espaço") },
            text = { Text("Em breve, mais funcionalidades para o seu espaço pessoal.") },
            confirmButton = {
                TextButton(onClick = { showComingSoon = false }) { Text("Entendi") }
            },
        )
    }
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
    var collapsedSectors by remember { mutableStateOf(emptySet<String>()) }
    val scope = rememberCoroutineScope()
    val moveTargets = buildList {
        store.selectedCompany?.sectors.orEmpty().forEach {
            add(AssignmentTarget(AssignmentKind.Sector, it.id, it.name))
        }
        store.selectedCompany?.groups.orEmpty().forEach {
            add(AssignmentTarget(AssignmentKind.Group, it.id, it.name))
        }
    }
    val groupedTasks = tasks.groupBy {
        if (it.assignment.kind == AssignmentKind.Sector) it.assignment.label else "Sem setor"
    }.toSortedMap()

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
                Surface(
                    modifier = Modifier.fillMaxWidth().clickable {
                        collapsedSectors = if (sector in collapsedSectors) {
                            collapsedSectors - sector
                        } else {
                            collapsedSectors + sector
                        }
                    },
                    shape = RoundedCornerShape(14.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = .55f),
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 11.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(sector, fontWeight = FontWeight.Bold)
                        Text(
                            "${sectorTasks.size} atividades",
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontSize = 12.sp,
                        )
                    }
                }
            }
            if (sector !in collapsedSectors) {
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
        AlertDialog(
            onDismissRequest = { selectedTask = null },
            title = { Text(task.title, fontWeight = FontWeight.ExtraBold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    if (task.description.isNotBlank()) Text(task.description)
                    Text("Prazo: ${task.dueDate}", color = MaterialTheme.colorScheme.onSurfaceVariant)
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
                        Text(
                            "Recorrência: ${task.recurrence.label}",
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
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
                                    selectedTask = store.state.tasks.firstOrNull { it.id == task.id }
                                },
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Checkbox(
                                    checked = item.done,
                                    onCheckedChange = if (store.isCurrentUserAdmin) {
                                        {
                                            store.toggleChecklistItem(task.id, item.id)
                                            selectedTask = store.state.tasks.firstOrNull { it.id == task.id }
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
                TextButton(onClick = { selectedTask = null }) { Text("Fechar") }
            },
        )
    }

    pendingDeleteTask?.let { task ->
        AlertDialog(
            onDismissRequest = { pendingDeleteTask = null },
            title = {
                Text(
                    if (task.recurrence == RecurrenceKind.None) {
                        "Excluir atividade"
                    } else {
                        "Excluir atividade recorrente"
                    },
                    fontWeight = FontWeight.ExtraBold,
                )
            },
            text = {
                Text(
                    if (task.recurrence == RecurrenceKind.None) {
                        "Confirma a exclusão de “${task.title}”?"
                    } else {
                        "Deseja excluir somente esta data ou toda a recorrência?"
                    },
                )
            },
            confirmButton = {
                Column(horizontalAlignment = Alignment.End) {
                    if (task.recurrence != RecurrenceKind.None) {
                        TextButton(
                            onClick = {
                                deleteWithAnimation(task) {
                                    store.deleteRecurringOccurrence(task.id)
                                }
                            },
                        ) { Text("Somente esta data") }
                    }
                    Button(
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                        onClick = {
                            deleteWithAnimation(task) {
                                if (task.recurrence == RecurrenceKind.None) {
                                    store.deleteTask(task.id)
                                } else {
                                    store.deleteTaskSeries(task.id)
                                }
                            }
                        },
                    ) {
                        Text(
                            if (task.recurrence == RecurrenceKind.None) {
                                "Excluir"
                            } else {
                                "Toda a recorrência"
                            },
                        )
                    }
                }
            },
            dismissButton = {
                TextButton(onClick = { pendingDeleteTask = null }) { Text("Cancelar") }
            },
        )
    }
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
                Text(
                    listOf(task.dueDate, task.dueTime).filter { it.isNotBlank() }.joinToString(" • "),
                    color = when {
                        isUrgent -> Color.White.copy(alpha = .9f)
                        isOverdue -> PopRed
                        else -> priorityColor(task.priority)
                    },
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                )
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
                    moveTargets.forEach { target ->
                        DropdownMenuItem(
                            text = {
                                Text(
                                    "${if (target.kind == AssignmentKind.Group) "Grupo" else "Setor"}: ${target.label}",
                                )
                            },
                            onClick = {
                                onMove(target)
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
                    task.dueDate + task.dueTime.takeIf { it.isNotBlank() }?.let { " • $it" }.orEmpty(),
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

@Composable
private fun CalendarScreen(store: PopStore) {
    val grouped = store.visibleTasks.sortedBy { it.dueDate }.groupBy { it.dueDate }
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(18.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        item {
            Text("Calendário", fontSize = 27.sp, fontWeight = FontWeight.ExtraBold)
            Text("Seus prazos em ordem", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        if (grouped.isEmpty()) item { EmptyState("Nenhum prazo", "As tarefas com data aparecerão aqui.") }
        grouped.forEach { (date, tasks) ->
            item { Text(date, color = PopBlue, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 8.dp)) }
            items(tasks, key = { it.id }) { CompactTaskRow(it) }
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
            PopCard {
                Text("Meu espaço", fontWeight = FontWeight.Bold)
                Text(
                    "Em breve, mais funcionalidades para sua organização pessoal.",
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
            item { SectionTitle("Empresa") }
            item {
                MoreItem(
                    Icons.Rounded.Apartment,
                    "Setores",
                    "Visualizar os setores da empresa",
                ) { onPage(MorePage.Sectors) }
            }
            item {
                MoreItem(
                    Icons.Rounded.Groups,
                    "Grupos",
                    "Visualizar os grupos da empresa",
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
    EntityListScreen(
        title = "Pessoas cadastradas",
        emptyTitle = "Nenhum colaborador",
        items = company?.members.orEmpty().map { it.name to "${it.role} • ${it.email}" },
        onAdd = { showEditor = true },
    )
    if (showEditor) MemberEditorDialog(store) { showEditor = false }
}

@Composable
private fun SectorsScreen(store: PopStore) {
    val company = store.selectedCompany ?: store.state.companies.firstOrNull()
    EntityListScreen(
        title = "Estrutura por setores",
        emptyTitle = "Nenhum setor",
        items = company?.sectors.orEmpty().map { it.name to it.description },
    )
}

@Composable
private fun GroupsScreen(store: PopStore) {
    val company = store.selectedCompany ?: store.state.companies.firstOrNull()
    EntityListScreen(
        title = "Grupos de trabalho",
        emptyTitle = "Nenhum grupo",
        items = company?.groups.orEmpty().map { it.name to it.description },
    )
}

@Composable
private fun EntityListScreen(
    title: String,
    emptyTitle: String,
    items: List<Pair<String, String>>,
    onAdd: (() -> Unit)? = null,
) {
    Box(Modifier.fillMaxSize()) {
        LazyColumn(
            contentPadding = PaddingValues(18.dp, 14.dp, 18.dp, 88.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            item { Text(title, color = MaterialTheme.colorScheme.onSurfaceVariant) }
            if (items.isEmpty()) item { EmptyState(emptyTitle, "Cadastre pela versão web.") }
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
            OutlinedButton(onClick = store::signOut, modifier = Modifier.fillMaxWidth()) { Text("Sair da conta") }
        }
        item { Text(store.message, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth()) }
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
                enabled = title.isNotBlank(),
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
                OutlinedTextField(name, { name = it }, label = { Text("Nome da empresa") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(description, { description = it }, label = { Text("Pequena descrição") }, minLines = 2, modifier = Modifier.fillMaxWidth())
                Text("${store.state.companies.size}/3 empresas criadas", style = MaterialTheme.typography.bodySmall)
            }
        },
        confirmButton = {
            Button(
                enabled = name.isNotBlank() && store.state.companies.size < 3,
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
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Cadastrar pessoa") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(name, { name = it }, label = { Text("Nome") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(email, { email = it }, label = { Text("E-mail") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(role, { role = it }, label = { Text("Função") }, modifier = Modifier.fillMaxWidth())
            }
        },
        confirmButton = {
            Button(enabled = name.isNotBlank() && email.isNotBlank(), onClick = { store.addMember(name, email, role); onDismiss() }) { Text("Cadastrar") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancelar") } },
    )
}

@Composable
private fun SimpleEntityEditorDialog(title: String, onSave: (String, String) -> Unit, onDismiss: () -> Unit) {
    var name by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(name, { name = it }, label = { Text("Nome") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(description, { description = it }, label = { Text("Descrição") }, modifier = Modifier.fillMaxWidth())
            }
        },
        confirmButton = { Button(enabled = name.isNotBlank(), onClick = { onSave(name, description); onDismiss() }) { Text("Salvar") } },
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

private fun priorityColor(priority: Priority): Color = when (priority) {
    Priority.Low -> PopGreen
    Priority.Medium -> Color(0xFFFFB000)
    Priority.High -> PopOrange
    Priority.Urgent -> PopRed
}

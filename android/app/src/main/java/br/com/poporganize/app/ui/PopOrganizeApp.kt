package br.com.poporganize.app.ui

import android.app.Activity
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.ArrowForward
import androidx.compose.material.icons.rounded.Business
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.CalendarMonth
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.ChevronLeft
import androidx.compose.material.icons.rounded.ChevronRight
import androidx.compose.material.icons.rounded.Groups
import androidx.compose.material.icons.rounded.Home
import androidx.compose.material.icons.rounded.MoreHoriz
import androidx.compose.material.icons.rounded.NotificationsNone
import androidx.compose.material.icons.rounded.NotificationsActive
import androidx.compose.material.icons.rounded.PendingActions
import androidx.compose.material.icons.rounded.PersonOutline
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material.icons.rounded.Settings
import androidx.compose.material.icons.rounded.TaskAlt
import androidx.compose.material.icons.rounded.Email
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.TextStyle
import java.util.Locale
import kotlin.math.absoluteValue

private enum class PopDestination(
    val label: String,
    val icon: ImageVector,
) {
    Dashboard("Início", Icons.Rounded.Home),
    Tasks("Tarefas", Icons.Rounded.TaskAlt),
    Calendar("Calendário", Icons.Rounded.CalendarMonth),
    More("Mais", Icons.Rounded.MoreHoriz),
}

private data class PopTask(
    val id: Int,
    val title: String,
    val department: String,
    val dueLabel: String,
    val priority: String,
    val completed: Boolean = false,
)

private enum class AppStage { Splash, Onboarding, Login, Main }

private data class OnboardingSlide(
    val title: String,
    val description: String,
    val icon: ImageVector,
    val detailIcon: ImageVector,
)

private val onboardingSlides = listOf(
    OnboardingSlide(
        "Organize tudo em um só lugar",
        "Crie tarefas, defina prazos e acompanhe suas atividades com facilidade.",
        Icons.Rounded.TaskAlt,
        Icons.Rounded.CalendarMonth,
    ),
    OnboardingSlide(
        "Trabalhe junto com sua equipe",
        "Distribua tarefas entre empresas, setores, grupos e colaboradores.",
        Icons.Rounded.Groups,
        Icons.Rounded.Business,
    ),
    OnboardingSlide(
        "Acompanhe cada etapa",
        "Receba notificações, revise atividades e nunca perca um prazo.",
        Icons.Rounded.NotificationsActive,
        Icons.Rounded.Check,
    ),
)

@Composable
fun PopOrganizeApp() {
    PopTheme {
        var stage by remember { mutableStateOf(AppStage.Splash) }
        var logoEntered by remember { mutableStateOf(false) }

        LaunchedEffect(Unit) {
            logoEntered = true
            delay(1_500)
            stage = AppStage.Onboarding
        }

        SystemBarAppearance(darkBackground = stage != AppStage.Main)

        AnimatedContent(
            targetState = stage,
            transitionSpec = {
                (
                    fadeIn(tween(620)) +
                        slideInHorizontally(
                            animationSpec = spring(
                                dampingRatio = .86f,
                                stiffness = 190f,
                            ),
                        ) { it / 7 } +
                        scaleIn(tween(620), initialScale = .975f)
                    ) togetherWith (
                    fadeOut(tween(480)) +
                        slideOutHorizontally(tween(580)) { -it / 10 } +
                        scaleOut(tween(520), targetScale = 1.015f)
                    )
            },
            label = "entry-flow-transition",
        ) { currentStage ->
            when (currentStage) {
                AppStage.Splash -> PopSplashScreen(entered = logoEntered)
                AppStage.Onboarding -> OnboardingScreen(
                    onSkip = { stage = AppStage.Login },
                    onFinish = { stage = AppStage.Login },
                )
                AppStage.Login -> LoginScreen(onEnter = { stage = AppStage.Main })
                AppStage.Main -> PopMainContent()
            }
        }
    }
}

@Composable
private fun SystemBarAppearance(darkBackground: Boolean) {
    val view = LocalView.current
    SideEffect {
        val window = (view.context as Activity).window
        window.statusBarColor = if (darkBackground) android.graphics.Color.rgb(5, 5, 5) else android.graphics.Color.TRANSPARENT
        WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkBackground
    }
}

@Composable
private fun PopSplashScreen(entered: Boolean) {
    val scale by animateFloatAsState(
        targetValue = if (entered) 1f else .82f,
        animationSpec = spring(dampingRatio = .72f, stiffness = 220f),
        label = "splash-logo-scale",
    )
    val alpha by animateFloatAsState(
        targetValue = if (entered) 1f else 0f,
        animationSpec = tween(520),
        label = "splash-logo-alpha",
    )

    Box(
        modifier = Modifier.fillMaxSize().background(Color(0xFF050505)),
        contentAlignment = Alignment.Center,
    ) {
        Row(
            modifier = Modifier.scale(scale),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = "P",
                color = Color.White.copy(alpha = alpha),
                fontSize = 58.sp,
                fontWeight = FontWeight.ExtraBold,
                letterSpacing = (-3).sp,
            )
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .scale(alpha.coerceAtLeast(.01f))
                    .clip(CircleShape)
                    .background(PopBlue),
            )
            Text(
                text = "p",
                color = Color.White.copy(alpha = alpha),
                fontSize = 58.sp,
                fontWeight = FontWeight.ExtraBold,
                letterSpacing = (-3).sp,
            )
            Text(
                text = "Organize",
                color = Color.White.copy(alpha = alpha),
                fontSize = 58.sp,
                fontWeight = FontWeight.ExtraBold,
                letterSpacing = (-3).sp,
                modifier = Modifier.padding(start = 7.dp),
            )
        }
    }
}

@Composable
private fun PopWordmark(modifier: Modifier = Modifier, large: Boolean = false) {
    val mainSize = if (large) 29.sp else 22.sp
    Row(modifier = modifier, verticalAlignment = Alignment.CenterVertically) {
        Text("P", color = Color.White, fontSize = mainSize, fontWeight = FontWeight.ExtraBold, letterSpacing = (-2).sp)
        Box(Modifier.size(if (large) 19.dp else 14.dp).clip(CircleShape).background(PopBlue))
        Text("p", color = Color.White, fontSize = mainSize, fontWeight = FontWeight.ExtraBold, letterSpacing = (-2).sp)
        Text("Organize", color = Color.White, fontSize = mainSize, fontWeight = FontWeight.ExtraBold, letterSpacing = (-2).sp, modifier = Modifier.padding(start = if (large) 5.dp else 4.dp))
    }
}

@Composable
private fun OnboardingScreen(onSkip: () -> Unit, onFinish: () -> Unit) {
    val pagerState = rememberPagerState(pageCount = { onboardingSlides.size })
    val scope = rememberCoroutineScope()
    val isLast = pagerState.currentPage == onboardingSlides.lastIndex

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF2C2C2C))
            .padding(WindowInsets.statusBars.asPaddingValues())
            .padding(vertical = 18.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        PopWordmark(large = true)
        HorizontalPager(
            state = pagerState,
            modifier = Modifier.weight(1f).fillMaxWidth(),
            beyondViewportPageCount = 1,
        ) { page ->
            val slide = onboardingSlides[page]
            val pageOffset = (
                (pagerState.currentPage - page) + pagerState.currentPageOffsetFraction
                ).absoluteValue.coerceIn(0f, 1f)
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 28.dp)
                    .graphicsLayer {
                        alpha = 1f - (pageOffset * .22f)
                        scaleX = 1f - (pageOffset * .045f)
                        scaleY = 1f - (pageOffset * .045f)
                    },
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                Box(
                    modifier = Modifier.size(236.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Box(Modifier.fillMaxSize().clip(CircleShape).background(Color(0xFFF7F7F7)))
                    Box(Modifier.align(Alignment.TopStart).padding(28.dp).size(80.dp).clip(CircleShape).background(PopBlue.copy(alpha = .12f)))
                    Box(Modifier.align(Alignment.BottomEnd).padding(28.dp).size(64.dp).clip(CircleShape).background(Color(0xFFD9DDE3)))
                    Box(
                        Modifier.size(112.dp).clip(RoundedCornerShape(30.dp)).background(Color(0xFF2C2C2C)),
                        contentAlignment = Alignment.Center,
                    ) { Icon(slide.icon, null, tint = PopBlue, modifier = Modifier.size(56.dp)) }
                    Box(
                        Modifier.align(Alignment.BottomEnd).padding(bottom = 34.dp).size(52.dp).clip(CircleShape).background(PopBlue),
                        contentAlignment = Alignment.Center,
                    ) { Icon(slide.detailIcon, null, tint = Color.White, modifier = Modifier.size(22.dp)) }
                }
                Spacer(Modifier.height(38.dp))
                Text(slide.title, color = Color.White, fontSize = 29.sp, fontWeight = FontWeight.ExtraBold, lineHeight = 34.sp, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                Spacer(Modifier.height(14.dp))
                Text(slide.description, color = Color.White.copy(alpha = .58f), fontSize = 15.sp, lineHeight = 24.sp, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
            }
        }
        val indicatorPosition = (
            pagerState.currentPage.toFloat() + pagerState.currentPageOffsetFraction
            ).coerceIn(0f, onboardingSlides.lastIndex.toFloat())
        Box(Modifier.width(90.dp).height(14.dp)) {
            onboardingSlides.indices.forEach { index ->
                val selectedAmount = (
                    1f - (indicatorPosition - index.toFloat()).absoluteValue
                    ).coerceIn(0f, 1f)
                val indicatorWidth = 10f + (22f * selectedAmount)
                val indicatorLeft = 16f + (index * 29f) - (indicatorWidth / 2f)
                val indicatorColor = lerp(Color.White, PopBlue, selectedAmount)
                Box(
                    Modifier
                        .offset(x = indicatorLeft.dp, y = 2.dp)
                        .width(indicatorWidth.dp)
                        .height(10.dp)
                        .clip(CircleShape)
                        .background(indicatorColor),
                )
            }
        }
        Spacer(Modifier.height(30.dp))
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 28.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            EntryButton(
                text = if (pagerState.currentPage == 0) "Pular" else "Voltar",
                background = Color.White.copy(alpha = .1f),
                foreground = Color.White,
                modifier = Modifier.weight(1f),
                onClick = {
                    if (pagerState.currentPage == 0) onSkip()
                    else scope.launch {
                        pagerState.animateScrollToPage(
                            pagerState.currentPage - 1,
                            animationSpec = tween(680, easing = FastOutSlowInEasing),
                        )
                    }
                },
            )
            EntryButton(
                text = if (isLast) "Começar" else "Próximo",
                background = if (isLast) Color.White else PopBlue,
                foreground = if (isLast) PopBlue else Color.White,
                modifier = Modifier.weight(1f),
                onClick = {
                    if (isLast) onFinish()
                    else scope.launch {
                        pagerState.animateScrollToPage(
                            pagerState.currentPage + 1,
                            animationSpec = tween(680, easing = FastOutSlowInEasing),
                        )
                    }
                },
            )
        }
    }
}

@Composable
private fun EntryButton(
    text: String,
    background: Color,
    foreground: Color,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    Surface(onClick = onClick, color = background, contentColor = foreground, shape = RoundedCornerShape(18.dp), modifier = modifier.height(56.dp)) {
        Box(contentAlignment = Alignment.Center) { Text(text, fontSize = 14.sp, fontWeight = FontWeight.Bold) }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun LoginScreen(onEnter: () -> Unit) {
    var showEmail by remember { mutableStateOf(false) }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF2C2C2C))
            .padding(WindowInsets.statusBars.asPaddingValues())
            .padding(horizontal = 28.dp, vertical = 18.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        PopWordmark()
        Column(Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
            Box(Modifier.size(190.dp).clip(CircleShape).background(Color(0xFFF7F7F7)), contentAlignment = Alignment.Center) {
                Box(Modifier.size(112.dp).clip(RoundedCornerShape(24.dp)).background(Color(0xFF2C2C2C)), contentAlignment = Alignment.Center) {
                    Icon(Icons.Rounded.TaskAlt, null, tint = PopBlue, modifier = Modifier.size(55.dp))
                }
                Box(Modifier.align(Alignment.BottomEnd).padding(24.dp).size(42.dp).clip(CircleShape).background(PopBlue), contentAlignment = Alignment.Center) {
                    Icon(Icons.Rounded.Groups, null, tint = Color.White, modifier = Modifier.size(21.dp))
                }
            }
            Spacer(Modifier.height(30.dp))
            Text("Organize tudo.", color = Color.White, fontSize = 35.sp, fontWeight = FontWeight.ExtraBold)
            Text("Pessoas, tarefas e equipes em um só lugar.", color = Color.White.copy(alpha = .58f), fontSize = 14.sp, modifier = Modifier.padding(top = 8.dp))
        }

        AnimatedVisibility(showEmail) {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.padding(bottom = 12.dp)) {
                DarkLoginField(email, { email = it }, "E-mail", Icons.Rounded.Email)
                DarkLoginField(password, { password = it }, "Senha", Icons.Rounded.PersonOutline)
                EntryButton("Entrar", PopBlue, Color.White, Modifier.fillMaxWidth(), onEnter)
            }
        }

        if (!showEmail) {
            EntryButton("G   Continuar com Google", Color.White, Color(0xFF202124), Modifier.fillMaxWidth(), onEnter)
            Spacer(Modifier.height(10.dp))
            EntryButton("Entrar com e-mail", Color.White.copy(alpha = .1f), Color.White, Modifier.fillMaxWidth()) { showEmail = true }
            Spacer(Modifier.height(10.dp))
            EntryButton("Continuar sem login", PopBlue, Color.White, Modifier.fillMaxWidth(), onEnter)
        }
        Spacer(Modifier.height(14.dp))
        Text("Ao continuar, você concorda com os termos de uso.", color = Color.White.copy(alpha = .38f), fontSize = 10.sp)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DarkLoginField(value: String, onValueChange: (String) -> Unit, label: String, icon: ImageVector) {
    TextField(
        value = value,
        onValueChange = onValueChange,
        placeholder = { Text(label) },
        leadingIcon = { Icon(icon, null) },
        singleLine = true,
        shape = RoundedCornerShape(18.dp),
        colors = TextFieldDefaults.colors(
            focusedContainerColor = Color.White.copy(alpha = .1f),
            unfocusedContainerColor = Color.White.copy(alpha = .08f),
            focusedTextColor = Color.White,
            unfocusedTextColor = Color.White,
            focusedLeadingIconColor = PopBlue,
            unfocusedLeadingIconColor = Color.White.copy(alpha = .7f),
            focusedPlaceholderColor = Color.White.copy(alpha = .5f),
            unfocusedPlaceholderColor = Color.White.copy(alpha = .5f),
            focusedIndicatorColor = Color.Transparent,
            unfocusedIndicatorColor = Color.Transparent,
        ),
        modifier = Modifier.fillMaxWidth(),
    )
}

@Composable
private fun PopMainContent() {
        var destination by remember { mutableStateOf(PopDestination.Dashboard) }
        val tasks = remember {
            mutableStateListOf(
                PopTask(1, "Revisar campanha de lançamento", "Marketing", "Hoje, 18:00", "Alta"),
                PopTask(2, "Conferir relatório financeiro", "Financeiro", "Amanhã, 10:00", "Média"),
                PopTask(3, "Atualizar documentos da equipe", "Pessoas", "Sex, 16:30", "Baixa"),
                PopTask(4, "Aprovar proposta comercial", "Comercial", "20 jul, 09:00", "Alta"),
            )
        }

    Scaffold(
            containerColor = PopBackground,
            bottomBar = {
                PopBottomBar(
                    selected = destination,
                    onSelect = { destination = it },
                )
            },
        ) { innerPadding ->
            AnimatedContent(
                targetState = destination,
                transitionSpec = {
                    (
                        fadeIn(tween(460)) +
                            slideInHorizontally(
                                animationSpec = spring(
                                    dampingRatio = .88f,
                                    stiffness = 210f,
                                ),
                            ) { it / 8 } +
                            scaleIn(tween(480), initialScale = .985f)
                        ) togetherWith (
                        fadeOut(tween(320)) +
                            slideOutHorizontally(tween(440)) { -it / 12 }
                        )
                },
                label = "page-transition",
                modifier = Modifier
                    .fillMaxSize()
                    .padding(bottom = innerPadding.calculateBottomPadding()),
            ) { page ->
                when (page) {
                    PopDestination.Dashboard -> DashboardScreen(tasks)
                    PopDestination.Tasks -> TasksScreen(tasks)
                    PopDestination.Calendar -> CalendarScreen(tasks)
                    PopDestination.More -> MoreScreen()
                }
            }
    }
}

@Composable
private fun ScreenHeader(title: String, subtitle: String) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color.White)
            .padding(WindowInsets.statusBars.asPaddingValues())
            .padding(horizontal = 20.dp, vertical = 14.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    color = PopText,
                    fontSize = 25.sp,
                    fontWeight = FontWeight.ExtraBold,
                    letterSpacing = (-0.5).sp,
                )
                Text(text = subtitle, color = PopMuted, fontSize = 13.sp)
            }
            IconButton(
                onClick = {},
                modifier = Modifier
                    .clip(CircleShape)
                    .background(PopBlueSoft),
            ) {
                Icon(Icons.Rounded.NotificationsNone, "Notificações", tint = PopBlue)
            }
        }
    }
}

@Composable
private fun DashboardScreen(tasks: List<PopTask>) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(bottom = 28.dp),
    ) {
        item { ScreenHeader("Boa tarde, André", "Veja o que acontece hoje na empresa") }
        item {
            Column(modifier = Modifier.padding(horizontal = 20.dp)) {
                HeroCard(tasks.count { !it.completed })
                Spacer(Modifier.height(18.dp))
                Text("Visão geral", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(10.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    MetricCard("Concluídas", "12", Icons.Rounded.CheckCircle, Color(0xFF18A66A), Modifier.weight(1f))
                    MetricCard("Pendentes", tasks.count { !it.completed }.toString(), Icons.Rounded.PendingActions, Color(0xFFFF9F1C), Modifier.weight(1f))
                }
                Spacer(Modifier.height(20.dp))
                SectionTitle("Tarefas recentes", "Ver todas")
                Spacer(Modifier.height(8.dp))
                tasks.take(3).forEachIndexed { index, task ->
                    TaskRow(task = task)
                    if (index < 2) HorizontalDivider(color = PopBorder.copy(alpha = .65f))
                }
            }
        }
    }
}

@Composable
private fun HeroCard(pending: Int) {
    Card(
        shape = RoundedCornerShape(28.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(
            modifier = Modifier
                .background(Brush.linearGradient(listOf(Color(0xFF45ADFF), PopBlue, PopBlueDark)))
                .padding(22.dp),
        ) {
            Text("ORGANIZAÇÃO DO DIA", color = Color.White.copy(alpha = .78f), fontSize = 11.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(8.dp))
            Text("$pending tarefas pedem\nsua atenção", color = Color.White, fontSize = 27.sp, fontWeight = FontWeight.ExtraBold, lineHeight = 31.sp)
            Spacer(Modifier.height(16.dp))
            Surface(color = Color.White.copy(alpha = .18f), shape = RoundedCornerShape(14.dp), onClick = {}) {
                Row(Modifier.padding(horizontal = 14.dp, vertical = 9.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text("Começar agora", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    Spacer(Modifier.width(6.dp))
                    Icon(Icons.Rounded.ArrowForward, null, tint = Color.White, modifier = Modifier.size(17.dp))
                }
            }
        }
    }
}

@Composable
private fun MetricCard(label: String, value: String, icon: ImageVector, tint: Color, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier.border(1.dp, PopBorder, RoundedCornerShape(22.dp)),
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
    ) {
        Column(Modifier.padding(16.dp)) {
            Icon(icon, null, tint = tint, modifier = Modifier.size(23.dp))
            Spacer(Modifier.height(12.dp))
            Text(value, fontSize = 24.sp, fontWeight = FontWeight.ExtraBold)
            Text(label, fontSize = 12.sp, color = PopMuted)
        }
    }
}

@Composable
private fun SectionTitle(title: String, action: String? = null) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text(title, fontWeight = FontWeight.Bold, fontSize = 17.sp, modifier = Modifier.weight(1f))
        action?.let { Text(it, color = PopBlue, fontWeight = FontWeight.SemiBold, fontSize = 13.sp) }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TasksScreen(tasks: MutableList<PopTask>) {
    var query by remember { mutableStateOf("") }
    val filtered = tasks.filter { it.title.contains(query, ignoreCase = true) }
    Box(Modifier.fillMaxSize()) {
        LazyColumn(contentPadding = PaddingValues(bottom = 92.dp)) {
            item { ScreenHeader("Tarefas", "Organize e acompanhe suas atividades") }
            item {
                TextField(
                    value = query,
                    onValueChange = { query = it },
                    placeholder = { Text("Buscar tarefa...") },
                    leadingIcon = { Icon(Icons.Rounded.Search, null, tint = PopBlue) },
                    singleLine = true,
                    shape = RoundedCornerShape(18.dp),
                    colors = TextFieldDefaults.colors(
                        focusedContainerColor = PopBlueSoft,
                        unfocusedContainerColor = Color(0xFFF5FAFF),
                        focusedIndicatorColor = Color.Transparent,
                        unfocusedIndicatorColor = Color.Transparent,
                    ),
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 8.dp),
                )
                Row(Modifier.padding(horizontal = 20.dp, vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip("Todas", true)
                    FilterChip("Hoje", false)
                    FilterChip("Atrasadas", false)
                }
                Text("${filtered.size} atividades", color = PopMuted, fontSize = 12.sp, modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp))
            }
            items(filtered, key = { it.id }) { task ->
                val scale by animateFloatAsState(if (task.completed) .98f else 1f, label = "task-scale")
                Box(Modifier.padding(horizontal = 20.dp, vertical = 6.dp).scale(scale)) {
                    TaskCard(task) {
                        val index = tasks.indexOfFirst { it.id == task.id }
                        if (index >= 0) tasks[index] = task.copy(completed = !task.completed)
                    }
                }
            }
        }
        FloatingActionButton(
            onClick = {},
            containerColor = PopBlue,
            contentColor = Color.White,
            shape = CircleShape,
            modifier = Modifier.align(Alignment.BottomEnd).padding(20.dp),
        ) { Icon(Icons.Rounded.Add, "Nova tarefa") }
    }
}

@Composable
private fun FilterChip(label: String, selected: Boolean) {
    Surface(
        color = if (selected) PopBlue else PopBlueSoft,
        contentColor = if (selected) Color.White else PopBlueDark,
        shape = CircleShape,
    ) { Text(label, fontSize = 12.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 15.dp, vertical = 8.dp)) }
}

@Composable
private fun TaskCard(task: PopTask, onComplete: () -> Unit) {
    Card(
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = if (task.completed) Color(0xFFF7FAFC) else Color.White),
        modifier = Modifier.fillMaxWidth().border(1.dp, PopBorder, RoundedCornerShape(22.dp)),
    ) {
        Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .size(42.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .background(if (task.completed) Color(0xFFE5F8EE) else PopBlueSoft)
                    .clickable(onClick = onComplete),
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Rounded.CheckCircle, null, tint = if (task.completed) Color(0xFF18A66A) else PopBlue)
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(task.title, fontWeight = FontWeight.Bold, fontSize = 14.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text("${task.department}  •  ${task.dueLabel}", color = PopMuted, fontSize = 11.sp)
            }
            PriorityPill(task.priority)
        }
    }
}

@Composable
private fun TaskRow(task: PopTask) {
    Row(Modifier.fillMaxWidth().padding(vertical = 13.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(38.dp).clip(RoundedCornerShape(13.dp)).background(PopBlueSoft), contentAlignment = Alignment.Center) {
            Icon(Icons.Rounded.TaskAlt, null, tint = PopBlue, modifier = Modifier.size(20.dp))
        }
        Spacer(Modifier.width(11.dp))
        Column(Modifier.weight(1f)) {
            Text(task.title, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(task.department, fontSize = 11.sp, color = PopMuted)
        }
        PriorityPill(task.priority)
    }
}

@Composable
private fun PriorityPill(priority: String) {
    val color = when (priority) {
        "Alta" -> Color(0xFFE5484D)
        "Média" -> Color(0xFFFF9F1C)
        else -> Color(0xFF18A66A)
    }
    Surface(color = color.copy(alpha = .1f), shape = CircleShape) {
        Text(priority, color = color, fontSize = 10.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 8.dp, vertical = 5.dp))
    }
}

@Composable
private fun CalendarScreen(tasks: List<PopTask>) {
    var month by remember { mutableStateOf(YearMonth.now()) }
    val locale = remember { Locale("pt", "BR") }
    Column(Modifier.fillMaxSize()) {
        ScreenHeader("Calendário", "Visualize suas tarefas por data")
        Row(Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = { month = month.minusMonths(1) }) { Icon(Icons.Rounded.ChevronLeft, "Mês anterior") }
            Text(
                "${month.month.getDisplayName(TextStyle.FULL, locale).replaceFirstChar { it.uppercase() }} ${month.year}",
                fontWeight = FontWeight.ExtraBold,
                modifier = Modifier.weight(1f),
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            )
            IconButton(onClick = { month = month.plusMonths(1) }) { Icon(Icons.Rounded.ChevronRight, "Próximo mês") }
        }
        CalendarGrid(month)
        Column(Modifier.padding(20.dp)) {
            SectionTitle("Próximas tarefas")
            Spacer(Modifier.height(6.dp))
            tasks.take(3).forEach { TaskRow(it) }
        }
    }
}

@Composable
private fun CalendarGrid(month: YearMonth) {
    val firstOffset = month.atDay(1).dayOfWeek.value - 1
    val cells = List(firstOffset) { null } + (1..month.lengthOfMonth()).map { it }
    val today = LocalDate.now()
    Column(Modifier.padding(horizontal = 20.dp).border(1.dp, PopBorder, RoundedCornerShape(24.dp)).padding(12.dp)) {
        Row(Modifier.fillMaxWidth()) {
            listOf("S", "T", "Q", "Q", "S", "S", "D").forEach { day ->
                Text(day, color = PopMuted, fontSize = 11.sp, fontWeight = FontWeight.Bold, textAlign = androidx.compose.ui.text.style.TextAlign.Center, modifier = Modifier.weight(1f))
            }
        }
        Spacer(Modifier.height(8.dp))
        cells.chunked(7).forEach { week ->
            Row(Modifier.fillMaxWidth()) {
                (week + List(7 - week.size) { null }).forEach { day ->
                    val selected = day != null && today.year == month.year && today.month == month.month && today.dayOfMonth == day
                    Box(Modifier.weight(1f).height(42.dp), contentAlignment = Alignment.Center) {
                        if (day != null) {
                            Box(
                                Modifier.size(34.dp).clip(CircleShape).background(if (selected) PopBlue else Color.Transparent),
                                contentAlignment = Alignment.Center,
                            ) { Text(day.toString(), color = if (selected) Color.White else PopText, fontSize = 12.sp, fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal) }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun MoreScreen() {
    LazyColumn(Modifier.fillMaxSize()) {
        item { ScreenHeader("Mais", "Conta, equipe e configurações") }
        item {
            Row(Modifier.padding(20.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(58.dp).clip(CircleShape).background(Brush.linearGradient(listOf(Color(0xFF45ADFF), PopBlue))), contentAlignment = Alignment.Center) {
                    Text("AJ", color = Color.White, fontWeight = FontWeight.ExtraBold)
                }
                Spacer(Modifier.width(14.dp))
                Column { Text("André Junior", fontWeight = FontWeight.ExtraBold, fontSize = 18.sp); Text("Administrador", color = PopMuted, fontSize = 12.sp) }
            }
            Column(Modifier.padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                MoreItem(Icons.Rounded.Business, "Empresa", "Dados e setores da organização")
                MoreItem(Icons.Rounded.Groups, "Equipe", "Funcionários e grupos")
                MoreItem(Icons.Rounded.PersonOutline, "Meu perfil", "Conta e preferências")
                MoreItem(Icons.Rounded.Settings, "Configurações", "Notificações e aplicativo")
            }
        }
    }
}

@Composable
private fun MoreItem(icon: ImageVector, title: String, subtitle: String) {
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(Color(0xFFF7FBFF)).clickable { }.padding(15.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.size(42.dp).clip(RoundedCornerShape(14.dp)).background(PopBlueSoft), contentAlignment = Alignment.Center) { Icon(icon, null, tint = PopBlue) }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) { Text(title, fontWeight = FontWeight.Bold, fontSize = 14.sp); Text(subtitle, color = PopMuted, fontSize = 11.sp) }
        Icon(Icons.Rounded.ArrowForward, null, tint = PopMuted, modifier = Modifier.size(18.dp))
    }
}

@Composable
private fun PopBottomBar(selected: PopDestination, onSelect: (PopDestination) -> Unit) {
    Box(
        Modifier
            .fillMaxWidth()
            .background(Color.Transparent)
            .padding(horizontal = 14.dp)
            .padding(bottom = WindowInsets.navigationBars.asPaddingValues().calculateBottomPadding().coerceAtLeast(10.dp)),
    ) {
        Surface(
            color = Color.White.copy(alpha = .94f),
            shadowElevation = 18.dp,
            tonalElevation = 4.dp,
            shape = RoundedCornerShape(28.dp),
            modifier = Modifier.fillMaxWidth().border(1.dp, PopBlue.copy(alpha = .14f), RoundedCornerShape(28.dp)),
        ) {
            Row(Modifier.padding(7.dp), horizontalArrangement = Arrangement.spacedBy(3.dp)) {
                PopDestination.entries.forEach { item ->
                    val active = selected == item
                    val scale by animateFloatAsState(if (active) 1.03f else 1f, spring(stiffness = Spring.StiffnessMediumLow), label = "nav-scale")
                    Box(
                        Modifier.weight(1f).scale(scale).clip(RoundedCornerShape(19.dp))
                            .background(if (active) PopBlue else Color.Transparent)
                            .clickable { onSelect(item) }.padding(vertical = 9.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.Center) {
                            Icon(item.icon, item.label, tint = if (active) Color.White else PopMuted, modifier = Modifier.size(20.dp))
                            AnimatedVisibility(active, enter = fadeIn() + scaleIn(), exit = fadeOut()) {
                                Row { Spacer(Modifier.width(5.dp)); Text(item.label, color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold) }
                            }
                        }
                    }
                }
            }
        }
    }
}

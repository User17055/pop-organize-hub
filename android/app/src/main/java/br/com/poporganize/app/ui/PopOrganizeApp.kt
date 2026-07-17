package br.com.poporganize.app.ui

import android.app.Activity
import android.content.Context
import android.widget.Toast
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.animateColorAsState
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
import androidx.compose.foundation.Image
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
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
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
import androidx.compose.material.icons.rounded.Lock
import androidx.compose.material.icons.rounded.KeyboardArrowDown
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.withStyle
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.core.view.WindowCompat
import br.com.poporganize.app.R
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.TextStyle
import java.util.Locale
import kotlin.math.absoluteValue
import org.json.JSONArray
import org.json.JSONObject

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
    val dueDate: String = LocalDate.now().toString(),
    val completed: Boolean = false,
)

private enum class SessionMode { Guest, Email, Google }
private enum class WorkSpace { Personal, Company }

private const val GUEST_TASKS_STORAGE = "pop_organize_guest_tasks"
private const val ONBOARDING_COMPLETED_STORAGE = "pop_organize_onboarding_completed"
private const val SESSION_MODE_STORAGE = "pop_organize_session_mode"
private const val LOCAL_PREFERENCES = "pop_organize_local"

private fun defaultGuestTasks() = listOf(
    PopTask(1, "Planejar minha semana", "Pessoal", "Hoje, 18:00", "Alta", LocalDate.now().toString()),
    PopTask(2, "Organizar documentos", "Pessoal", "Amanhã, 10:00", "Média", LocalDate.now().plusDays(1).toString()),
    PopTask(3, "Revisar minhas prioridades", "Pessoal", "Esta semana", "Baixa", LocalDate.now().plusDays(3).toString()),
)

private fun loadGuestTasks(context: Context): List<PopTask> {
    val raw = context.getSharedPreferences(LOCAL_PREFERENCES, Context.MODE_PRIVATE)
        .getString(GUEST_TASKS_STORAGE, null) ?: return defaultGuestTasks()
    return runCatching {
        val items = JSONArray(raw)
        List(items.length()) { index ->
            val item = items.getJSONObject(index)
            PopTask(
                id = item.getInt("id"),
                title = item.getString("title"),
                department = "Pessoal",
                dueLabel = item.getString("dueLabel"),
                priority = item.getString("priority"),
                dueDate = item.optString("dueDate", LocalDate.now().toString()),
                completed = item.optBoolean("completed"),
            )
        }
    }.getOrElse { defaultGuestTasks() }
}

private fun saveGuestTasks(context: Context, tasks: List<PopTask>) {
    val items = JSONArray()
    tasks.forEach { task ->
        items.put(
            JSONObject()
                .put("id", task.id)
                .put("title", task.title)
                .put("dueLabel", task.dueLabel)
                .put("priority", task.priority)
                .put("dueDate", task.dueDate)
                .put("completed", task.completed),
        )
    }
    context.getSharedPreferences(LOCAL_PREFERENCES, Context.MODE_PRIVATE)
        .edit().putString(GUEST_TASKS_STORAGE, items.toString()).apply()
}

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
        val context = LocalContext.current
        var stage by remember { mutableStateOf(AppStage.Splash) }
        var logoEntered by remember { mutableStateOf(false) }
        var sessionMode by remember {
            val storedMode = context.getSharedPreferences(LOCAL_PREFERENCES, Context.MODE_PRIVATE)
                .getString(SESSION_MODE_STORAGE, null)
            mutableStateOf(storedMode?.let { value -> runCatching { SessionMode.valueOf(value) }.getOrNull() })
        }
        val onboardingCompleted = remember {
            context.getSharedPreferences(LOCAL_PREFERENCES, Context.MODE_PRIVATE)
                .getBoolean(ONBOARDING_COMPLETED_STORAGE, false)
        }

        fun completeOnboarding() {
            context.getSharedPreferences(LOCAL_PREFERENCES, Context.MODE_PRIVATE)
                .edit()
                .putBoolean(ONBOARDING_COMPLETED_STORAGE, true)
                .apply()
        }

        LaunchedEffect(Unit) {
            logoEntered = true
            delay(1_500)
            stage = when {
                !onboardingCompleted -> AppStage.Onboarding
                sessionMode != null -> AppStage.Main
                else -> AppStage.Login
            }
        }

        SystemBarAppearance(darkBackground = stage != AppStage.Main)

        AnimatedContent(
            targetState = stage,
            transitionSpec = {
                if (targetState == AppStage.Main || initialState == AppStage.Main) {
                    fadeIn(tween(150)) togetherWith fadeOut(tween(90))
                } else {
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
                }
            },
            label = "entry-flow-transition",
        ) { currentStage ->
            when (currentStage) {
                AppStage.Splash -> PopSplashScreen(entered = logoEntered)
                AppStage.Onboarding -> OnboardingScreen(
                    onSkip = { stage = AppStage.Login },
                    onFinish = { stage = AppStage.Login },
                )
                AppStage.Login -> LoginScreen(
                    onGuest = {
                        completeOnboarding()
                        sessionMode = SessionMode.Guest
                        context.getSharedPreferences(LOCAL_PREFERENCES, Context.MODE_PRIVATE)
                            .edit()
                            .putString(SESSION_MODE_STORAGE, SessionMode.Guest.name)
                            .apply()
                        stage = AppStage.Main
                    },
                )
                AppStage.Main -> PopMainContent(
                    sessionMode = sessionMode ?: SessionMode.Guest,
                    onRequireLogin = { stage = AppStage.Login },
                )
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
            .background(Color(0xFF1C1E1E))
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
                if (page == 0) {
                    Box(Modifier.size(320.dp)) {
                        Image(
                            painter = painterResource(R.drawable.onboarding_organize),
                            contentDescription = "Pessoa organizando tarefas",
                            contentScale = ContentScale.Fit,
                            modifier = Modifier.fillMaxSize(),
                        )
                        Box(
                            Modifier.align(Alignment.TopCenter).fillMaxWidth().height(24.dp)
                                .background(Brush.verticalGradient(listOf(Color(0xFF1C1E1E), Color.Transparent))),
                        )
                        Box(
                            Modifier.align(Alignment.BottomCenter).fillMaxWidth().height(24.dp)
                                .background(Brush.verticalGradient(listOf(Color.Transparent, Color(0xFF1C1E1E)))),
                        )
                        Box(
                            Modifier.align(Alignment.CenterStart).width(24.dp).fillMaxHeight()
                                .background(Brush.horizontalGradient(listOf(Color(0xFF1C1E1E), Color.Transparent))),
                        )
                        Box(
                            Modifier.align(Alignment.CenterEnd).width(24.dp).fillMaxHeight()
                                .background(Brush.horizontalGradient(listOf(Color.Transparent, Color(0xFF1C1E1E)))),
                        )
                    }
                } else if (page == 2) {
                    Box(Modifier.size(320.dp)) {
                        Image(
                            painter = painterResource(R.drawable.onboarding_track),
                            contentDescription = "Pessoa acompanhando as etapas pelo tablet",
                            contentScale = ContentScale.Fit,
                            modifier = Modifier.fillMaxSize(),
                        )
                        Box(
                            Modifier.align(Alignment.TopCenter).fillMaxWidth().height(24.dp)
                                .background(Brush.verticalGradient(listOf(Color(0xFF1C1E1E), Color.Transparent))),
                        )
                        Box(
                            Modifier.align(Alignment.BottomCenter).fillMaxWidth().height(24.dp)
                                .background(Brush.verticalGradient(listOf(Color.Transparent, Color(0xFF1C1E1E)))),
                        )
                        Box(
                            Modifier.align(Alignment.CenterStart).width(24.dp).fillMaxHeight()
                                .background(Brush.horizontalGradient(listOf(Color(0xFF1C1E1E), Color.Transparent))),
                        )
                        Box(
                            Modifier.align(Alignment.CenterEnd).width(24.dp).fillMaxHeight()
                                .background(Brush.horizontalGradient(listOf(Color.Transparent, Color(0xFF1C1E1E)))),
                        )
                    }
                } else {
                    Box(Modifier.size(320.dp)) {
                        Image(
                            painter = painterResource(R.drawable.onboarding_team),
                            contentDescription = "Profissionais conversando e trabalhando em equipe",
                            contentScale = ContentScale.Fit,
                            modifier = Modifier.fillMaxSize(),
                        )
                        Box(
                            Modifier.align(Alignment.TopCenter).fillMaxWidth().height(24.dp)
                                .background(Brush.verticalGradient(listOf(Color(0xFF1C1E1E), Color.Transparent))),
                        )
                        Box(
                            Modifier.align(Alignment.BottomCenter).fillMaxWidth().height(24.dp)
                                .background(Brush.verticalGradient(listOf(Color.Transparent, Color(0xFF1C1E1E)))),
                        )
                        Box(
                            Modifier.align(Alignment.CenterStart).width(24.dp).fillMaxHeight()
                                .background(Brush.horizontalGradient(listOf(Color(0xFF1C1E1E), Color.Transparent))),
                        )
                        Box(
                            Modifier.align(Alignment.CenterEnd).width(24.dp).fillMaxHeight()
                                .background(Brush.horizontalGradient(listOf(Color.Transparent, Color(0xFF1C1E1E)))),
                        )
                    }
                }
                Spacer(Modifier.height(38.dp))
                Text(
                    buildAnnotatedString {
                        when (page) {
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
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                )
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
private fun LoginScreen(onGuest: () -> Unit) {
    val context = LocalContext.current
    var showEmail by remember { mutableStateOf(false) }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF2C2C2C))
            .padding(WindowInsets.statusBars.asPaddingValues())
            .imePadding()
            .padding(horizontal = 28.dp, vertical = 18.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        PopWordmark(large = true)
        Column(
            Modifier.weight(1f),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Box(
                Modifier.size(if (showEmail) 118.dp else 166.dp)
                    .clip(RoundedCornerShape(48.dp, 72.dp, 54.dp, 68.dp))
                    .background(Color(0xFFF7F7F7)),
                contentAlignment = Alignment.Center,
            ) {
                Box(
                    Modifier.size(if (showEmail) 72.dp else 98.dp)
                        .clip(RoundedCornerShape(28.dp, 20.dp, 30.dp, 22.dp))
                        .background(Color(0xFF202222)),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        if (showEmail) Icons.Rounded.Email else Icons.Rounded.TaskAlt,
                        null,
                        tint = PopBlue,
                        modifier = Modifier.size(if (showEmail) 34.dp else 48.dp),
                    )
                }
                if (!showEmail) {
                    Box(
                        Modifier.align(Alignment.BottomEnd).padding(18.dp).size(38.dp)
                            .clip(CircleShape).background(PopBlue),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(Icons.Rounded.Groups, null, tint = Color.White, modifier = Modifier.size(19.dp))
                    }
                }
            }
            Spacer(Modifier.height(if (showEmail) 20.dp else 28.dp))
            Text(
                if (showEmail) "Entre com seu e-mail" else "Comece por aqui",
                color = Color.White,
                fontSize = if (showEmail) 28.sp else 34.sp,
                fontWeight = FontWeight.ExtraBold,
                lineHeight = if (showEmail) 34.sp else 41.sp,
                letterSpacing = (-0.35).sp,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            )
            Text(
                if (showEmail) "Use seus dados para acessar o Pop Organize."
                else "Escolha como você quer continuar.",
                color = Color.White.copy(alpha = .56f),
                fontSize = 14.sp,
                lineHeight = 21.sp,
                modifier = Modifier.padding(top = 12.dp),
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            )
        }

        AnimatedVisibility(visible = showEmail) {
            Column(
                verticalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.padding(bottom = 4.dp),
            ) {
                DarkLoginField(
                    value = email,
                    onValueChange = { email = it },
                    label = "E-mail",
                    icon = Icons.Rounded.Email,
                    keyboardType = KeyboardType.Email,
                    imeAction = ImeAction.Next,
                )
                DarkLoginField(
                    value = password,
                    onValueChange = { password = it },
                    label = "Senha",
                    icon = Icons.Rounded.Lock,
                    isPassword = true,
                    imeAction = ImeAction.Done,
                )
                LoginActionButton(
                    text = "Entrar",
                    background = PopBlue,
                    foreground = Color.White,
                    onClick = {
                        Toast.makeText(
                            context,
                            "Não foi possível acessar a nuvem. Verifique a configuração da API.",
                            Toast.LENGTH_LONG,
                        ).show()
                    },
                )
                Surface(
                    onClick = { showEmail = false },
                    color = Color.Transparent,
                    contentColor = Color.White.copy(alpha = .68f),
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier.fillMaxWidth().height(44.dp),
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Text("Voltar para outras opções", fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }

        if (!showEmail) {
            LoginActionButton(
                text = "Continuar com Google",
                background = Color.White,
                foreground = Color(0xFF202124),
                googleLogo = true,
                onClick = {
                    Toast.makeText(
                        context,
                        "Login com Google indisponível. Verifique a conexão e tente novamente.",
                        Toast.LENGTH_LONG,
                    ).show()
                },
            )
            Spacer(Modifier.height(12.dp))
            LoginActionButton(
                text = "Entrar com e-mail",
                background = Color.White.copy(alpha = .1f),
                foreground = Color.White,
                icon = Icons.Rounded.Email,
                onClick = { showEmail = true },
            )
            Row(
                modifier = Modifier.fillMaxWidth().padding(vertical = 16.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                HorizontalDivider(Modifier.weight(1f), color = Color.White.copy(alpha = .12f))
                Text("ou", color = Color.White.copy(alpha = .38f), fontSize = 12.sp, modifier = Modifier.padding(horizontal = 12.dp))
                HorizontalDivider(Modifier.weight(1f), color = Color.White.copy(alpha = .12f))
            }
            Surface(
                onClick = onGuest,
                color = Color.Transparent,
                contentColor = Color.White.copy(alpha = .76f),
                shape = RoundedCornerShape(18.dp),
                modifier = Modifier.fillMaxWidth().height(48.dp)
                    .border(1.dp, Color.White.copy(alpha = .14f), RoundedCornerShape(18.dp)),
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text("Continuar sem uma conta", fontSize = 13.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
        Spacer(Modifier.height(18.dp))
        Text(
            "Ao continuar, você concorda com os Termos de Uso e a Política de Privacidade.",
            color = Color.White.copy(alpha = .36f),
            fontSize = 10.sp,
            lineHeight = 15.sp,
            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
        )
    }
}

@Composable
private fun LoginActionButton(
    text: String,
    background: Color,
    foreground: Color,
    onClick: () -> Unit,
    icon: ImageVector? = null,
    googleLogo: Boolean = false,
) {
    Surface(
        onClick = onClick,
        color = background,
        contentColor = foreground,
        shape = RoundedCornerShape(18.dp),
        modifier = Modifier.fillMaxWidth().height(56.dp),
    ) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            if (googleLogo) {
                Image(
                    painter = painterResource(R.drawable.google_logo),
                    contentDescription = null,
                    modifier = Modifier.align(Alignment.CenterStart).padding(start = 20.dp).size(22.dp),
                )
            } else if (icon != null) {
                Icon(
                    icon,
                    contentDescription = null,
                    tint = foreground.copy(alpha = .82f),
                    modifier = Modifier.align(Alignment.CenterStart).padding(start = 20.dp).size(21.dp),
                )
            }
            Text(
                text,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = .15.sp,
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DarkLoginField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    icon: ImageVector,
    keyboardType: KeyboardType = KeyboardType.Text,
    imeAction: ImeAction = ImeAction.Next,
    isPassword: Boolean = false,
) {
    TextField(
        value = value,
        onValueChange = onValueChange,
        placeholder = { Text(label) },
        leadingIcon = { Icon(icon, null) },
        singleLine = true,
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType, imeAction = imeAction),
        visualTransformation = if (isPassword) PasswordVisualTransformation() else androidx.compose.ui.text.input.VisualTransformation.None,
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
private fun PopMainContent(sessionMode: SessionMode, onRequireLogin: () -> Unit) {
    val context = LocalContext.current
    var destination by remember { mutableStateOf(PopDestination.Dashboard) }
    var workSpace by remember { mutableStateOf(WorkSpace.Personal) }
    var selectedCompanyIndex by remember { mutableIntStateOf(0) }
    var showCreateCompany by remember { mutableStateOf(false) }
    var newCompanyName by remember { mutableStateOf("") }
    val companyNames = remember { mutableStateListOf("Minha empresa") }
    val personalTasks = remember(sessionMode) {
        mutableStateListOf<PopTask>().apply {
            addAll(if (sessionMode == SessionMode.Guest) loadGuestTasks(context) else emptyList())
        }
    }
    val companyTaskGroups = remember(sessionMode) {
        mutableStateListOf<MutableList<PopTask>>(mutableStateListOf())
    }
    val tasks = if (workSpace == WorkSpace.Personal) {
        personalTasks
    } else {
        companyTaskGroups.getOrElse(selectedCompanyIndex) { companyTaskGroups.first() }
    }

    fun selectWorkSpace(next: WorkSpace) {
        if (next == WorkSpace.Company && sessionMode == SessionMode.Guest) {
            Toast.makeText(
                context,
                "Para acessar Empresa e convidar a equipe, faça login.",
                Toast.LENGTH_LONG,
            ).show()
            onRequireLogin()
        } else {
            workSpace = next
        }
    }

    fun selectCompany(index: Int) {
        if (sessionMode == SessionMode.Guest) {
            selectWorkSpace(WorkSpace.Company)
        } else {
            selectedCompanyIndex = index
            workSpace = WorkSpace.Company
        }
    }

    fun requestCreateCompany() {
        if (sessionMode == SessionMode.Guest) {
            Toast.makeText(
                context,
                "Faça login para criar e gerenciar uma empresa.",
                Toast.LENGTH_LONG,
            ).show()
            onRequireLogin()
        } else {
            showCreateCompany = true
        }
    }

    LaunchedEffect(personalTasks.toList(), sessionMode) {
        if (sessionMode == SessionMode.Guest) saveGuestTasks(context, personalTasks)
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
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(bottom = innerPadding.calculateBottomPadding()),
            ) {
                when (destination) {
                    PopDestination.Dashboard -> DashboardScreen(
                        tasks = tasks,
                        isGuest = sessionMode == SessionMode.Guest,
                        workSpace = workSpace,
                        onWorkSpaceChange = ::selectWorkSpace,
                        companyNames = companyNames,
                        selectedCompanyIndex = selectedCompanyIndex,
                        onCompanySelect = ::selectCompany,
                        onCreateCompany = ::requestCreateCompany,
                    )
                    PopDestination.Tasks -> TasksScreen(tasks, workSpace, ::selectWorkSpace, companyNames, selectedCompanyIndex, ::selectCompany, ::requestCreateCompany)
                    PopDestination.Calendar -> CalendarScreen(tasks, workSpace, ::selectWorkSpace, companyNames, selectedCompanyIndex, ::selectCompany, ::requestCreateCompany)
                    PopDestination.More -> MoreScreen(sessionMode, workSpace, ::selectWorkSpace, companyNames, selectedCompanyIndex, ::selectCompany, ::requestCreateCompany, onRequireLogin)
                }
            }
    }

    if (showCreateCompany) {
        AlertDialog(
            onDismissRequest = { showCreateCompany = false },
            title = { Text("Criar nova empresa", fontWeight = FontWeight.ExtraBold) },
            text = {
                TextField(
                    value = newCompanyName,
                    onValueChange = { newCompanyName = it },
                    placeholder = { Text("Nome da empresa") },
                    singleLine = true,
                    shape = RoundedCornerShape(16.dp),
                    colors = TextFieldDefaults.colors(
                        focusedContainerColor = PopBlueSoft,
                        unfocusedContainerColor = Color(0xFFF5FAFF),
                        focusedIndicatorColor = Color.Transparent,
                        unfocusedIndicatorColor = Color.Transparent,
                    ),
                )
            },
            confirmButton = {
                TextButton(
                    enabled = newCompanyName.trim().length >= 3,
                    onClick = {
                        companyNames.add(newCompanyName.trim())
                        companyTaskGroups.add(mutableStateListOf())
                        selectedCompanyIndex = companyNames.lastIndex
                        workSpace = WorkSpace.Company
                        newCompanyName = ""
                        showCreateCompany = false
                    },
                ) { Text("Criar", color = PopBlue, fontWeight = FontWeight.Bold) }
            },
            dismissButton = {
                TextButton(onClick = { showCreateCompany = false }) { Text("Cancelar") }
            },
            shape = RoundedCornerShape(26.dp),
            containerColor = Color.White,
        )
    }
}

@Composable
private fun WorkSpaceSelector(
    selected: WorkSpace,
    companyNames: List<String>,
    selectedCompanyIndex: Int,
    onSelect: (WorkSpace) -> Unit,
    onCompanySelect: (Int) -> Unit,
    onCreateCompany: () -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    Box {
        Surface(
            onClick = { expanded = true },
            color = Color.Transparent,
            contentColor = PopText,
            shape = RoundedCornerShape(14.dp),
        ) {
            Row(
                modifier = Modifier.padding(end = 5.dp, top = 2.dp, bottom = 2.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = if (selected == WorkSpace.Personal) "Meu espaço" else companyNames.getOrElse(selectedCompanyIndex) { "Empresa" },
                    fontSize = 25.sp,
                    fontWeight = FontWeight.ExtraBold,
                    letterSpacing = (-0.5).sp,
                )
                Spacer(Modifier.width(4.dp))
                Icon(Icons.Rounded.KeyboardArrowDown, "Trocar espaço", tint = PopBlue, modifier = Modifier.size(25.dp))
            }
        }

        DropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
            shape = RoundedCornerShape(20.dp),
            containerColor = Color.White,
        ) {
            Text(
                "SEUS ESPAÇOS",
                color = PopMuted,
                fontSize = 10.sp,
                fontWeight = FontWeight.ExtraBold,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
            )
            DropdownMenuItem(
                text = {
                    Column {
                        Text("Meu espaço", fontWeight = FontWeight.Bold)
                        Text("Tarefas pessoais", color = PopMuted, fontSize = 11.sp)
                    }
                },
                leadingIcon = { Icon(Icons.Rounded.PersonOutline, null, tint = PopBlue) },
                trailingIcon = {
                    if (selected == WorkSpace.Personal) Icon(Icons.Rounded.Check, null, tint = PopBlue)
                },
                onClick = {
                    expanded = false
                    onSelect(WorkSpace.Personal)
                },
            )
            companyNames.forEachIndexed { index, companyName ->
                DropdownMenuItem(
                    text = {
                        Column {
                            Text(companyName, fontWeight = FontWeight.Bold)
                            Text("Empresa e equipe", color = PopMuted, fontSize = 11.sp)
                        }
                    },
                    leadingIcon = { Icon(Icons.Rounded.Business, null, tint = PopBlue) },
                    trailingIcon = {
                        if (selected == WorkSpace.Company && selectedCompanyIndex == index) {
                            Icon(Icons.Rounded.Check, null, tint = PopBlue)
                        }
                    },
                    onClick = {
                        expanded = false
                        onCompanySelect(index)
                    },
                )
            }
            HorizontalDivider(color = PopBorder, modifier = Modifier.padding(vertical = 5.dp))
            DropdownMenuItem(
                text = { Text("Criar nova empresa", color = PopBlue, fontWeight = FontWeight.ExtraBold) },
                leadingIcon = { Icon(Icons.Rounded.Add, null, tint = PopBlue) },
                onClick = {
                    expanded = false
                    onCreateCompany()
                },
            )
        }
    }
}

@Composable
private fun WorkSpaceHeader(
    subtitle: String,
    selected: WorkSpace,
    companyNames: List<String>,
    selectedCompanyIndex: Int,
    onSelect: (WorkSpace) -> Unit,
    onCompanySelect: (Int) -> Unit,
    onCreateCompany: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color.White)
            .padding(WindowInsets.statusBars.asPaddingValues())
            .padding(horizontal = 20.dp, vertical = 14.dp),
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                WorkSpaceSelector(selected, companyNames, selectedCompanyIndex, onSelect, onCompanySelect, onCreateCompany)
                Text(text = subtitle, color = PopMuted, fontSize = 13.sp)
            }
            IconButton(
                onClick = {},
                modifier = Modifier.clip(CircleShape).background(PopBlueSoft),
            ) {
                Icon(Icons.Rounded.NotificationsNone, "Notificações", tint = PopBlue)
            }
        }
    }
}

@Composable
private fun DashboardScreen(
    tasks: List<PopTask>,
    isGuest: Boolean,
    workSpace: WorkSpace,
    onWorkSpaceChange: (WorkSpace) -> Unit,
    companyNames: List<String>,
    selectedCompanyIndex: Int,
    onCompanySelect: (Int) -> Unit,
    onCreateCompany: () -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(bottom = 28.dp),
    ) {
        item {
            WorkSpaceHeader(
                subtitle = when {
                    workSpace == WorkSpace.Company -> "Atividades e equipe da empresa"
                    isGuest -> "Suas tarefas salvas somente neste aparelho"
                    else -> "Suas tarefas pessoais sincronizadas na nuvem"
                },
                selected = workSpace,
                companyNames = companyNames,
                selectedCompanyIndex = selectedCompanyIndex,
                onSelect = onWorkSpaceChange,
                onCompanySelect = onCompanySelect,
                onCreateCompany = onCreateCompany,
            )
        }
        item {
            Column(modifier = Modifier.padding(horizontal = 20.dp)) {
                HeroCard(tasks.count { !it.completed })
                Spacer(Modifier.height(18.dp))
                Text("Visão geral", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(10.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    MetricCard("Concluídas", tasks.count { it.completed }.toString(), Icons.Rounded.CheckCircle, Color(0xFF18A66A), Modifier.weight(1f))
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
private fun TasksScreen(
    tasks: MutableList<PopTask>,
    workSpace: WorkSpace,
    onWorkSpaceChange: (WorkSpace) -> Unit,
    companyNames: List<String>,
    selectedCompanyIndex: Int,
    onCompanySelect: (Int) -> Unit,
    onCreateCompany: () -> Unit,
) {
    var query by remember { mutableStateOf("") }
    var showCreate by remember { mutableStateOf(false) }
    var newTaskTitle by remember { mutableStateOf("") }
    var newTaskPriority by remember { mutableStateOf("Média") }
    var newTaskDateOffset by remember { mutableIntStateOf(0) }
    val filtered = tasks.filter { it.title.contains(query, ignoreCase = true) }
    Box(Modifier.fillMaxSize()) {
        LazyColumn(contentPadding = PaddingValues(bottom = 92.dp)) {
            item {
                WorkSpaceHeader(
                    subtitle = if (workSpace == WorkSpace.Personal) "Tarefas pessoais • só você pode visualizar" else "Tarefas e prioridades da empresa",
                    selected = workSpace,
                    companyNames = companyNames,
                    selectedCompanyIndex = selectedCompanyIndex,
                    onSelect = onWorkSpaceChange,
                    onCompanySelect = onCompanySelect,
                    onCreateCompany = onCreateCompany,
                )
            }
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
            onClick = { showCreate = true },
            containerColor = PopBlue,
            contentColor = Color.White,
            shape = CircleShape,
            modifier = Modifier.align(Alignment.BottomEnd).padding(20.dp),
        ) { Icon(Icons.Rounded.Add, "Nova tarefa") }
    }

    if (showCreate) {
        AlertDialog(
            onDismissRequest = { showCreate = false },
            title = {
                Text(
                    if (workSpace == WorkSpace.Personal) "Nova tarefa pessoal" else "Nova tarefa da empresa",
                    fontWeight = FontWeight.ExtraBold,
                )
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    TextField(
                        value = newTaskTitle,
                        onValueChange = { newTaskTitle = it },
                        placeholder = { Text("O que você precisa fazer?") },
                        singleLine = true,
                        shape = RoundedCornerShape(16.dp),
                        colors = TextFieldDefaults.colors(
                            focusedContainerColor = PopBlueSoft,
                            unfocusedContainerColor = Color(0xFFF5FAFF),
                            focusedIndicatorColor = Color.Transparent,
                            unfocusedIndicatorColor = Color.Transparent,
                        ),
                    )
                    Text("Prioridade", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("Baixa", "Média", "Alta").forEach { priority ->
                            ChoicePill(priority, newTaskPriority == priority) { newTaskPriority = priority }
                        }
                    }
                    Text("Data", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("Hoje" to 0, "Amanhã" to 1, "+7 dias" to 7).forEach { (label, offset) ->
                            ChoicePill(label, newTaskDateOffset == offset) { newTaskDateOffset = offset }
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(
                    enabled = newTaskTitle.trim().length >= 3,
                    onClick = {
                        tasks.add(
                            0,
                            PopTask(
                                id = (tasks.maxOfOrNull { it.id } ?: 0) + 1,
                                title = newTaskTitle.trim(),
                                department = if (workSpace == WorkSpace.Personal) "Pessoal" else "Empresa",
                                dueLabel = when (newTaskDateOffset) {
                                    0 -> "Hoje"
                                    1 -> "Amanhã"
                                    else -> "Em 7 dias"
                                },
                                priority = newTaskPriority,
                                dueDate = LocalDate.now().plusDays(newTaskDateOffset.toLong()).toString(),
                            ),
                        )
                        newTaskTitle = ""
                        newTaskPriority = "Média"
                        newTaskDateOffset = 0
                        showCreate = false
                    },
                ) { Text("Criar", color = PopBlue, fontWeight = FontWeight.Bold) }
            },
            dismissButton = {
                TextButton(onClick = { showCreate = false }) { Text("Cancelar") }
            },
            shape = RoundedCornerShape(26.dp),
            containerColor = Color.White,
        )
    }
}

@Composable
private fun ChoicePill(label: String, selected: Boolean, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        color = if (selected) PopBlue else PopBlueSoft,
        contentColor = if (selected) Color.White else PopBlueDark,
        shape = CircleShape,
    ) {
        Text(
            label,
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
        )
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
private fun CalendarScreen(
    tasks: List<PopTask>,
    workSpace: WorkSpace,
    onWorkSpaceChange: (WorkSpace) -> Unit,
    companyNames: List<String>,
    selectedCompanyIndex: Int,
    onCompanySelect: (Int) -> Unit,
    onCreateCompany: () -> Unit,
) {
    var month by remember { mutableStateOf(YearMonth.now()) }
    val locale = remember { Locale("pt", "BR") }
    Column(Modifier.fillMaxSize()) {
        WorkSpaceHeader(
            subtitle = if (workSpace == WorkSpace.Personal) "Seu calendário pessoal" else "Calendário e prazos da empresa",
            selected = workSpace,
            companyNames = companyNames,
            selectedCompanyIndex = selectedCompanyIndex,
            onSelect = onWorkSpaceChange,
            onCompanySelect = onCompanySelect,
            onCreateCompany = onCreateCompany,
        )
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
        CalendarGrid(month, tasks)
        Column(Modifier.padding(20.dp)) {
            SectionTitle("Próximas tarefas")
            Spacer(Modifier.height(6.dp))
            tasks.take(3).forEach { TaskRow(it) }
        }
    }
}

@Composable
private fun CalendarGrid(month: YearMonth, tasks: List<PopTask>) {
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
                    val hasTask = day != null && tasks.any { task ->
                        runCatching { LocalDate.parse(task.dueDate) }.getOrNull() == month.atDay(day)
                    }
                    Box(Modifier.weight(1f).height(42.dp), contentAlignment = Alignment.Center) {
                        if (day != null) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Box(
                                    Modifier.size(30.dp).clip(CircleShape).background(if (selected) PopBlue else Color.Transparent),
                                    contentAlignment = Alignment.Center,
                                ) { Text(day.toString(), color = if (selected) Color.White else PopText, fontSize = 12.sp, fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal) }
                                Box(
                                    Modifier
                                        .size(4.dp)
                                        .clip(CircleShape)
                                        .background(if (hasTask) PopBlue else Color.Transparent),
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun MoreScreen(
    sessionMode: SessionMode,
    workSpace: WorkSpace,
    onWorkSpaceChange: (WorkSpace) -> Unit,
    companyNames: List<String>,
    selectedCompanyIndex: Int,
    onCompanySelect: (Int) -> Unit,
    onCreateCompany: () -> Unit,
    onRequireLogin: () -> Unit,
) {
    val isGuest = sessionMode == SessionMode.Guest
    LazyColumn(Modifier.fillMaxSize()) {
        item {
            WorkSpaceHeader(
                subtitle = if (isGuest) "Dados locais e configurações" else "Conta, equipe e configurações",
                selected = workSpace,
                companyNames = companyNames,
                selectedCompanyIndex = selectedCompanyIndex,
                onSelect = onWorkSpaceChange,
                onCompanySelect = onCompanySelect,
                onCreateCompany = onCreateCompany,
            )
        }
        item {
            Row(Modifier.padding(20.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(58.dp).clip(CircleShape).background(Brush.linearGradient(listOf(Color(0xFF45ADFF), PopBlue))), contentAlignment = Alignment.Center) {
                    Icon(
                        if (isGuest) Icons.Rounded.PersonOutline else Icons.Rounded.Groups,
                        null,
                        tint = Color.White,
                    )
                }
                Spacer(Modifier.width(14.dp))
                Column {
                    Text(if (isGuest) "Modo sem conta" else "Conta conectada", fontWeight = FontWeight.ExtraBold, fontSize = 18.sp)
                    Text(if (isGuest) "Dados salvos neste celular" else "Sincronização em nuvem", color = PopMuted, fontSize = 12.sp)
                }
            }
            Column(Modifier.padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                if (isGuest) {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = PopBlueSoft),
                        shape = RoundedCornerShape(22.dp),
                        modifier = Modifier.fillMaxWidth().border(1.dp, PopBlue.copy(alpha = .18f), RoundedCornerShape(22.dp)),
                    ) {
                        Column(Modifier.padding(18.dp)) {
                            Icon(Icons.Rounded.Lock, null, tint = PopBlue)
                            Spacer(Modifier.height(10.dp))
                            Text("Equipe e convites precisam de login", fontWeight = FontWeight.ExtraBold, fontSize = 15.sp)
                            Text(
                                "Sem conta, você cria somente suas atividades pessoais e elas ficam neste aparelho.",
                                color = PopMuted,
                                fontSize = 12.sp,
                                lineHeight = 18.sp,
                                modifier = Modifier.padding(top = 5.dp),
                            )
                            Spacer(Modifier.height(12.dp))
                            Surface(
                                onClick = onRequireLogin,
                                color = PopBlue,
                                contentColor = Color.White,
                                shape = RoundedCornerShape(14.dp),
                            ) {
                                Text("Fazer login", fontWeight = FontWeight.Bold, fontSize = 13.sp, modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp))
                            }
                        }
                    }
                    MoreItem(Icons.Rounded.PersonOutline, "Minhas atividades", "Conteúdo pessoal salvo localmente")
                } else {
                    MoreItem(Icons.Rounded.Business, "Empresa", "Dados e setores da organização")
                    MoreItem(Icons.Rounded.Groups, "Equipe", "Funcionários, grupos e convites")
                    MoreItem(Icons.Rounded.PersonOutline, "Meu perfil", "Conta e preferências")
                }
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
            .padding(horizontal = 12.dp)
            .padding(bottom = WindowInsets.navigationBars.asPaddingValues().calculateBottomPadding().coerceAtLeast(8.dp)),
    ) {
        Surface(
            color = Color.White.copy(alpha = .98f),
            shadowElevation = 22.dp,
            tonalElevation = 3.dp,
            shape = RoundedCornerShape(32.dp),
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, PopBlue.copy(alpha = .16f), RoundedCornerShape(32.dp)),
        ) {
            Row(
                Modifier.padding(horizontal = 7.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                PopDestination.entries.forEach { item ->
                    val active = selected == item
                    val scale by animateFloatAsState(
                        targetValue = if (active) 1.07f else 1f,
                        animationSpec = spring(dampingRatio = .72f, stiffness = 420f),
                        label = "nav-scale",
                    )
                    val itemColor by animateColorAsState(
                        targetValue = if (active) PopBlue else Color.Transparent,
                        animationSpec = tween(180),
                        label = "nav-background",
                    )
                    val contentColor by animateColorAsState(
                        targetValue = if (active) Color.White else PopMuted,
                        animationSpec = tween(160),
                        label = "nav-content",
                    )
                    Surface(
                        onClick = { if (!active) onSelect(item) },
                        color = itemColor,
                        contentColor = contentColor,
                        shape = RoundedCornerShape(23.dp),
                        modifier = Modifier
                            .weight(1f)
                            .height(64.dp)
                            .scale(scale),
                    ) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.Center,
                        ) {
                            Icon(
                                item.icon,
                                item.label,
                                tint = contentColor,
                                modifier = Modifier.size(if (active) 25.dp else 24.dp),
                            )
                            Spacer(Modifier.height(3.dp))
                            Text(
                                item.label,
                                color = contentColor,
                                fontSize = 10.sp,
                                fontWeight = if (active) FontWeight.ExtraBold else FontWeight.SemiBold,
                                maxLines = 1,
                            )
                        }
                    }
                }
            }
        }
    }
}

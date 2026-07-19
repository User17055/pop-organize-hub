package br.com.poporganize.app.ui

import android.app.Activity
import android.content.Context
import android.graphics.drawable.ColorDrawable
import android.provider.OpenableColumns
import android.media.RingtoneManager
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.Crossfade
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateDpAsState
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
import androidx.compose.foundation.Canvas
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
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.AccessTime
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.ArrowBack
import androidx.compose.material.icons.rounded.ArrowForward
import androidx.compose.material.icons.rounded.AttachFile
import androidx.compose.material.icons.rounded.Business
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.CalendarMonth
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.ChevronLeft
import androidx.compose.material.icons.rounded.ChevronRight
import androidx.compose.material.icons.rounded.Groups
import androidx.compose.material.icons.rounded.Home
import androidx.compose.material.icons.rounded.MoreHoriz
import androidx.compose.material.icons.rounded.NotificationsActive
import androidx.compose.material.icons.rounded.PendingActions
import androidx.compose.material.icons.rounded.PersonOutline
import androidx.compose.material.icons.rounded.Repeat
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material.icons.rounded.Settings
import androidx.compose.material.icons.rounded.TaskAlt
import androidx.compose.material.icons.rounded.Email
import androidx.compose.material.icons.rounded.Description
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
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.material3.TimePicker
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.material3.rememberTimePickerState
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
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.geometry.Offset
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
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogWindowProvider
import androidx.compose.ui.window.DialogProperties
import androidx.core.view.WindowCompat
import br.com.poporganize.app.R
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.LocalTime
import java.time.YearMonth
import java.time.temporal.ChronoUnit
import java.time.format.TextStyle
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlin.math.absoluteValue
import kotlin.math.cos
import kotlin.math.sin
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
    val description: String = "",
    val assignee: String = "Eu",
    val recurrence: String = "Não repetir",
    val reminder: String = "Sem lembrete",
    val attachmentName: String = "",
    val dueTime: String = "",
    val duration: String = "Sem duração",
    val recurrenceRule: String = "Não repetir",
    val recurrenceDetail: String = "",
    val recurrenceInterval: Int = 1,
    val recurrenceEndMode: String = "Nunca",
    val recurrenceEndValue: String = "",
    val recurrenceOccurrence: Int = 1,
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

private fun normalizedDueDate(dueLabel: String, storedDate: String?): String {
    val today = LocalDate.now()
    val normalizedLabel = dueLabel.lowercase(Locale("pt", "BR"))
    val inferred = when {
        normalizedLabel.startsWith("hoje") -> today
        normalizedLabel.startsWith("amanhã") -> today.plusDays(1)
        normalizedLabel.startsWith("em 7") -> today.plusDays(7)
        normalizedLabel.startsWith("sex") -> {
            val daysUntilFriday = (5 - today.dayOfWeek.value + 7) % 7
            today.plusDays(daysUntilFriday.toLong())
        }
        else -> null
    }
    return (inferred ?: runCatching { storedDate?.let(LocalDate::parse) }.getOrNull() ?: today).toString()
}

private fun dueLabelForDate(date: LocalDate): String {
    val today = LocalDate.now()
    return when (date) {
        today -> "Hoje"
        today.plusDays(1) -> "Amanhã"
        else -> "${date.dayOfMonth}/${date.monthValue}"
    }
}

private fun nextRecurrenceDate(task: PopTask): LocalDate? {
    val currentDate = runCatching { LocalDate.parse(task.dueDate) }.getOrNull() ?: return null
    val interval = task.recurrenceInterval.coerceAtLeast(1)
    val nextDate = when (task.recurrenceRule) {
        "Diária" -> currentDate.plusDays(interval.toLong())
        "Semanal" -> {
            val dayMap = mapOf("S" to 1, "T" to 2, "Q" to 3, "Q2" to 4, "S2" to 5, "Sá" to 6, "D" to 7)
            val selectedDays = task.recurrenceDetail.split(",").mapNotNull(dayMap::get).sorted()
                .ifEmpty { listOf(currentDate.dayOfWeek.value) }
            val weekStart = currentDate.minusDays((currentDate.dayOfWeek.value - 1).toLong())
            val laterThisWeek = selectedDays.firstOrNull { it > currentDate.dayOfWeek.value }
            if (laterThisWeek != null) {
                weekStart.plusDays((laterThisWeek - 1).toLong())
            } else {
                weekStart.plusWeeks(interval.toLong()).plusDays((selectedDays.first() - 1).toLong())
            }
        }
        "Mensal" -> {
            val targetMonth = currentDate.plusMonths(interval.toLong())
            val targetDay = task.recurrenceDetail.toIntOrNull()?.coerceIn(1, targetMonth.lengthOfMonth())
                ?: currentDate.dayOfMonth.coerceAtMost(targetMonth.lengthOfMonth())
            targetMonth.withDayOfMonth(targetDay)
        }
        "Anual" -> currentDate.plusYears(interval.toLong())
        else -> return null
    }

    val nextOccurrence = task.recurrenceOccurrence + 1
    return when (task.recurrenceEndMode) {
        "Após" -> if (nextOccurrence <= (task.recurrenceEndValue.toIntOrNull() ?: 1)) nextDate else null
        "Em uma data" -> {
            val endDate = runCatching { LocalDate.parse(task.recurrenceEndValue) }.getOrNull()
            if (endDate == null || nextDate <= endDate) nextDate else null
        }
        else -> nextDate
    }
}

private fun loadGuestTasks(context: Context): List<PopTask> {
    val raw = context.getSharedPreferences(LOCAL_PREFERENCES, Context.MODE_PRIVATE)
        .getString(GUEST_TASKS_STORAGE, null) ?: return defaultGuestTasks()
    return runCatching {
        val items = JSONArray(raw)
        List(items.length()) { index ->
            val item = items.getJSONObject(index)
            val dueLabel = item.getString("dueLabel")
            val storedDueDate = if (item.has("dueDate") && !item.isNull("dueDate")) item.getString("dueDate") else null
            PopTask(
                id = item.getInt("id"),
                title = item.getString("title"),
                department = "Pessoal",
                dueLabel = dueLabel,
                priority = item.getString("priority"),
                dueDate = normalizedDueDate(dueLabel, storedDueDate),
                completed = item.optBoolean("completed"),
                description = item.optString("description"),
                assignee = item.optString("assignee", "Eu"),
                recurrence = item.optString("recurrence", "Não repetir"),
                reminder = item.optString("reminder", "Sem lembrete"),
                attachmentName = item.optString("attachmentName"),
                dueTime = item.optString("dueTime"),
                duration = item.optString("duration", "Sem duração"),
                recurrenceRule = item.optString("recurrenceRule", "Não repetir"),
                recurrenceDetail = item.optString("recurrenceDetail"),
                recurrenceInterval = item.optInt("recurrenceInterval", 1).coerceAtLeast(1),
                recurrenceEndMode = item.optString("recurrenceEndMode", "Nunca"),
                recurrenceEndValue = item.optString("recurrenceEndValue"),
                recurrenceOccurrence = item.optInt("recurrenceOccurrence", 1).coerceAtLeast(1),
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
                .put("completed", task.completed)
                .put("description", task.description)
                .put("assignee", task.assignee)
                .put("recurrence", task.recurrence)
                .put("reminder", task.reminder)
                .put("attachmentName", task.attachmentName)
                .put("dueTime", task.dueTime)
                .put("duration", task.duration)
                .put("recurrenceRule", task.recurrenceRule)
                .put("recurrenceDetail", task.recurrenceDetail)
                .put("recurrenceInterval", task.recurrenceInterval)
                .put("recurrenceEndMode", task.recurrenceEndMode)
                .put("recurrenceEndValue", task.recurrenceEndValue)
                .put("recurrenceOccurrence", task.recurrenceOccurrence),
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

        SystemBarAppearance(darkBackground = true)

        AnimatedContent(
            targetState = stage,
            transitionSpec = {
                if (initialState == AppStage.Splash) {
                    fadeIn(
                        animationSpec = tween(420, delayMillis = 90, easing = FastOutSlowInEasing),
                    ) togetherWith (
                        fadeOut(tween(520, easing = FastOutSlowInEasing)) +
                            scaleOut(tween(520, easing = FastOutSlowInEasing), targetScale = .94f)
                        )
                } else if (targetState == AppStage.Main || initialState == AppStage.Main) {
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
            Crossfade(
                targetState = destination,
                animationSpec = tween(170, easing = FastOutSlowInEasing),
                label = "page-crossfade",
                modifier = Modifier
                    .fillMaxSize()
                    .padding(bottom = innerPadding.calculateBottomPadding()),
            ) { page ->
                when (page) {
                    PopDestination.Dashboard -> DashboardScreen(
                        tasks = tasks,
                        isGuest = sessionMode == SessionMode.Guest,
                        workSpace = workSpace,
                        onWorkSpaceChange = ::selectWorkSpace,
                        companyNames = companyNames,
                        selectedCompanyIndex = selectedCompanyIndex,
                        onCompanySelect = ::selectCompany,
                        onCreateCompany = ::requestCreateCompany,
                        onViewTasks = { destination = PopDestination.Tasks },
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
                        unfocusedContainerColor = PopSurfaceAlt,
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
            containerColor = PopSurface,
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
            containerColor = PopSurface,
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
            .background(PopBackground)
            .padding(WindowInsets.statusBars.asPaddingValues())
            .padding(horizontal = 20.dp, vertical = 14.dp),
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                WorkSpaceSelector(selected, companyNames, selectedCompanyIndex, onSelect, onCompanySelect, onCreateCompany)
            }
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(CircleShape)
                    .background(PopSurfaceAlt)
                    .border(1.dp, PopBorder, CircleShape)
                    .clickable { },
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    Icons.Rounded.PersonOutline,
                    "Conta",
                    tint = PopText,
                    modifier = Modifier.size(25.dp),
                )
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
    onViewTasks: () -> Unit,
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
                    else -> "Suas tarefas sincronizadas na nuvem"
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
            Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp)) {
                HeroCard(tasks, if (isGuest) "Visitante" else "Usuário", onViewTasks)
                Spacer(Modifier.height(18.dp))
                Text("Visão geral", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(10.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    MetricCard("Concluídas", tasks.count { it.completed }, tasks.size, Icons.Rounded.CheckCircle, Color(0xFF18A66A), Modifier.weight(1f))
                    MetricCard("Pendentes", tasks.count { !it.completed }, tasks.size, Icons.Rounded.PendingActions, Color(0xFFFF9F1C), Modifier.weight(1f))
                }
                Spacer(Modifier.height(20.dp))
                SectionTitle("Tarefas recentes", "Ver todas", onViewTasks)
                Spacer(Modifier.height(8.dp))
                tasks.take(3).forEachIndexed { index, task ->
                    TaskRow(task = task, onClick = onViewTasks)
                    if (index < 2) HorizontalDivider(color = PopBorder.copy(alpha = .65f))
                }
            }
        }
    }
}

@Composable
private fun HeroCard(tasks: List<PopTask>, displayName: String, onStartNow: () -> Unit) {
    val today = LocalDate.now()
    val pendingToday = tasks.count { task ->
        !task.completed && runCatching { LocalDate.parse(task.dueDate) }.getOrNull() == today
    }
    val currentHour = LocalTime.now().hour
    val greeting = when (currentHour) {
        in 5..11 -> "Bom dia"
        in 12..17 -> "Boa tarde"
        else -> "Boa noite"
    }
    val summary = when (pendingToday) {
        0 -> "Nenhuma tarefa\npara hoje"
        1 -> "1 tarefa para\nhoje"
        else -> "$pendingToday tarefas para\nhoje"
    }
    Card(
        shape = RoundedCornerShape(28.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(Brush.linearGradient(listOf(Color(0xFF45ADFF), PopBlue, PopBlueDark)))
                .padding(22.dp),
        ) {
            Text(
                "$greeting, $displayName",
                color = Color.White.copy(alpha = .9f),
                fontSize = 17.sp,
                fontWeight = FontWeight.ExtraBold,
            )
            Spacer(Modifier.height(10.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(summary, color = Color.White, fontSize = 27.sp, fontWeight = FontWeight.ExtraBold, lineHeight = 31.sp)
                    Spacer(Modifier.height(16.dp))
                    Surface(color = Color.White.copy(alpha = .18f), shape = RoundedCornerShape(14.dp), onClick = onStartNow) {
                        Row(Modifier.padding(horizontal = 14.dp, vertical = 9.dp), verticalAlignment = Alignment.CenterVertically) {
                            Text("Começar agora", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                            Spacer(Modifier.width(6.dp))
                            Icon(Icons.Rounded.ArrowForward, null, tint = Color.White, modifier = Modifier.size(17.dp))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun MetricCard(label: String, value: Int, total: Int, icon: ImageVector, tint: Color, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = tint.copy(alpha = .07f)),
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(color = tint.copy(alpha = .16f), shape = RoundedCornerShape(11.dp)) {
                    Icon(icon, null, tint = tint, modifier = Modifier.padding(7.dp).size(20.dp))
                }
                Spacer(Modifier.width(9.dp))
                Text(label, fontSize = 12.sp, color = PopMuted, fontWeight = FontWeight.SemiBold)
            }
            Spacer(Modifier.height(13.dp))
            Row(verticalAlignment = Alignment.Bottom) {
                Text(value.toString(), fontSize = 27.sp, fontWeight = FontWeight.ExtraBold)
                Spacer(Modifier.width(5.dp))
                Text("de $total", fontSize = 11.sp, color = PopMuted, modifier = Modifier.padding(bottom = 4.dp))
            }
            Spacer(Modifier.height(10.dp))
            LinearProgressIndicator(
                progress = if (total == 0) 0f else value.toFloat() / total,
                modifier = Modifier.fillMaxWidth().height(5.dp).clip(CircleShape),
                color = tint,
                trackColor = PopBorder.copy(alpha = .5f),
            )
        }
    }
}

@Composable
private fun SectionTitle(title: String, action: String? = null, onAction: (() -> Unit)? = null) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text(title, fontWeight = FontWeight.Bold, fontSize = 17.sp, modifier = Modifier.weight(1f))
        action?.let {
            Text(
                it,
                color = PopBlue,
                fontWeight = FontWeight.SemiBold,
                fontSize = 13.sp,
                modifier = if (onAction != null) Modifier.clickable(onClick = onAction).padding(vertical = 6.dp) else Modifier,
            )
        }
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
    val context = LocalContext.current
    val keyboardController = LocalSoftwareKeyboardController.current
    var query by remember { mutableStateOf("") }
    var showCreate by remember { mutableStateOf(false) }
    var newTaskTitle by remember { mutableStateOf("") }
    var newTaskDescription by remember { mutableStateOf("") }
    var newTaskAssignee by remember { mutableStateOf("") }
    var newTaskPriority by remember { mutableStateOf("Média") }
    var newTaskDateOffset by remember { mutableIntStateOf(0) }
    var newTaskRecurrence by remember { mutableStateOf("Não repetir") }
    var newTaskRecurrenceDetail by remember { mutableStateOf("") }
    var newTaskReminder by remember { mutableStateOf("Sem lembrete") }
    var newTaskAttachment by remember { mutableStateOf("") }
    var newTaskTime by remember { mutableStateOf("") }
    var newTaskDuration by remember { mutableStateOf("Sem duração") }
    var newTaskRecurrenceEnd by remember { mutableStateOf("Nunca") }
    var newTaskRecurrenceInterval by remember { mutableIntStateOf(1) }
    var newTaskRecurrenceCount by remember { mutableIntStateOf(10) }
    var newTaskRecurrenceEndDate by remember { mutableStateOf(LocalDate.now().plusMonths(1).format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))) }
    var showAdvancedOptions by remember { mutableStateOf(false) }
    var showTaskDateSheet by remember { mutableStateOf(false) }
    var showPriorityMenu by remember { mutableStateOf(false) }
    var taskDateDraft by remember { mutableStateOf(LocalDate.now()) }
    var taskDateMonth by remember { mutableStateOf(YearMonth.now()) }
    var taskDateTab by remember { mutableStateOf("Data") }
    var showTaskTimePicker by remember { mutableStateOf(false) }
    var showTaskYearMenu by remember { mutableStateOf(false) }
    var showCompleted by remember { mutableStateOf(false) }
    var selectedFilter by remember { mutableStateOf("Todas") }
    var editingTaskId by remember { mutableStateOf<Int?>(null) }
    var completingTaskId by remember { mutableStateOf<Int?>(null) }
    var showDeleteTaskConfirmation by remember { mutableStateOf(false) }
    var expandedDetailSection by remember { mutableStateOf<String?>(null) }
    var editTitle by remember { mutableStateOf("") }
    var editDescription by remember { mutableStateOf("") }
    var editPriority by remember { mutableStateOf("Média") }
    var editDueDate by remember { mutableStateOf("") }
    var editDueTime by remember { mutableStateOf("") }
    var editReminder by remember { mutableStateOf("Sem lembrete") }
    var editRecurrence by remember { mutableStateOf("Não repetir") }
    var editRecurrenceDetail by remember { mutableStateOf("") }
    var editRecurrenceInterval by remember { mutableIntStateOf(1) }
    var editRecurrenceEnd by remember { mutableStateOf("Nunca") }
    var editRecurrenceEndValue by remember { mutableStateOf("") }
    var editAssignee by remember { mutableStateOf("") }
    var editAttachment by remember { mutableStateOf("") }
    val createTaskSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val taskDetailSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val taskDateSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val taskTimePickerState = rememberTimePickerState(initialHour = 9, initialMinute = 0, is24Hour = true)
    val newTaskTitleFocusRequester = remember { FocusRequester() }
    val taskActionScope = rememberCoroutineScope()
    val attachmentPicker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) {
            newTaskAttachment = context.contentResolver
                .query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)
                ?.use { cursor ->
                    val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                    if (cursor.moveToFirst() && nameIndex >= 0) cursor.getString(nameIndex) else null
                }
                ?: uri.lastPathSegment
                ?: "Anexo selecionado"
        }
    }
    val editAttachmentPicker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) {
            editAttachment = context.contentResolver
                .query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)
                ?.use { cursor ->
                    val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                    if (cursor.moveToFirst() && nameIndex >= 0) cursor.getString(nameIndex) else null
                }
                ?: uri.lastPathSegment
                ?: "Anexo selecionado"
        }
    }
    val today = LocalDate.now()

    fun playActionSound() {
        runCatching {
            val uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            RingtoneManager.getRingtone(context, uri)?.play()
        }
    }

    fun canChangeTask(task: PopTask): Boolean =
        workSpace == WorkSpace.Personal || task.assignee == "Eu" || task.assignee == "Sem responsável"

    LaunchedEffect(showCreate) {
        if (showCreate) {
            delay(250)
            newTaskTitleFocusRequester.requestFocus()
        }
    }

    val filtered = tasks
        .filter {
            it.title.contains(query, ignoreCase = true) ||
                it.description.contains(query, ignoreCase = true) ||
                it.assignee.contains(query, ignoreCase = true)
        }
        .filter { task ->
            val dueDate = runCatching { LocalDate.parse(task.dueDate) }.getOrNull()
            when (selectedFilter) {
                "Hoje" -> dueDate == today
                "Atrasadas" -> !task.completed && dueDate != null && dueDate < today
                "Próximas" -> !task.completed && dueDate != null && dueDate > today
                else -> true
            }
        }
    val pendingTasks = filtered.filterNot { it.completed }
    val completedTasks = filtered.filter { it.completed }

    fun toggleTask(task: PopTask) {
        if (!canChangeTask(task)) {
            Toast.makeText(context, "Somente o responsável pode concluir esta tarefa", Toast.LENGTH_SHORT).show()
            return
        }
        val markingCompleted = !task.completed
        if (markingCompleted) {
            if (completingTaskId == task.id) return
            completingTaskId = task.id
            playActionSound()
            taskActionScope.launch {
                delay(620)
                val currentIndex = tasks.indexOfFirst { it.id == task.id }
                if (currentIndex >= 0) {
                    tasks[currentIndex] = task.copy(completed = true)
                    val nextDate = nextRecurrenceDate(task)
                    if (nextDate != null && tasks.none { it.title == task.title && it.dueDate == nextDate.toString() && !it.completed }) {
                        tasks.add(
                            (currentIndex + 1).coerceAtMost(tasks.size),
                            task.copy(
                                id = (tasks.maxOfOrNull { it.id } ?: 0) + 1,
                                dueDate = nextDate.toString(),
                                dueLabel = dueLabelForDate(nextDate),
                                completed = false,
                                recurrenceOccurrence = task.recurrenceOccurrence + 1,
                            ),
                        )
                    }
                }
                completingTaskId = null
            }
        } else {
            val index = tasks.indexOfFirst { it.id == task.id }
            if (index >= 0) tasks[index] = task.copy(completed = false)
        }
    }

    fun openTask(task: PopTask) {
        editingTaskId = task.id
        expandedDetailSection = null
        editTitle = task.title
        editDescription = task.description
        editPriority = task.priority
        editDueDate = runCatching { LocalDate.parse(task.dueDate) }
            .getOrNull()?.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) ?: task.dueDate
        editDueTime = task.dueTime
        editReminder = task.reminder
        editRecurrence = task.recurrenceRule
        editRecurrenceDetail = task.recurrenceDetail
        editRecurrenceInterval = task.recurrenceInterval
        editRecurrenceEnd = task.recurrenceEndMode
        editRecurrenceEndValue = when (task.recurrenceEndMode) {
            "Em uma data" -> runCatching { LocalDate.parse(task.recurrenceEndValue) }
                .getOrNull()?.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) ?: task.recurrenceEndValue
            else -> task.recurrenceEndValue
        }
        editAssignee = task.assignee
        editAttachment = task.attachmentName
    }

    fun saveEditedTask() {
        val taskId = editingTaskId ?: return
        val index = tasks.indexOfFirst { it.id == taskId }
        if (index < 0 || editTitle.trim().length < 3) return
        val original = tasks[index]
        if (!canChangeTask(original)) {
            Toast.makeText(context, "Você pode visualizar, mas não editar esta tarefa", Toast.LENGTH_SHORT).show()
            return
        }
        val parsedDate = runCatching {
            LocalDate.parse(editDueDate, DateTimeFormatter.ofPattern("dd/MM/yyyy"))
        }.getOrNull() ?: runCatching { LocalDate.parse(original.dueDate) }.getOrNull() ?: LocalDate.now()
        val storedEndValue = when (editRecurrenceEnd) {
            "Após" -> editRecurrenceEndValue.filter(Char::isDigit).ifBlank { "10" }
            "Em uma data" -> runCatching {
                LocalDate.parse(editRecurrenceEndValue, DateTimeFormatter.ofPattern("dd/MM/yyyy")).toString()
            }.getOrElse { "" }
            else -> ""
        }
        val recurrenceSummary = if (editRecurrence == "Não repetir") {
            editRecurrence
        } else {
            buildList {
                add(editRecurrence)
                if (editRecurrenceInterval > 1) add("a cada $editRecurrenceInterval")
                if (editRecurrenceDetail.isNotBlank()) add(editRecurrenceDetail.trim())
                when (editRecurrenceEnd) {
                    "Após" -> add("${storedEndValue} ocorrências")
                    "Em uma data" -> add("até $editRecurrenceEndValue")
                }
            }.joinToString(" • ")
        }
        tasks[index] = original.copy(
            title = editTitle.trim(),
            description = editDescription.trim(),
            priority = editPriority,
            dueDate = parsedDate.toString(),
            dueLabel = dueLabelForDate(parsedDate),
            dueTime = editDueTime.trim(),
            reminder = editReminder,
            recurrence = recurrenceSummary,
            recurrenceRule = editRecurrence,
            recurrenceDetail = editRecurrenceDetail.trim(),
            recurrenceInterval = editRecurrenceInterval.coerceAtLeast(1),
            recurrenceEndMode = editRecurrenceEnd,
            recurrenceEndValue = storedEndValue,
            assignee = if (workSpace == WorkSpace.Personal) "Eu" else editAssignee.trim().ifBlank { "Sem responsável" },
            attachmentName = editAttachment,
        )
        editingTaskId = null
    }

    fun addTask() {
        if (newTaskTitle.trim().length < 3) return
        val selectedDueDate = LocalDate.now().plusDays(newTaskDateOffset.toLong())
        val recurrenceEndValue = when (newTaskRecurrenceEnd) {
            "Após" -> newTaskRecurrenceCount.toString()
            "Em uma data" -> runCatching {
                LocalDate.parse(newTaskRecurrenceEndDate, DateTimeFormatter.ofPattern("dd/MM/yyyy")).toString()
            }.getOrElse { "" }
            else -> ""
        }
        val recurrenceDetailSummary = when (newTaskRecurrence) {
            "Semanal" -> {
                val labels = mapOf("S" to "Seg", "T" to "Ter", "Q" to "Qua", "Q2" to "Qui", "S2" to "Sex", "Sá" to "Sáb", "D" to "Dom")
                newTaskRecurrenceDetail.split(",").mapNotNull(labels::get).joinToString(", ")
            }
            "Mensal" -> newTaskRecurrenceDetail.takeIf { it.isNotBlank() }?.let { "dia $it" }.orEmpty()
            else -> ""
        }
        tasks.add(
            0,
            PopTask(
                id = (tasks.maxOfOrNull { it.id } ?: 0) + 1,
                title = newTaskTitle.trim(),
                department = if (workSpace == WorkSpace.Personal) "Pessoal" else "Empresa",
                dueLabel = when (newTaskDateOffset) {
                    0 -> "Hoje"
                    1 -> "Amanhã"
                    else -> "${selectedDueDate.dayOfMonth}/${selectedDueDate.monthValue}"
                },
                priority = newTaskPriority,
                dueDate = selectedDueDate.toString(),
                description = newTaskDescription.trim(),
                assignee = if (workSpace == WorkSpace.Personal) {
                    "Eu"
                } else {
                    newTaskAssignee.trim().ifBlank { "Sem responsável" }
                },
                recurrence = if (newTaskRecurrence == "Não repetir") {
                    newTaskRecurrence
                } else {
                    buildList {
                        add(newTaskRecurrence)
                        if (newTaskRecurrenceInterval > 1) add("a cada $newTaskRecurrenceInterval")
                        if (recurrenceDetailSummary.isNotBlank()) add(recurrenceDetailSummary)
                        when (newTaskRecurrenceEnd) {
                            "Após" -> add("$newTaskRecurrenceCount ocorrências")
                            "Em uma data" -> add("até $newTaskRecurrenceEndDate")
                        }
                    }.joinToString(" • ")
                },
                reminder = newTaskReminder,
                attachmentName = newTaskAttachment,
                dueTime = newTaskTime,
                duration = newTaskDuration,
                recurrenceRule = newTaskRecurrence,
                recurrenceDetail = newTaskRecurrenceDetail,
                recurrenceInterval = newTaskRecurrenceInterval,
                recurrenceEndMode = newTaskRecurrenceEnd,
                recurrenceEndValue = recurrenceEndValue,
            ),
        )
        newTaskTitle = ""
        newTaskDescription = ""
        newTaskAssignee = ""
        newTaskPriority = "Média"
        newTaskDateOffset = 0
        newTaskRecurrence = "Não repetir"
        newTaskRecurrenceDetail = ""
        newTaskReminder = "Sem lembrete"
        newTaskAttachment = ""
        newTaskTime = ""
        newTaskDuration = "Sem duração"
        newTaskRecurrenceEnd = "Nunca"
        newTaskRecurrenceInterval = 1
        newTaskRecurrenceCount = 10
        newTaskRecurrenceEndDate = LocalDate.now().plusMonths(1).format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))
        showAdvancedOptions = false
        showCreate = false
    }

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
                        unfocusedContainerColor = PopSurfaceAlt,
                        focusedIndicatorColor = Color.Transparent,
                        unfocusedIndicatorColor = Color.Transparent,
                    ),
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 8.dp),
                )
                Row(Modifier.padding(horizontal = 20.dp, vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("Todas", "Hoje", "Atrasadas", "Próximas").forEach { filter ->
                        FilterChip(filter, selectedFilter == filter) { selectedFilter = filter }
                    }
                }
                Text("${pendingTasks.size} atividades pendentes", color = PopMuted, fontSize = 12.sp, modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp))
            }
            items(pendingTasks, key = { it.id }) { task ->
                val isCompleting = completingTaskId == task.id
                val taskSlotHeight by animateDpAsState(
                    targetValue = if (isCompleting) 0.dp else 94.dp,
                    animationSpec = tween(580, easing = FastOutSlowInEasing),
                    label = "taskSlotHeight",
                )
                Box(Modifier.fillMaxWidth().height(taskSlotHeight).clipToBounds().padding(horizontal = 20.dp, vertical = 6.dp)) {
                    TaskCard(task, isCompleting = isCompleting, onComplete = { toggleTask(task) }, onOpen = { openTask(task) })
                }
            }
            if (completedTasks.isNotEmpty()) {
                item {
                    Column(Modifier.padding(top = 12.dp, bottom = 8.dp)) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { showCompleted = !showCompleted }
                                .padding(horizontal = 20.dp, vertical = 14.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                "Concluídas",
                                fontWeight = FontWeight.Bold,
                                fontSize = 15.sp,
                                modifier = Modifier.weight(1f),
                            )
                            Text("${completedTasks.size}", color = PopMuted, fontSize = 12.sp)
                            Spacer(Modifier.width(6.dp))
                            Icon(
                                Icons.Rounded.KeyboardArrowDown,
                                if (showCompleted) "Ocultar concluídas" else "Mostrar concluídas",
                                tint = PopMuted,
                                modifier = Modifier
                                    .size(22.dp)
                                    .graphicsLayer { rotationZ = if (showCompleted) 180f else 0f },
                            )
                        }
                        AnimatedVisibility(visible = showCompleted) {
                            Column {
                                completedTasks.forEach { task ->
                                    Box(Modifier.padding(horizontal = 20.dp, vertical = 6.dp)) {
                                        TaskCard(task, isCompleting = false, onComplete = { toggleTask(task) }, onOpen = { openTask(task) })
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        FloatingActionButton(
            onClick = {
                showAdvancedOptions = false
                showCreate = true
            },
            containerColor = PopBlue,
            contentColor = Color.White,
            shape = CircleShape,
            modifier = Modifier.align(Alignment.BottomEnd).padding(20.dp),
        ) { Icon(Icons.Rounded.Add, "Nova tarefa") }
    }

    if (showCreate) {
        ModalBottomSheet(
            onDismissRequest = { showCreate = false },
            sheetState = createTaskSheetState,
            containerColor = PopSurface,
            shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp),
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 620.dp)
                    .verticalScroll(rememberScrollState())
                    .imePadding()
                    .padding(horizontal = 20.dp)
                    .padding(bottom = 20.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        if (workSpace == WorkSpace.Personal) "Nova tarefa" else "Nova tarefa da empresa",
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 17.sp,
                        modifier = Modifier.weight(1f),
                    )
                    Surface(
                        onClick = ::addTask,
                        enabled = newTaskTitle.trim().length >= 3,
                        color = if (newTaskTitle.trim().length >= 3) PopBlue else PopBorder,
                        contentColor = Color.White,
                        shape = RoundedCornerShape(12.dp),
                    ) {
                        Text("Adicionar", fontWeight = FontWeight.Bold, fontSize = 12.sp, modifier = Modifier.padding(horizontal = 14.dp, vertical = 9.dp))
                    }
                }
                TextField(
                    value = newTaskTitle,
                    onValueChange = { newTaskTitle = it },
                    placeholder = { Text("O que você gostaria de fazer?", color = PopMuted) },
                    singleLine = true,
                    textStyle = MaterialTheme.typography.bodyLarge.copy(fontWeight = FontWeight.SemiBold),
                    colors = TextFieldDefaults.colors(
                        focusedContainerColor = Color.Transparent,
                        unfocusedContainerColor = Color.Transparent,
                        focusedIndicatorColor = Color.Transparent,
                        unfocusedIndicatorColor = Color.Transparent,
                    ),
                    modifier = Modifier.fillMaxWidth().focusRequester(newTaskTitleFocusRequester),
                )
                HorizontalDivider(color = PopBorder.copy(alpha = .7f))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(5.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Surface(
                        onClick = {
                            taskDateDraft = LocalDate.now().plusDays(newTaskDateOffset.toLong())
                            taskDateMonth = YearMonth.from(taskDateDraft)
                            taskDateTab = "Data"
                            keyboardController?.hide()
                            showTaskDateSheet = true
                        },
                        color = PopBlueSoft,
                        contentColor = PopBlue,
                        shape = RoundedCornerShape(12.dp),
                    ) {
                        Row(Modifier.padding(horizontal = 10.dp, vertical = 9.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Rounded.CalendarMonth, null, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(5.dp))
                            val selectedDate = LocalDate.now().plusDays(newTaskDateOffset.toLong())
                            Text(
                                when (newTaskDateOffset) {
                                    0 -> "Hoje"
                                    1 -> "Amanhã"
                                    else -> "${selectedDate.dayOfMonth}/${selectedDate.monthValue}"
                                },
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                            )
                        }
                    }
                    Box {
                        TaskComposerIcon(
                            icon = Icons.Rounded.TaskAlt,
                            description = "Definir prioridade",
                            tint = when (newTaskPriority) {
                                "Alta" -> Color(0xFFE5484D)
                                "Média" -> Color(0xFFFF9F1C)
                                else -> Color(0xFF18A66A)
                            },
                        ) { showPriorityMenu = true }
                        DropdownMenu(
                            expanded = showPriorityMenu,
                            onDismissRequest = { showPriorityMenu = false },
                            shape = RoundedCornerShape(14.dp),
                            containerColor = PopSurface,
                        ) {
                            listOf(
                                "Alta" to Color(0xFFE5484D),
                                "Média" to Color(0xFFFF9F1C),
                                "Baixa" to Color(0xFF18A66A),
                            ).forEach { (priority, color) ->
                                DropdownMenuItem(
                                    text = { Text(priority, fontWeight = if (newTaskPriority == priority) FontWeight.Bold else FontWeight.Normal) },
                                    leadingIcon = { Box(Modifier.size(9.dp).background(color, CircleShape)) },
                                    trailingIcon = {
                                        if (newTaskPriority == priority) Icon(Icons.Rounded.Check, null, tint = PopBlue, modifier = Modifier.size(18.dp))
                                    },
                                    onClick = {
                                        newTaskPriority = priority
                                        showPriorityMenu = false
                                    },
                                )
                            }
                        }
                    }
                    if (workSpace == WorkSpace.Company) {
                        TaskComposerIcon(Icons.Rounded.PersonOutline, "Atribuir pessoa", PopBlue) { showAdvancedOptions = true }
                    }
                    TaskComposerIcon(Icons.Rounded.AttachFile, "Adicionar anexo", if (newTaskAttachment.isBlank()) PopMuted else PopBlue) {
                        attachmentPicker.launch(arrayOf("*/*"))
                    }
                    TaskComposerIcon(Icons.Rounded.MoreHoriz, "Mais opções", PopMuted) {
                        showAdvancedOptions = !showAdvancedOptions
                    }
                }
                AnimatedVisibility(visible = showAdvancedOptions) {
                    Column(
                        modifier = Modifier.fillMaxWidth().background(PopSurfaceAlt, RoundedCornerShape(18.dp)).padding(14.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        if (workSpace == WorkSpace.Company) {
                            TextField(
                                value = newTaskAssignee,
                                onValueChange = { newTaskAssignee = it },
                                label = { Text("Atribuir para") },
                                placeholder = { Text("Nome da pessoa") },
                                singleLine = true,
                                leadingIcon = { Icon(Icons.Rounded.PersonOutline, null, tint = PopBlue) },
                                shape = RoundedCornerShape(14.dp),
                                colors = TextFieldDefaults.colors(
                                    focusedContainerColor = PopBlueSoft,
                                    unfocusedContainerColor = PopSurface,
                                    focusedIndicatorColor = Color.Transparent,
                                    unfocusedIndicatorColor = Color.Transparent,
                                ),
                            )
                        }
                        if (newTaskAttachment.isNotBlank()) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Rounded.AttachFile, null, tint = PopBlue, modifier = Modifier.size(17.dp))
                                Spacer(Modifier.width(6.dp))
                                Text(newTaskAttachment, color = PopBlue, fontSize = 11.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            }
                        }
                    }
                }
            }
        }
    }

    if (editingTaskId != null) {
        Dialog(
            onDismissRequest = { editingTaskId = null },
            properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false),
        ) {
            val dialogView = LocalView.current
            SideEffect {
                (dialogView.parent as? DialogWindowProvider)?.window?.setBackgroundDrawable(ColorDrawable(android.graphics.Color.TRANSPARENT))
            }
            var detailVisible by remember(editingTaskId) { mutableStateOf(false) }
            LaunchedEffect(editingTaskId) { detailVisible = true }
            val detailAlpha by animateFloatAsState(
                targetValue = if (detailVisible) 1f else 0f,
                animationSpec = tween(240, easing = FastOutSlowInEasing),
                label = "taskDetailEntrance",
            )
            Surface(
                color = PopBackground,
                modifier = Modifier.fillMaxSize().graphicsLayer {
                    alpha = detailAlpha
                    translationY = (1f - detailAlpha) * 28f
                },
            ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(WindowInsets.statusBars.asPaddingValues())
                    .padding(WindowInsets.navigationBars.asPaddingValues())
                    .imePadding()
                    .padding(horizontal = 18.dp),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    IconButton(onClick = { editingTaskId = null }) {
                        Icon(Icons.Rounded.ArrowBack, "Voltar", tint = PopText, modifier = Modifier.size(28.dp))
                    }
                    Text(
                        tasks.firstOrNull { it.id == editingTaskId }?.department?.uppercase() ?: "DETALHES",
                        color = PopMuted,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        modifier = Modifier.weight(1f),
                    )
                    TextButton(onClick = ::saveEditedTask, enabled = editTitle.trim().length >= 3) {
                        Text("Salvar", color = PopBlue, fontWeight = FontWeight.ExtraBold)
                    }
                }
                LazyColumn(
                    modifier = Modifier.fillMaxWidth().weight(1f),
                    contentPadding = PaddingValues(bottom = 28.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    item {
                        val currentTask = tasks.firstOrNull { it.id == editingTaskId }
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Box(
                                modifier = Modifier.size(48.dp).clickable {
                                    currentTask?.let(::toggleTask)
                                },
                                contentAlignment = Alignment.Center,
                            ) {
                                Box(
                                    Modifier
                                        .size(31.dp)
                                        .background(if (currentTask?.completed == true) PopBlue else Color.Transparent, CircleShape)
                                        .border(2.dp, if (currentTask?.completed == true) PopBlue else PopMuted, CircleShape),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    if (currentTask?.completed == true) {
                                        Icon(Icons.Rounded.Check, "Concluída", tint = Color.White, modifier = Modifier.size(20.dp))
                                    }
                                }
                            }
                            TextField(
                                value = editTitle,
                                onValueChange = { editTitle = it },
                                placeholder = { Text("Nome da tarefa") },
                                minLines = 1,
                                maxLines = 3,
                                textStyle = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.ExtraBold),
                                colors = TextFieldDefaults.colors(
                                    focusedContainerColor = Color.Transparent,
                                    unfocusedContainerColor = Color.Transparent,
                                    focusedIndicatorColor = Color.Transparent,
                                    unfocusedIndicatorColor = Color.Transparent,
                                ),
                                modifier = Modifier.weight(1f),
                            )
                        }
                    }
                    item {
                        Surface(color = Color.Transparent, modifier = Modifier.fillMaxWidth()) {
                            Column {
                                DetailSettingRow(
                                    icon = Icons.Rounded.TaskAlt,
                                    label = "Prioridade",
                                    value = editPriority,
                                    expanded = expandedDetailSection == "priority",
                                ) {
                                    expandedDetailSection = if (expandedDetailSection == "priority") null else "priority"
                                }
                                AnimatedVisibility(visible = expandedDetailSection == "priority") {
                                    Row(
                                        modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp),
                                        horizontalArrangement = Arrangement.Center,
                                    ) {
                                        listOf("Baixa", "Média", "Alta").forEach { option ->
                                            PriorityChoicePill(option, editPriority == option) { editPriority = option }
                                            if (option != "Alta") Spacer(Modifier.width(8.dp))
                                        }
                                    }
                                }
                            }
                        }
                    }
                    item {
                        Surface(color = Color.Transparent, modifier = Modifier.fillMaxWidth()) {
                            Column {
                                DetailSettingRow(
                                    icon = Icons.Rounded.CalendarMonth,
                                    label = "Data de conclusão",
                                    value = listOf(editDueDate, editDueTime).filter { it.isNotBlank() }.joinToString(" • "),
                                    expanded = expandedDetailSection == "date",
                                ) {
                                    expandedDetailSection = if (expandedDetailSection == "date") null else "date"
                                }
                                AnimatedVisibility(visible = expandedDetailSection == "date") {
                                    Row(
                                        modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp),
                                        horizontalArrangement = Arrangement.spacedBy(9.dp),
                                    ) {
                                        TextField(
                                            value = editDueDate,
                                            onValueChange = { editDueDate = it.filter { char -> char.isDigit() || char == '/' }.take(10) },
                                            label = { Text("Data") },
                                            placeholder = { Text("dd/mm/aaaa") },
                                            singleLine = true,
                                            shape = RoundedCornerShape(12.dp),
                                            colors = taskEditorFieldColors(PopSurface),
                                            modifier = Modifier.weight(1.25f),
                                        )
                                        TextField(
                                            value = editDueTime,
                                            onValueChange = { editDueTime = it.filter { char -> char.isDigit() || char == ':' }.take(5) },
                                            label = { Text("Hora") },
                                            placeholder = { Text("--:--") },
                                            singleLine = true,
                                            shape = RoundedCornerShape(12.dp),
                                            colors = taskEditorFieldColors(PopSurface),
                                            modifier = Modifier.weight(.75f),
                                        )
                                    }
                                }
                            }
                        }
                    }
                    item {
                        Surface(color = Color.Transparent, modifier = Modifier.fillMaxWidth()) {
                            Column {
                                DetailSettingRow(
                                    icon = Icons.Rounded.NotificationsActive,
                                    label = "Lembrar-me",
                                    value = editReminder.takeUnless { it == "Sem lembrete" }.orEmpty(),
                                    expanded = expandedDetailSection == "reminder",
                                ) {
                                    expandedDetailSection = if (expandedDetailSection == "reminder") null else "reminder"
                                }
                                AnimatedVisibility(visible = expandedDetailSection == "reminder") {
                                    Column(
                                        modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp),
                                        verticalArrangement = Arrangement.spacedBy(7.dp),
                                        horizontalAlignment = Alignment.CenterHorizontally,
                                    ) {
                                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
                                            listOf("Sem lembrete", "No horário").forEach { option ->
                                                DetailChoicePill(option, editReminder == option) { editReminder = option }
                                                if (option != "No horário") Spacer(Modifier.width(7.dp))
                                            }
                                        }
                                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
                                            listOf("15 min", "1 hora antes", "1 dia antes").forEach { option ->
                                                DetailChoicePill(option, editReminder == option) { editReminder = option }
                                                if (option != "1 dia antes") Spacer(Modifier.width(7.dp))
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    item {
                        Surface(color = Color.Transparent, modifier = Modifier.fillMaxWidth()) {
                            Column {
                                DetailSettingRow(
                                    icon = Icons.Rounded.Repeat,
                                    label = "Repetir",
                                    value = editRecurrence.takeUnless { it == "Não repetir" }.orEmpty(),
                                    expanded = expandedDetailSection == "recurrence",
                                ) {
                                    expandedDetailSection = if (expandedDetailSection == "recurrence") null else "recurrence"
                                }
                                AnimatedVisibility(visible = expandedDetailSection == "recurrence") {
                                Column(
                                    modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp),
                                    verticalArrangement = Arrangement.spacedBy(10.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                ) {
                                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
                                    listOf("Não repetir", "Diária", "Semanal").forEach { option ->
                                        DetailChoicePill(option, editRecurrence == option) {
                                            editRecurrence = option
                                            if (option == "Não repetir") editRecurrenceDetail = ""
                                        }
                                        if (option != "Semanal") Spacer(Modifier.width(7.dp))
                                    }
                                }
                                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
                                    listOf("Mensal", "Anual").forEach { option ->
                                        DetailChoicePill(option, editRecurrence == option) { editRecurrence = option }
                                        if (option != "Anual") Spacer(Modifier.width(7.dp))
                                    }
                                }
                                AnimatedVisibility(visible = editRecurrence != "Não repetir") {
                                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                        RecurrenceNumberSelector(
                                            label = "Repetir a cada $editRecurrenceInterval",
                                            value = editRecurrenceInterval,
                                            onValueChange = { editRecurrenceInterval = it.coerceIn(1, 99) },
                                            accentColor = PopBlue,
                                        )
                                        TextField(
                                            value = editRecurrenceDetail,
                                            onValueChange = { editRecurrenceDetail = it },
                                            label = { Text("Dias ou regra personalizada") },
                                            placeholder = { Text("Ex.: segunda e quarta") },
                                            singleLine = true,
                                            shape = RoundedCornerShape(14.dp),
                                            colors = taskEditorFieldColors(PopSurface),
                                            modifier = Modifier.fillMaxWidth(),
                                        )
                                        Text("Quando termina?", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                        Row(horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                                            listOf("Nunca", "Após", "Em uma data").forEach { option ->
                                                DetailChoicePill(option, editRecurrenceEnd == option) {
                                                    editRecurrenceEnd = option
                                                    editRecurrenceEndValue = when (option) {
                                                        "Após" -> editRecurrenceEndValue.filter(Char::isDigit).ifBlank { "10" }
                                                        "Em uma data" -> if ('/' in editRecurrenceEndValue) editRecurrenceEndValue else LocalDate.now().plusMonths(1).format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))
                                                        else -> ""
                                                    }
                                                }
                                            }
                                        }
                                        AnimatedVisibility(visible = editRecurrenceEnd != "Nunca") {
                                            TextField(
                                                value = editRecurrenceEndValue,
                                                onValueChange = { value ->
                                                    editRecurrenceEndValue = if (editRecurrenceEnd == "Após") {
                                                        value.filter(Char::isDigit).take(3)
                                                    } else {
                                                        value.filter { it.isDigit() || it == '/' }.take(10)
                                                    }
                                                },
                                                label = { Text(if (editRecurrenceEnd == "Após") "Quantidade de ocorrências" else "Data final") },
                                                singleLine = true,
                                                shape = RoundedCornerShape(14.dp),
                                                colors = taskEditorFieldColors(PopSurface),
                                                modifier = Modifier.fillMaxWidth(),
                                            )
                                        }
                                    }
                                }
                                }
                            }
                        }
                    }
                    }
                    if (workSpace == WorkSpace.Company) {
                        item {
                            TextField(
                                value = editAssignee,
                                onValueChange = { editAssignee = it },
                                label = { Text("Responsável") },
                                leadingIcon = { Icon(Icons.Rounded.PersonOutline, null, tint = PopMuted) },
                                singleLine = true,
                                shape = RoundedCornerShape(16.dp),
                                colors = taskEditorFieldColors(),
                                modifier = Modifier.fillMaxWidth(),
                            )
                        }
                    }
                    item {
                        Surface(color = PopSurface, shape = RoundedCornerShape(18.dp), modifier = Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text("Anotação", color = PopMuted, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                TextField(
                                    value = editDescription,
                                    onValueChange = { editDescription = it },
                                    placeholder = { Text("Adicionar descrição, links ou observações") },
                                    minLines = 4,
                                    maxLines = 8,
                                    shape = RoundedCornerShape(14.dp),
                                    colors = taskEditorFieldColors(PopSurfaceAlt),
                                    modifier = Modifier.fillMaxWidth(),
                                )
                            }
                        }
                    }
                    item {
                        Surface(
                            onClick = { editAttachmentPicker.launch(arrayOf("*/*")) },
                            color = PopSurface,
                            contentColor = if (editAttachment.isBlank()) PopMuted else PopText,
                            shape = RoundedCornerShape(16.dp),
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Rounded.AttachFile, null, modifier = Modifier.size(19.dp))
                                Spacer(Modifier.width(8.dp))
                                Text(editAttachment.ifBlank { "Adicionar anexo" }, fontWeight = FontWeight.Bold, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            }
                        }
                    }
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(top = 18.dp),
                            horizontalArrangement = Arrangement.End,
                        ) {
                            Surface(
                                onClick = {
                                    val currentTask = tasks.firstOrNull { it.id == editingTaskId }
                                    if (currentTask != null && canChangeTask(currentTask)) {
                                        showDeleteTaskConfirmation = true
                                    } else {
                                        Toast.makeText(context, "Você não tem permissão para excluir esta tarefa", Toast.LENGTH_SHORT).show()
                                    }
                                },
                                color = Color.Transparent,
                                contentColor = Color(0xFFD87373),
                                shape = RoundedCornerShape(14.dp),
                            ) {
                                Row(Modifier.padding(horizontal = 13.dp, vertical = 9.dp), verticalAlignment = Alignment.CenterVertically) {
                                    Text("Excluir tarefa", fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                                }
                            }
                        }
                    }
                }
            }
            }
        }
    }

    if (showDeleteTaskConfirmation) {
        AlertDialog(
            onDismissRequest = { showDeleteTaskConfirmation = false },
            title = { Text("Excluir tarefa?", fontWeight = FontWeight.ExtraBold) },
            text = { Text("Tem certeza de que deseja excluir esta tarefa? Essa ação não pode ser desfeita.") },
            confirmButton = {
                TextButton(
                    onClick = {
                        val taskId = editingTaskId
                        if (taskId != null) {
                            tasks.removeAll { it.id == taskId }
                            playActionSound()
                        }
                        showDeleteTaskConfirmation = false
                        editingTaskId = null
                    },
                ) { Text("Excluir", color = Color(0xFFE5484D), fontWeight = FontWeight.Bold) }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteTaskConfirmation = false }) { Text("Cancelar", color = PopMuted) }
            },
            containerColor = PopSurface,
            shape = RoundedCornerShape(24.dp),
        )
    }

    if (showTaskDateSheet) {
        ModalBottomSheet(
            onDismissRequest = { showTaskDateSheet = false },
            sheetState = taskDateSheetState,
            containerColor = PopSurface,
            shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp),
            dragHandle = null,
        ) {
            Column(
                modifier = Modifier.fillMaxWidth().height(650.dp).imePadding().padding(horizontal = 20.dp).padding(top = 16.dp, bottom = 18.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    TextButton(onClick = { showTaskDateSheet = false }) {
                        Text("×", fontSize = 34.sp, fontWeight = FontWeight.Light, color = PopText)
                    }
                    Row(Modifier.weight(1f), horizontalArrangement = Arrangement.spacedBy(22.dp)) {
                        listOf("Data", "Recorrência").forEach { tab ->
                            val tabSelected = taskDateTab == tab
                            val tabColor by animateColorAsState(
                                targetValue = if (tabSelected) PopBlue else PopMuted,
                                animationSpec = tween(220),
                                label = "taskDateTabColor",
                            )
                            val indicatorWidth by animateDpAsState(
                                targetValue = if (tabSelected) 42.dp else 0.dp,
                                animationSpec = tween(260, easing = FastOutSlowInEasing),
                                label = "taskDateTabIndicator",
                            )
                            Column(
                                modifier = Modifier.clickable { taskDateTab = tab }.padding(horizontal = 4.dp, vertical = 8.dp),
                                horizontalAlignment = Alignment.CenterHorizontally,
                            ) {
                                Text(
                                    tab,
                                    color = tabColor,
                                    fontWeight = FontWeight.ExtraBold,
                                    fontSize = 16.sp,
                                )
                                Spacer(Modifier.height(4.dp))
                                Box(
                                    Modifier
                                        .height(3.dp)
                                        .width(indicatorWidth)
                                        .background(PopBlue, CircleShape),
                                )
                            }
                        }
                    }
                    IconButton(
                        onClick = {
                            newTaskDateOffset = ChronoUnit.DAYS.between(LocalDate.now(), taskDateDraft).toInt()
                            showTaskDateSheet = false
                        },
                    ) { Icon(Icons.Rounded.Check, "Confirmar data", tint = PopText, modifier = Modifier.size(27.dp)) }
                }

                Box(modifier = Modifier.fillMaxWidth().weight(1f).clipToBounds()) {
                    AnimatedContent(
                        targetState = taskDateTab,
                        transitionSpec = {
                            val movingToRecurrence = targetState == "Recorrência"
                            (slideInHorizontally(
                                animationSpec = tween(300, easing = FastOutSlowInEasing),
                                initialOffsetX = { if (movingToRecurrence) it / 4 else -it / 4 },
                            ) + fadeIn(tween(220))) togetherWith
                                (slideOutHorizontally(
                                    animationSpec = tween(260, easing = FastOutSlowInEasing),
                                    targetOffsetX = { if (movingToRecurrence) -it / 4 else it / 4 },
                                ) + fadeOut(tween(180)))
                        },
                        label = "taskDateSection",
                    ) { visibleTab ->
                    if (visibleTab == "Data") {
                        Column(Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                        IconButton(onClick = { taskDateMonth = taskDateMonth.minusMonths(1) }) {
                            Icon(Icons.Rounded.ChevronLeft, "Mês anterior", tint = PopMuted)
                        }
                        Box(modifier = Modifier.weight(1f), contentAlignment = Alignment.Center) {
                            Text(
                                "${taskDateMonth.month.getDisplayName(TextStyle.FULL, Locale("pt", "BR")).replaceFirstChar { it.uppercase() }} ${taskDateMonth.year}",
                                fontWeight = FontWeight.ExtraBold,
                                fontSize = 18.sp,
                                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                                modifier = Modifier.clickable { showTaskYearMenu = true }.padding(horizontal = 10.dp, vertical = 8.dp),
                            )
                            DropdownMenu(
                                expanded = showTaskYearMenu,
                                onDismissRequest = { showTaskYearMenu = false },
                                shape = RoundedCornerShape(14.dp),
                                containerColor = PopSurface,
                            ) {
                                ((LocalDate.now().year - 2)..(LocalDate.now().year + 15)).forEach { year ->
                                    DropdownMenuItem(
                                        text = { Text(year.toString(), fontWeight = if (year == taskDateMonth.year) FontWeight.Bold else FontWeight.Normal) },
                                        trailingIcon = {
                                            if (year == taskDateMonth.year) Icon(Icons.Rounded.Check, null, tint = PopBlue, modifier = Modifier.size(18.dp))
                                        },
                                        onClick = {
                                            taskDateMonth = YearMonth.of(year, taskDateMonth.month)
                                            showTaskYearMenu = false
                                        },
                                    )
                                }
                            }
                        }
                        IconButton(onClick = { taskDateMonth = taskDateMonth.plusMonths(1) }) {
                            Icon(Icons.Rounded.ChevronRight, "Próximo mês", tint = PopMuted)
                        }
                            }
                            TaskDatePickerCalendar(
                        month = taskDateMonth,
                        selectedDate = taskDateDraft,
                        onDateSelected = { taskDateDraft = it },
                            )
                            Column(
                        modifier = Modifier.fillMaxWidth().background(PopSurfaceAlt, RoundedCornerShape(20.dp)).padding(vertical = 4.dp),
                            ) {
                        DateSettingRow(
                            icon = Icons.Rounded.AccessTime,
                            label = "Hora",
                            value = newTaskTime.ifBlank { "Nenhuma" },
                        ) {
                            showTaskTimePicker = true
                        }
                        DateSettingRow(
                            icon = Icons.Rounded.NotificationsActive,
                            label = "Lembrete",
                            value = if (newTaskReminder == "Sem lembrete") "Nenhum" else newTaskReminder,
                        ) {
                            newTaskReminder = when (newTaskReminder) {
                                "Sem lembrete" -> "No horário"
                                "No horário" -> "15 min"
                                "15 min" -> "1 hora antes"
                                "1 hora antes" -> "1 dia antes"
                                else -> "Sem lembrete"
                            }
                        }
                            }
                        }
                    } else {
                        RecurrenceSettings(
                            modifier = Modifier.fillMaxSize(),
                        recurrence = newTaskRecurrence,
                        detail = newTaskRecurrenceDetail,
                        ends = newTaskRecurrenceEnd,
                        interval = newTaskRecurrenceInterval,
                        endCount = newTaskRecurrenceCount,
                        endDate = newTaskRecurrenceEndDate,
                        selectedDate = taskDateDraft,
                        onRecurrenceChange = {
                            newTaskRecurrence = it
                            newTaskRecurrenceDetail = ""
                        },
                        onDetailChange = { newTaskRecurrenceDetail = it },
                        onEndsChange = { newTaskRecurrenceEnd = it },
                        onIntervalChange = { newTaskRecurrenceInterval = it.coerceIn(1, 99) },
                        onEndCountChange = { newTaskRecurrenceCount = it.coerceIn(2, 999) },
                        onEndDateChange = { newTaskRecurrenceEndDate = it },
                        )
                    }
                    }
                }

                HorizontalDivider(color = PopBorder.copy(alpha = .7f))
                TextButton(
                    onClick = {
                        taskDateDraft = LocalDate.now()
                        taskDateMonth = YearMonth.now()
                        newTaskTime = ""
                        newTaskReminder = "Sem lembrete"
                        newTaskRecurrence = "Não repetir"
                        newTaskRecurrenceDetail = ""
                        newTaskRecurrenceEnd = "Nunca"
                        newTaskRecurrenceInterval = 1
                        newTaskRecurrenceCount = 10
                        newTaskRecurrenceEndDate = LocalDate.now().plusMonths(1).format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))
                        newTaskDuration = "Sem duração"
                    },
                    modifier = Modifier.align(Alignment.CenterHorizontally),
                ) { Text("Limpar", color = Color(0xFFE5484D), fontWeight = FontWeight.Bold) }
            }
        }
    }

    if (showTaskTimePicker) {
        AlertDialog(
            onDismissRequest = { showTaskTimePicker = false },
            title = { Text("Escolher hora", fontWeight = FontWeight.ExtraBold) },
            text = { TimePicker(state = taskTimePickerState) },
            confirmButton = {
                TextButton(
                    onClick = {
                        newTaskTime = String.format(Locale("pt", "BR"), "%02d:%02d", taskTimePickerState.hour, taskTimePickerState.minute)
                        showTaskTimePicker = false
                    },
                ) { Text("Confirmar", color = PopBlue, fontWeight = FontWeight.Bold) }
            },
            dismissButton = {
                TextButton(onClick = { showTaskTimePicker = false }) { Text("Cancelar", color = PopMuted) }
            },
            shape = RoundedCornerShape(24.dp),
            containerColor = PopSurface,
        )
    }

    if (false && showCreate) {
        AlertDialog(
            onDismissRequest = { showCreate = false },
            title = {
                Text(
                    if (workSpace == WorkSpace.Personal) "Nova tarefa pessoal" else "Nova tarefa da empresa",
                    fontWeight = FontWeight.ExtraBold,
                )
            },
            text = {
                Column(
                    modifier = Modifier.heightIn(max = 520.dp).verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(14.dp),
                ) {
                    Text(
                        "Defina os dados principais. Você pode abrir mais opções se precisar.",
                        color = PopMuted,
                        fontSize = 12.sp,
                        lineHeight = 17.sp,
                    )
                    TextField(
                        value = newTaskTitle,
                        onValueChange = { newTaskTitle = it },
                        label = { Text("Título") },
                        placeholder = { Text("O que você precisa fazer?") },
                        singleLine = true,
                        shape = RoundedCornerShape(16.dp),
                        colors = TextFieldDefaults.colors(
                            focusedContainerColor = PopBlueSoft,
                            unfocusedContainerColor = PopSurfaceAlt,
                            focusedIndicatorColor = Color.Transparent,
                            unfocusedIndicatorColor = Color.Transparent,
                        ),
                    )
                    TextField(
                        value = newTaskDescription,
                        onValueChange = { newTaskDescription = it },
                        label = { Text("Descrição") },
                        placeholder = { Text("Adicione detalhes importantes") },
                        minLines = 2,
                        maxLines = 4,
                        shape = RoundedCornerShape(16.dp),
                        colors = TextFieldDefaults.colors(
                            focusedContainerColor = PopBlueSoft,
                            unfocusedContainerColor = PopSurfaceAlt,
                            focusedIndicatorColor = Color.Transparent,
                            unfocusedIndicatorColor = Color.Transparent,
                        ),
                    )
                    if (workSpace == WorkSpace.Company) {
                        Text("Atribuir para", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        TextField(
                            value = newTaskAssignee,
                            onValueChange = { newTaskAssignee = it },
                            placeholder = { Text("Nome da pessoa") },
                            singleLine = true,
                            leadingIcon = { Icon(Icons.Rounded.PersonOutline, null, tint = PopBlue) },
                            shape = RoundedCornerShape(16.dp),
                            colors = TextFieldDefaults.colors(
                                focusedContainerColor = PopBlueSoft,
                                unfocusedContainerColor = PopSurfaceAlt,
                                focusedIndicatorColor = Color.Transparent,
                                unfocusedIndicatorColor = Color.Transparent,
                            ),
                        )
                    }
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
                    Surface(
                        onClick = { showAdvancedOptions = !showAdvancedOptions },
                        color = PopSurfaceAlt,
                        contentColor = PopText,
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Row(Modifier.padding(13.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Rounded.Settings, null, tint = PopBlue, modifier = Modifier.size(19.dp))
                            Spacer(Modifier.width(9.dp))
                            Column(Modifier.weight(1f)) {
                                Text("Mais opções", fontSize = 13.sp, fontWeight = FontWeight.Bold)
                                Text("Recorrência, lembrete e anexo", color = PopMuted, fontSize = 10.sp)
                            }
                            Icon(
                                Icons.Rounded.KeyboardArrowDown,
                                if (showAdvancedOptions) "Ocultar opções" else "Mostrar opções",
                                tint = PopMuted,
                                modifier = Modifier.size(22.dp).graphicsLayer {
                                    rotationZ = if (showAdvancedOptions) 180f else 0f
                                },
                            )
                        }
                    }
                    AnimatedVisibility(visible = showAdvancedOptions) {
                        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            Text("Recorrência", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                            Row(horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                                listOf("Não repetir", "Diária", "Semanal").forEach { recurrence ->
                                    ChoicePill(recurrence, newTaskRecurrence == recurrence) {
                                        newTaskRecurrence = recurrence
                                        newTaskRecurrenceDetail = ""
                                    }
                                }
                            }
                            Row(horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                                listOf("Mensal", "Personalizada").forEach { recurrence ->
                                    ChoicePill(recurrence, newTaskRecurrence == recurrence) {
                                        newTaskRecurrence = recurrence
                                        newTaskRecurrenceDetail = ""
                                    }
                                }
                            }
                            if (newTaskRecurrence == "Mensal" || newTaskRecurrence == "Personalizada") {
                                TextField(
                                    value = newTaskRecurrenceDetail,
                                    onValueChange = { newTaskRecurrenceDetail = it },
                                    placeholder = {
                                        Text(if (newTaskRecurrence == "Mensal") "Dia do mês (ex.: 15)" else "Ex.: a cada 2 semanas")
                                    },
                                    singleLine = true,
                                    shape = RoundedCornerShape(16.dp),
                                    colors = TextFieldDefaults.colors(
                                        focusedContainerColor = PopBlueSoft,
                                        unfocusedContainerColor = PopSurfaceAlt,
                                        focusedIndicatorColor = Color.Transparent,
                                        unfocusedIndicatorColor = Color.Transparent,
                                    ),
                                )
                            }
                            Text("Lembrete", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                            Row(horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                                listOf("Sem lembrete", "No horário", "15 min").forEach { reminder ->
                                    ChoicePill(reminder, newTaskReminder == reminder) { newTaskReminder = reminder }
                                }
                            }
                            Row(horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                                listOf("1 hora antes", "1 dia antes").forEach { reminder ->
                                    ChoicePill(reminder, newTaskReminder == reminder) { newTaskReminder = reminder }
                                }
                            }
                            Text("Anexo", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                            Surface(
                                onClick = { attachmentPicker.launch(arrayOf("*/*")) },
                                color = PopBlueSoft,
                                contentColor = PopBlue,
                                shape = RoundedCornerShape(16.dp),
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Row(Modifier.padding(13.dp), verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Rounded.AttachFile, null, modifier = Modifier.size(19.dp))
                                    Spacer(Modifier.width(8.dp))
                                    Text(
                                        if (newTaskAttachment.isBlank()) "Adicionar anexo" else newTaskAttachment,
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                    )
                                }
                            }
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
                                description = newTaskDescription.trim(),
                                assignee = if (workSpace == WorkSpace.Personal) {
                                    "Eu"
                                } else {
                                    newTaskAssignee.trim().ifBlank { "Sem responsável" }
                                },
                                recurrence = if (newTaskRecurrenceDetail.isBlank()) {
                                    newTaskRecurrence
                                } else {
                                    "$newTaskRecurrence • ${newTaskRecurrenceDetail.trim()}"
                                },
                                reminder = newTaskReminder,
                                attachmentName = newTaskAttachment,
                            ),
                        )
                        newTaskTitle = ""
                        newTaskDescription = ""
                        newTaskAssignee = ""
                        newTaskPriority = "Média"
                        newTaskDateOffset = 0
                        newTaskRecurrence = "Não repetir"
                        newTaskRecurrenceDetail = ""
                        newTaskReminder = "Sem lembrete"
                        newTaskAttachment = ""
                        showAdvancedOptions = false
                        showCreate = false
                    },
                ) { Text("Adicionar", color = PopBlue, fontWeight = FontWeight.Bold) }
            },
            dismissButton = {
                TextButton(onClick = { showCreate = false }) { Text("Cancelar") }
            },
            shape = RoundedCornerShape(26.dp),
            containerColor = PopSurface,
        )
    }
}

@Composable
private fun RecurrenceSettings(
    modifier: Modifier = Modifier,
    recurrence: String,
    detail: String,
    ends: String,
    interval: Int,
    endCount: Int,
    endDate: String,
    selectedDate: LocalDate,
    onRecurrenceChange: (String) -> Unit,
    onDetailChange: (String) -> Unit,
    onEndsChange: (String) -> Unit,
    onIntervalChange: (Int) -> Unit,
    onEndCountChange: (Int) -> Unit,
    onEndDateChange: (String) -> Unit,
) {
    Column(
        modifier = modifier.fillMaxWidth().clipToBounds().verticalScroll(rememberScrollState()).padding(bottom = 20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text("Como a tarefa deve se repetir?", fontWeight = FontWeight.Bold, fontSize = 14.sp)
        Row(horizontalArrangement = Arrangement.spacedBy(7.dp)) {
            listOf("Não repetir", "Diária", "Semanal").forEach { option ->
                ChoicePill(option, recurrence == option) { onRecurrenceChange(option) }
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(7.dp)) {
            listOf("Mensal", "Anual").forEach { option ->
                ChoicePill(option, recurrence == option) { onRecurrenceChange(option) }
            }
        }

        AnimatedVisibility(
            visible = recurrence != "Não repetir",
            enter = fadeIn(tween(240)) + slideInHorizontally(tween(280, easing = FastOutSlowInEasing)) { it / 6 },
            exit = fadeOut(tween(180)) + slideOutHorizontally(tween(220, easing = FastOutSlowInEasing)) { it / 6 },
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Surface(color = PopSurfaceAlt, shape = RoundedCornerShape(18.dp), modifier = Modifier.fillMaxWidth()) {
                Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    val unit = when (recurrence) {
                        "Diária" -> if (interval == 1) "dia" else "dias"
                        "Semanal" -> if (interval == 1) "semana" else "semanas"
                        "Mensal" -> if (interval == 1) "mês" else "meses"
                        else -> if (interval == 1) "ano" else "anos"
                    }
                    Text("Intervalo", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    RecurrenceNumberSelector(
                        label = "A cada $interval $unit",
                        value = interval,
                        onValueChange = onIntervalChange,
                    )

                    AnimatedVisibility(
                        visible = recurrence == "Semanal",
                        enter = fadeIn(tween(220)) + slideInHorizontally(tween(260)) { it / 8 },
                        exit = fadeOut(tween(160)),
                    ) {
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Dias da semana", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                        val selectedDays = detail.split(",").filter { it.isNotBlank() }.toSet()
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            listOf("S", "T", "Q", "Q2", "S2", "Sá", "D").forEach { day ->
                                val label = day.removeSuffix("2")
                                val selected = day in selectedDays
                                Surface(
                                    onClick = {
                                        val updated = if (selected) selectedDays - day else selectedDays + day
                                        onDetailChange(updated.joinToString(","))
                                    },
                                    color = if (selected) PopBlue else PopSurface,
                                    contentColor = if (selected) Color.White else PopMuted,
                                    shape = CircleShape,
                                    modifier = Modifier.size(34.dp),
                                ) { Box(contentAlignment = Alignment.Center) { Text(label, fontSize = 11.sp, fontWeight = FontWeight.Bold) } }
                            }
                        }
                        }
                    }
                    AnimatedVisibility(
                        visible = recurrence == "Mensal",
                        enter = fadeIn(tween(220)) + slideInHorizontally(tween(260)) { it / 8 },
                        exit = fadeOut(tween(160)),
                    ) {
                        TextField(
                            value = detail,
                            onValueChange = { value -> onDetailChange(value.filter { it.isDigit() }.take(2)) },
                            label = { Text("Dia do mês") },
                            placeholder = { Text(selectedDate.dayOfMonth.toString()) },
                            singleLine = true,
                            shape = RoundedCornerShape(14.dp),
                            colors = TextFieldDefaults.colors(
                                focusedContainerColor = PopBlueSoft,
                                unfocusedContainerColor = PopSurface,
                                focusedIndicatorColor = Color.Transparent,
                                unfocusedIndicatorColor = Color.Transparent,
                            ),
                        )
                    }
                    AnimatedVisibility(
                        visible = recurrence == "Anual",
                        enter = fadeIn(tween(220)),
                        exit = fadeOut(tween(160)),
                    ) {
                        Text(
                            "Todo ano em ${selectedDate.dayOfMonth}/${selectedDate.monthValue}",
                            color = PopMuted,
                            fontSize = 12.sp,
                        )
                    }
                }
            }

            Surface(color = PopSurfaceAlt, shape = RoundedCornerShape(18.dp), modifier = Modifier.fillMaxWidth()) {
                Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(11.dp)) {
                    Text("Quando termina?", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    Row(horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                        listOf("Nunca", "Após", "Em uma data").forEach { option ->
                            ChoicePill(option, ends == option) { onEndsChange(option) }
                        }
                    }
                    AnimatedVisibility(
                        visible = ends == "Após",
                        enter = fadeIn(tween(220)) + slideInHorizontally(tween(260)) { it / 8 },
                        exit = fadeOut(tween(160)),
                    ) {
                        RecurrenceNumberSelector(
                            label = "$endCount ocorrências",
                            value = endCount,
                            onValueChange = onEndCountChange,
                        )
                    }
                    AnimatedVisibility(
                        visible = ends == "Em uma data",
                        enter = fadeIn(tween(220)) + slideInHorizontally(tween(260)) { it / 8 },
                        exit = fadeOut(tween(160)),
                    ) {
                        TextField(
                            value = endDate,
                            onValueChange = { value -> onEndDateChange(value.filter { it.isDigit() || it == '/' }.take(10)) },
                            label = { Text("Data final") },
                            placeholder = { Text("dd/mm/aaaa") },
                            singleLine = true,
                            shape = RoundedCornerShape(14.dp),
                            colors = TextFieldDefaults.colors(
                                focusedContainerColor = PopBlueSoft,
                                unfocusedContainerColor = PopSurface,
                                focusedIndicatorColor = Color.Transparent,
                                unfocusedIndicatorColor = Color.Transparent,
                            ),
                        )
                    }
                }
            }
            Surface(color = PopBlueSoft, contentColor = PopBlue, shape = RoundedCornerShape(14.dp), modifier = Modifier.fillMaxWidth()) {
                Text(
                    "A próxima ocorrência será criada automaticamente ao concluir a atual.",
                    fontSize = 11.sp,
                    lineHeight = 16.sp,
                    modifier = Modifier.padding(12.dp),
                )
            }
            }
        }
    }
}

@Composable
private fun RecurrenceNumberSelector(
    label: String,
    value: Int,
    onValueChange: (Int) -> Unit,
    accentColor: Color = PopBlue,
) {
    Row(
        modifier = Modifier.fillMaxWidth().background(PopSurface, RoundedCornerShape(14.dp)).padding(8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, modifier = Modifier.weight(1f))
        Surface(onClick = { onValueChange(value - 1) }, color = PopSurfaceAlt, shape = CircleShape) {
            Text("−", fontSize = 20.sp, modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp))
        }
        Text(value.toString(), fontWeight = FontWeight.Bold, fontSize = 14.sp, modifier = Modifier.padding(horizontal = 12.dp))
        Surface(onClick = { onValueChange(value + 1) }, color = accentColor, contentColor = Color.White, shape = CircleShape) {
            Text("+", fontSize = 20.sp, modifier = Modifier.padding(horizontal = 11.dp, vertical = 4.dp))
        }
    }
}

@Composable
private fun TaskDatePickerCalendar(
    month: YearMonth,
    selectedDate: LocalDate,
    onDateSelected: (LocalDate) -> Unit,
) {
    val firstOffset = month.atDay(1).dayOfWeek.value - 1
    val monthCells = List(firstOffset) { null } + (1..month.lengthOfMonth()).map { it }
    val cells = monthCells + List(42 - monthCells.size) { null }
    Column {
        Row(Modifier.fillMaxWidth()) {
            listOf("Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom").forEach { day ->
                Text(
                    day,
                    color = PopMuted,
                    fontSize = 10.sp,
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                    modifier = Modifier.weight(1f),
                )
            }
        }
        Spacer(Modifier.height(5.dp))
        cells.chunked(7).forEach { week ->
            Row(Modifier.fillMaxWidth()) {
                (week + List(7 - week.size) { null }).forEach { day ->
                    Box(Modifier.weight(1f).height(39.dp), contentAlignment = Alignment.Center) {
                        if (day != null) {
                            val date = month.atDay(day)
                            val selected = date == selectedDate
                            Box(
                                modifier = Modifier
                                    .size(36.dp)
                                    .clip(CircleShape)
                                    .background(if (selected) PopBlue else Color.Transparent)
                                    .clickable { onDateSelected(date) },
                                contentAlignment = Alignment.Center,
                            ) {
                                Text(
                                    day.toString(),
                                    color = if (selected) Color.White else PopText,
                                    fontSize = 13.sp,
                                    fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
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
private fun DateSettingRow(
    icon: ImageVector,
    label: String,
    value: String,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick).padding(horizontal = 16.dp, vertical = 13.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, null, tint = PopMuted, modifier = Modifier.size(21.dp))
        Spacer(Modifier.width(12.dp))
        Text(label, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, modifier = Modifier.weight(1f))
        Text(value, color = PopMuted, fontSize = 13.sp)
        Spacer(Modifier.width(5.dp))
        Icon(Icons.Rounded.ChevronRight, null, tint = PopMuted, modifier = Modifier.size(18.dp))
    }
}

@Composable
private fun TaskComposerIcon(
    icon: ImageVector,
    description: String,
    tint: Color,
    onClick: () -> Unit,
) {
    Surface(
        onClick = onClick,
        color = Color.Transparent,
        contentColor = tint,
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier.size(38.dp),
    ) {
        Box(contentAlignment = Alignment.Center) {
            Icon(icon, description, modifier = Modifier.size(20.dp))
        }
    }
}

@Composable
private fun ChoicePill(label: String, selected: Boolean, onClick: () -> Unit) {
    val backgroundColor by animateColorAsState(
        targetValue = if (selected) PopBlue else PopBlueSoft,
        animationSpec = tween(220),
        label = "choicePillBackground",
    )
    val foregroundColor by animateColorAsState(
        targetValue = if (selected) Color.White else PopBlue,
        animationSpec = tween(220),
        label = "choicePillForeground",
    )
    Surface(
        onClick = onClick,
        color = backgroundColor,
        contentColor = foregroundColor,
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
private fun DetailChoicePill(label: String, selected: Boolean, onClick: () -> Unit) {
    val backgroundColor by animateColorAsState(
        targetValue = if (selected) PopBlue else Color.Transparent,
        animationSpec = tween(220),
        label = "detailChoiceBackground",
    )
    val foregroundColor by animateColorAsState(
        targetValue = if (selected) Color.White else PopMuted,
        animationSpec = tween(220),
        label = "detailChoiceForeground",
    )
    Surface(
        onClick = onClick,
        color = backgroundColor,
        contentColor = foregroundColor,
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
private fun PriorityChoicePill(label: String, selected: Boolean, onClick: () -> Unit) {
    val priorityColor = when (label) {
        "Alta" -> Color(0xFFE5484D)
        "Média" -> Color(0xFFFF9F1C)
        else -> Color(0xFF18A66A)
    }
    val backgroundColor by animateColorAsState(
        targetValue = if (selected) priorityColor else Color.Transparent,
        animationSpec = tween(220),
        label = "priorityChoiceBackground",
    )
    Surface(
        onClick = onClick,
        color = backgroundColor,
        contentColor = if (selected) Color.White else priorityColor,
        shape = CircleShape,
    ) {
        Text(
            label,
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
        )
    }
}

@Composable
private fun FilterChip(label: String, selected: Boolean, onClick: () -> Unit) {
    val textColor by animateColorAsState(
        targetValue = if (selected) PopBlue else PopMuted,
        animationSpec = tween(200),
        label = "taskFilterColor",
    )
    val indicatorWidth by animateDpAsState(
        targetValue = if (selected) 22.dp else 0.dp,
        animationSpec = tween(220, easing = FastOutSlowInEasing),
        label = "taskFilterIndicator",
    )
    Column(
        modifier = Modifier.clickable(onClick = onClick).padding(horizontal = 7.dp, vertical = 5.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(label, color = textColor, fontSize = 12.sp, fontWeight = if (selected) FontWeight.Bold else FontWeight.SemiBold)
        Spacer(Modifier.height(4.dp))
        Box(Modifier.height(2.dp).width(indicatorWidth).background(PopBlue, CircleShape))
    }
}

@Composable
private fun TaskCard(task: PopTask, isCompleting: Boolean, onComplete: () -> Unit, onOpen: () -> Unit) {
    val completedVisual = task.completed || isCompleting
    val cardColor by animateColorAsState(
        targetValue = if (completedVisual) Color(0xFF141717) else PopSurface,
        animationSpec = tween(260),
        label = "taskCardCompletionColor",
    )
    val cardScale by animateFloatAsState(
        targetValue = if (isCompleting) .94f else 1f,
        animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessMedium),
        label = "taskCardCompletionScale",
    )
    val completionProgress by animateFloatAsState(
        targetValue = if (isCompleting) 1f else 0f,
        animationSpec = tween(560, easing = FastOutSlowInEasing),
        label = "taskCompletionProgress",
    )
    val checkScale by animateFloatAsState(
        targetValue = if (completedVisual) 1f else .55f,
        animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessLow),
        label = "taskCheckScale",
    )
    val checkColor by animateColorAsState(
        targetValue = if (completedVisual) PopBlue else Color.Transparent,
        animationSpec = tween(180),
        label = "taskCheckColor",
    )
    Card(
        onClick = onOpen,
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = cardColor),
        modifier = Modifier
            .fillMaxWidth()
            .height(82.dp)
            .graphicsLayer {
                scaleX = cardScale
                scaleY = cardScale
                translationX = -34f * completionProgress
                alpha = 1f - completionProgress
            },
    ) {
        Row(Modifier.fillMaxSize().padding(horizontal = 14.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .size(42.dp)
                    .clip(CircleShape)
                    .clickable(onClick = onComplete),
                contentAlignment = Alignment.Center,
            ) {
                Box(
                    Modifier
                        .size(22.dp)
                        .graphicsLayer {
                            scaleX = 1f + completionProgress
                            scaleY = 1f + completionProgress
                            alpha = if (isCompleting) .22f * (1f - completionProgress) else 0f
                        }
                        .background(PopBlue, CircleShape),
                )
                Box(
                    Modifier
                        .size(22.dp)
                        .background(checkColor, CircleShape)
                        .border(2.dp, if (completedVisual) PopBlue else PopMuted.copy(alpha = .55f), CircleShape),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        Icons.Rounded.Check,
                        "Tarefa concluída",
                        tint = Color.White,
                        modifier = Modifier.size(15.dp).graphicsLayer {
                            alpha = if (completedVisual) 1f else 0f
                            scaleX = checkScale
                            scaleY = checkScale
                        },
                    )
                }
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(task.title, fontWeight = FontWeight.Bold, fontSize = 14.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                val dueText = if (task.dueTime.isBlank()) task.dueLabel else "${task.dueLabel}, ${task.dueTime}"
                val hasRecurrence = task.recurrenceRule != "Não repetir"
                val hasDescription = task.description.isNotBlank()
                val showAssignee = task.assignee.isNotBlank() && task.assignee != "Eu" && task.assignee != "Sem responsável"
                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (hasRecurrence) {
                        Icon(
                            Icons.Rounded.Repeat,
                            "Tarefa recorrente",
                            tint = PopMuted,
                            modifier = Modifier.padding(start = 5.dp).size(14.dp),
                        )
                    }
                    if (hasRecurrence && hasDescription) {
                        Spacer(Modifier.width(5.dp))
                    }
                    if (hasDescription) {
                        Icon(
                            Icons.Rounded.Description,
                            "Possui anotação",
                            tint = PopMuted,
                            modifier = Modifier.size(14.dp),
                        )
                    }
                    if (hasRecurrence || hasDescription) {
                        Text("•", color = PopMuted, fontSize = 10.sp, modifier = Modifier.padding(horizontal = 5.dp))
                    }
                    Text(
                        if (showAssignee) "$dueText  •  ${task.assignee}" else dueText,
                        color = PopMuted,
                        fontSize = 11.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f),
                    )
                }
            }
            PriorityPill(task.priority)
        }
    }
}

@Composable
private fun TaskRow(task: PopTask, onClick: (() -> Unit)? = null) {
    val rowModifier = if (onClick != null) {
        Modifier.fillMaxWidth().clickable(onClick = onClick).padding(vertical = 13.dp)
    } else {
        Modifier.fillMaxWidth().padding(vertical = 13.dp)
    }
    Row(rowModifier, verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(task.title, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            val showAssignee = task.assignee.isNotBlank() && task.assignee != "Eu" && task.assignee != "Sem responsável"
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (task.recurrenceRule != "Não repetir") {
                    Icon(Icons.Rounded.Repeat, "Recorrente", tint = PopMuted, modifier = Modifier.size(13.dp))
                }
                if (task.description.isNotBlank()) {
                    if (task.recurrenceRule != "Não repetir") Spacer(Modifier.width(5.dp))
                    Icon(Icons.Rounded.Description, "Possui anotação", tint = PopMuted, modifier = Modifier.size(13.dp))
                }
                if (task.recurrenceRule != "Não repetir" || task.description.isNotBlank()) {
                    Text("•", color = PopMuted, fontSize = 10.sp, modifier = Modifier.padding(horizontal = 5.dp))
                }
                Text(
                    if (showAssignee) "${task.dueLabel}  •  ${task.assignee}" else task.dueLabel,
                    fontSize = 11.sp,
                    color = PopMuted,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
        PriorityPill(task.priority)
    }
}

@Composable
private fun DetailSettingRow(
    icon: ImageVector,
    label: String,
    value: String,
    expanded: Boolean,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick).padding(horizontal = 15.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, null, tint = PopMuted, modifier = Modifier.size(23.dp))
        Spacer(Modifier.width(18.dp))
        Column(Modifier.weight(1f)) {
            Text(label, color = PopText.copy(alpha = .82f), fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
            if (value.isNotBlank()) {
                Text(value, color = PopMuted, fontSize = 11.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
        }
        Icon(
            Icons.Rounded.KeyboardArrowDown,
            if (expanded) "Recolher" else "Editar",
            tint = PopMuted,
            modifier = Modifier.size(21.dp).graphicsLayer { rotationZ = if (expanded) 180f else 0f },
        )
    }
}

@Composable
private fun taskEditorFieldColors(containerColor: Color = PopSurfaceAlt) = TextFieldDefaults.colors(
    focusedContainerColor = containerColor.copy(alpha = 0f),
    unfocusedContainerColor = containerColor.copy(alpha = 0f),
    focusedIndicatorColor = PopBlue.copy(alpha = .55f),
    unfocusedIndicatorColor = PopBorder,
)

@Composable
private fun PriorityPill(priority: String) {
    val color = when (priority) {
        "Alta" -> Color(0xFFE5484D)
        "Média" -> Color(0xFFFF9F1C)
        else -> Color(0xFF18A66A)
    }
    Text(
        priority,
        color = color,
        fontSize = 10.sp,
        fontWeight = FontWeight.Bold,
        modifier = Modifier.padding(horizontal = 6.dp, vertical = 5.dp),
    )
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
    var selectedDate by remember { mutableStateOf(LocalDate.now()) }
    var openedCalendarTask by remember { mutableStateOf<PopTask?>(null) }
    val locale = remember { Locale("pt", "BR") }
    val today = LocalDate.now()
    val selectedDayTasks = tasks.filter { task ->
        runCatching { LocalDate.parse(task.dueDate) }.getOrNull() == selectedDate
    }.sortedWith(compareBy<PopTask> { it.completed }.thenBy {
        when (it.priority) {
            "Alta" -> 0
            "Média" -> 1
            else -> 2
        }
    })
    val selectedDateLabel = if (selectedDate == today) {
        "Tarefas de hoje"
    } else {
        val monthName = selectedDate.month.getDisplayName(TextStyle.FULL, locale)
        "${selectedDate.dayOfMonth} de $monthName"
    }
    val selectedCountLabel = if (selectedDayTasks.size == 1) "1 tarefa" else "${selectedDayTasks.size} tarefas"

    fun selectMonth(newMonth: YearMonth) {
        month = newMonth
        selectedDate = newMonth.atDay(minOf(selectedDate.dayOfMonth, newMonth.lengthOfMonth()))
    }

    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 24.dp)) {
        item {
            WorkSpaceHeader(
                subtitle = if (workSpace == WorkSpace.Personal) "Seus prazos e tarefas" else "Calendário e prazos da empresa",
                selected = workSpace,
                companyNames = companyNames,
                selectedCompanyIndex = selectedCompanyIndex,
                onSelect = onWorkSpaceChange,
                onCompanySelect = onCompanySelect,
                onCreateCompany = onCreateCompany,
            )
        }
        item {
            Row(Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = { selectMonth(month.minusMonths(1)) }) { Icon(Icons.Rounded.ChevronLeft, "Mês anterior") }
                Text(
                    "${month.month.getDisplayName(TextStyle.FULL, locale).replaceFirstChar { it.uppercase() }} ${month.year}",
                    fontWeight = FontWeight.ExtraBold,
                    modifier = Modifier.weight(1f),
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                )
                IconButton(onClick = { selectMonth(month.plusMonths(1)) }) { Icon(Icons.Rounded.ChevronRight, "Próximo mês") }
            }
        }
        item {
            CalendarGrid(
                month = month,
                tasks = tasks,
                selectedDate = selectedDate,
                onDateSelected = { selectedDate = it },
            )
        }
        item {
            Column(Modifier.padding(20.dp)) {
                SectionTitle(selectedDateLabel, selectedCountLabel)
                Spacer(Modifier.height(6.dp))
                if (selectedDayTasks.isEmpty()) {
                    Text("Nenhuma tarefa para este dia.", color = PopMuted, fontSize = 13.sp, modifier = Modifier.padding(vertical = 18.dp))
                } else {
                    selectedDayTasks.forEach { task ->
                        TaskRow(task, onClick = { openedCalendarTask = task })
                    }
                }
            }
        }
    }
    openedCalendarTask?.let { task ->
        CalendarTaskDetails(task = task, onDismiss = { openedCalendarTask = null })
    }
}

@Composable
private fun CalendarTaskDetails(task: PopTask, onDismiss: () -> Unit) {
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false),
    ) {
        val dialogView = LocalView.current
        SideEffect {
            (dialogView.parent as? DialogWindowProvider)?.window?.setBackgroundDrawable(ColorDrawable(android.graphics.Color.TRANSPARENT))
        }
        Surface(color = PopBackground, modifier = Modifier.fillMaxSize()) {
            Column(
                Modifier
                    .fillMaxSize()
                    .padding(WindowInsets.statusBars.asPaddingValues())
                    .padding(WindowInsets.navigationBars.asPaddingValues())
                    .padding(horizontal = 20.dp),
            ) {
                Row(Modifier.fillMaxWidth().padding(vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Rounded.ArrowBack, "Voltar", modifier = Modifier.size(27.dp))
                    }
                    Text("Detalhes da tarefa", fontWeight = FontWeight.ExtraBold, fontSize = 17.sp, modifier = Modifier.weight(1f))
                }
                LazyColumn(
                    modifier = Modifier.fillMaxWidth().weight(1f),
                    contentPadding = PaddingValues(bottom = 28.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    item {
                        Row(Modifier.fillMaxWidth().padding(vertical = 16.dp), verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                Modifier.size(30.dp).border(2.dp, if (task.completed) PopBlue else PopMuted, CircleShape).background(if (task.completed) PopBlue else Color.Transparent, CircleShape),
                                contentAlignment = Alignment.Center,
                            ) {
                                if (task.completed) Icon(Icons.Rounded.Check, null, tint = Color.White, modifier = Modifier.size(19.dp))
                            }
                            Spacer(Modifier.width(14.dp))
                            Text(task.title, fontSize = 22.sp, lineHeight = 29.sp, fontWeight = FontWeight.ExtraBold, modifier = Modifier.weight(1f))
                        }
                    }
                    if (task.description.isNotBlank()) {
                        item {
                            Surface(color = PopSurface, shape = RoundedCornerShape(18.dp), modifier = Modifier.fillMaxWidth()) {
                                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Rounded.Description, null, tint = PopMuted, modifier = Modifier.size(18.dp))
                                        Spacer(Modifier.width(8.dp))
                                        Text("O que fazer", color = PopMuted, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                    }
                                    Text(task.description, color = PopText, fontSize = 14.sp, lineHeight = 21.sp)
                                }
                            }
                        }
                    }
                    item { CalendarTaskInfoRow(Icons.Rounded.CalendarMonth, "Data", task.dueLabel + task.dueTime.takeIf { it.isNotBlank() }?.let { ", $it" }.orEmpty()) }
                    item { CalendarTaskInfoRow(Icons.Rounded.TaskAlt, "Prioridade", task.priority) }
                    if (task.recurrenceRule != "Não repetir") {
                        item { CalendarTaskInfoRow(Icons.Rounded.Repeat, "Recorrência", task.recurrence) }
                    }
                    if (task.reminder != "Sem lembrete") {
                        item { CalendarTaskInfoRow(Icons.Rounded.NotificationsActive, "Lembrete", task.reminder) }
                    }
                    if (task.assignee.isNotBlank() && task.assignee != "Eu" && task.assignee != "Sem responsável") {
                        item { CalendarTaskInfoRow(Icons.Rounded.PersonOutline, "Responsável", task.assignee) }
                    }
                    if (task.attachmentName.isNotBlank()) {
                        item { CalendarTaskInfoRow(Icons.Rounded.AttachFile, "Anexo", task.attachmentName) }
                    }
                }
            }
        }
    }
}

@Composable
private fun CalendarTaskInfoRow(icon: ImageVector, label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth().background(PopSurfaceAlt, RoundedCornerShape(16.dp)).padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, null, tint = PopMuted, modifier = Modifier.size(21.dp))
        Spacer(Modifier.width(13.dp))
        Column(Modifier.weight(1f)) {
            Text(label, color = PopMuted, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
            Text(value, color = PopText, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun CalendarGrid(
    month: YearMonth,
    tasks: List<PopTask>,
    selectedDate: LocalDate,
    onDateSelected: (LocalDate) -> Unit,
) {
    val firstOffset = month.atDay(1).dayOfWeek.value - 1
    val monthCells = List(firstOffset) { null } + (1..month.lengthOfMonth()).map { it }
    val cells = monthCells + List(42 - monthCells.size) { null }
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
                    val date = day?.let(month::atDay)
                    val selected = date == selectedDate
                    val isToday = date == today
                    val dayTasks = if (day == null) emptyList() else tasks.filter { task ->
                        runCatching { LocalDate.parse(task.dueDate) }.getOrNull() == month.atDay(day)
                    }
                    Box(Modifier.weight(1f).height(42.dp), contentAlignment = Alignment.Center) {
                        if (day != null) {
                            Box(
                                Modifier.size(38.dp).clip(CircleShape).clickable { date?.let(onDateSelected) },
                                contentAlignment = Alignment.Center,
                            ) {
                                Canvas(Modifier.fillMaxSize()) {
                                    val visibleTasks = dayTasks.take(6)
                                    if (visibleTasks.isNotEmpty()) {
                                        val angleStep = 18f
                                        val startAngle = 90f - (angleStep * visibleTasks.lastIndex / 2f)
                                        val orbitRadius = size.minDimension / 2f - 2.4.dp.toPx()
                                        visibleTasks.forEachIndexed { index, task ->
                                            val angle = Math.toRadians((startAngle + angleStep * index).toDouble())
                                            val dotColor = when (task.priority) {
                                                "Alta" -> Color(0xFFE5484D)
                                                "Média" -> Color(0xFFFF9F1C)
                                                else -> Color(0xFF18A66A)
                                            }
                                            drawCircle(
                                                color = dotColor,
                                                radius = 2.dp.toPx(),
                                                center = Offset(
                                                    x = center.x + cos(angle).toFloat() * orbitRadius,
                                                    y = center.y + sin(angle).toFloat() * orbitRadius,
                                                ),
                                            )
                                        }
                                    }
                                }
                                Box(
                                    Modifier
                                        .size(29.dp)
                                        .clip(CircleShape)
                                        .background(if (selected) PopBlue else Color.Transparent)
                                        .then(
                                            if (isToday && !selected) Modifier.border(1.dp, PopBlue, CircleShape)
                                            else Modifier,
                                        ),
                                    contentAlignment = Alignment.Center,
                                ) { Text(day.toString(), color = if (selected) Color.White else PopText, fontSize = 12.sp, fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal) }
                            }
                        }
                    }
                }
            }
        }
        Spacer(Modifier.height(10.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(14.dp), modifier = Modifier.padding(horizontal = 4.dp)) {
            PriorityLegend("Urgente", Color(0xFFE5484D))
            PriorityLegend("Média", Color(0xFFFF9F1C))
            PriorityLegend("Baixa", Color(0xFF18A66A))
        }
    }
}

@Composable
private fun PriorityLegend(label: String, color: Color) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(6.dp).clip(CircleShape).background(color))
        Spacer(Modifier.width(5.dp))
        Text(label, color = PopMuted, fontSize = 10.sp, fontWeight = FontWeight.SemiBold)
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
        Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(PopSurface).clickable { }.padding(15.dp),
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
            .padding(bottom = WindowInsets.navigationBars.asPaddingValues().calculateBottomPadding().coerceAtLeast(7.dp)),
    ) {
        Surface(
            color = PopSurface.copy(alpha = .98f),
            shadowElevation = 18.dp,
            tonalElevation = 3.dp,
            shape = RoundedCornerShape(29.dp),
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, PopBlue.copy(alpha = .22f), RoundedCornerShape(29.dp)),
        ) {
            Row(
                Modifier.padding(horizontal = 6.dp, vertical = 6.dp),
                horizontalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                PopDestination.entries.forEach { item ->
                    val active = selected == item
                    val scale by animateFloatAsState(
                        targetValue = if (active) 1.045f else 1f,
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
                        shape = RoundedCornerShape(21.dp),
                        modifier = Modifier
                            .weight(1f)
                            .height(57.dp)
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
                                modifier = Modifier.size(if (active) 23.dp else 22.dp),
                            )
                            Spacer(Modifier.height(2.dp))
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

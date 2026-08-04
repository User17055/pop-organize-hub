package br.com.poporganize.app.ui

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.graphics.drawable.ColorDrawable
import android.graphics.BitmapFactory
import android.net.Uri
import android.provider.OpenableColumns
import android.os.Build
import android.util.Base64
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
import androidx.compose.animation.expandVertically
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGesturesAfterLongPress
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.scrollBy
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
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.AccessTime
import androidx.compose.material.icons.rounded.AccountTree
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.AddBusiness
import androidx.compose.material.icons.rounded.ArrowBack
import androidx.compose.material.icons.rounded.ArrowForward
import androidx.compose.material.icons.rounded.AttachFile
import androidx.compose.material.icons.rounded.BarChart
import androidx.compose.material.icons.rounded.Business
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.Checklist
import androidx.compose.material.icons.rounded.CalendarMonth
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.ChevronLeft
import androidx.compose.material.icons.rounded.ChevronRight
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.Groups
import androidx.compose.material.icons.rounded.Home
import androidx.compose.material.icons.rounded.MoreHoriz
import androidx.compose.material.icons.rounded.MoreVert
import androidx.compose.material.icons.rounded.Menu
import androidx.compose.material.icons.rounded.NotificationsActive
import androidx.compose.material.icons.rounded.PendingActions
import androidx.compose.material.icons.rounded.PersonOutline
import androidx.compose.material.icons.rounded.Repeat
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material.icons.rounded.Settings
import androidx.compose.material.icons.rounded.Shield
import androidx.compose.material.icons.rounded.TaskAlt
import androidx.compose.material.icons.rounded.Email
import androidx.compose.material.icons.rounded.Description
import androidx.compose.material.icons.rounded.Delete
import androidx.compose.material.icons.rounded.Favorite
import androidx.compose.material.icons.rounded.Lock
import androidx.compose.material.icons.rounded.Logout
import androidx.compose.material.icons.rounded.LightMode
import androidx.compose.material.icons.rounded.DarkMode
import androidx.compose.material.icons.rounded.KeyboardArrowDown
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.material3.TimePicker
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.material3.rememberTimePickerState
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.boundsInWindow
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.draw.scale
import androidx.compose.ui.zIndex
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.luminance
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
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogWindowProvider
import androidx.compose.ui.window.DialogProperties
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.core.content.ContextCompat
import android.content.pm.PackageManager
import androidx.credentials.CredentialManager
import androidx.credentials.ClearCredentialStateRequest
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import androidx.credentials.exceptions.NoCredentialException
import br.com.poporganize.app.R
import br.com.poporganize.app.notifications.NotificationTaskSnapshot
import br.com.poporganize.app.notifications.saveNotificationTaskSnapshot
import br.com.poporganize.app.notifications.showAssignedTaskNotification
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.android.libraries.identity.googleid.GoogleIdTokenParsingException
import kotlinx.coroutines.delay
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.security.SecureRandom
import java.net.URL
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

private data class TaskChecklistItem(
    val id: String,
    val title: String,
    val done: Boolean = false,
)

private data class PopTask(
    val id: Int,
    val title: String,
    val department: String,
    val dueLabel: String,
    val priority: String,
    val dueDate: String = LocalDate.now().toString(),
    val completed: Boolean = false,
    val description: String = "",
    val assignee: String = "",
    val assignedBy: String = "",
    val createdBy: String = "",
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
    val canEdit: Boolean = true,
    val canComplete: Boolean = true,
    val canDelete: Boolean = true,
    val serverId: String = "",
    val assignmentType: String = "user",
    val assignmentTargetId: String = "",
    val assignmentTargetLabel: String = "",
    val assignees: List<String> = emptyList(),
    val checklist: List<TaskChecklistItem> = emptyList(),
)

private data class NativeTaskFolder(
    val id: String,
    val name: String,
    val parentId: String = "",
    val position: Int = 0,
)

private data class NativeTaskList(
    val id: String,
    val name: String,
    val folderId: String = "",
    val taskIds: List<String> = emptyList(),
    val position: Int = 0,
)

private data class NativeTaskOrganization(
    val folders: List<NativeTaskFolder> = emptyList(),
    val lists: List<NativeTaskList> = emptyList(),
)

private enum class SessionMode { Guest, Email, Google }
private data class GoogleAccount(
    val id: String,
    val name: String,
    val email: String,
    val photoUrl: String,
    val apiToken: String,
)
private data class CompanyMember(
    val name: String,
    val email: String,
    val role: String,
    val sector: String,
    val id: String = "",
    val pending: Boolean = false,
    val isOwner: Boolean = false,
    val photoUrl: String = "",
    val sectorId: String = "",
    val groupIds: List<String> = emptyList(),
)
private data class CompanySector(val name: String, val description: String, val id: String = "")
private data class CompanyGroup(
    val name: String,
    val description: String,
    val id: String = "",
    val memberIds: List<String> = emptyList(),
)
private enum class WorkSpace { Personal, Company }

private const val GUEST_TASKS_STORAGE = "pop_organize_guest_tasks"
private const val ONBOARDING_COMPLETED_STORAGE = "pop_organize_onboarding_completed"
private const val SESSION_MODE_STORAGE = "pop_organize_session_mode"
private const val GOOGLE_ACCOUNT_ID_STORAGE = "pop_organize_google_account_id"
private const val GOOGLE_ACCOUNT_NAME_STORAGE = "pop_organize_google_account_name"
private const val GOOGLE_ACCOUNT_EMAIL_STORAGE = "pop_organize_google_account_email"
private const val GOOGLE_ACCOUNT_PHOTO_STORAGE = "pop_organize_google_account_photo"
private const val API_SESSION_TOKEN_STORAGE = "pop_organize_api_session_token"
private const val ACCOUNT_TASKS_STORAGE_PREFIX = "pop_organize_account_tasks_"
private const val COMPANY_TASKS_STORAGE_PREFIX = "pop_organize_company_tasks_"
private const val ACCOUNT_TASKS_DIRTY_PREFIX = "pop_organize_account_tasks_dirty_"
private const val DELETED_TASKS_STORAGE_PREFIX = "pop_organize_deleted_tasks_"
private const val ASSIGNED_TASKS_SEEN_PREFIX = "pop_organize_assigned_tasks_seen_"
private const val LAST_WORKSPACE_STORAGE_PREFIX = "pop_organize_last_workspace_"
private const val PERSONAL_WORKSPACE_STORAGE_VALUE = "personal"
private const val MOBILE_API_BASE_URL = "https://app.poporganize.com.br/api/mobile"
private const val LIGHT_THEME_STORAGE = "pop_organize_light_theme"
private const val LOCAL_PREFERENCES = "pop_organize_local"
private val googleProfileImageCache = mutableMapOf<String, ImageBitmap>()

private fun generateGoogleSignInNonce(byteLength: Int = 32): String {
    val bytes = ByteArray(byteLength)
    SecureRandom().nextBytes(bytes)
    return Base64.encodeToString(bytes, Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)
}

private fun defaultGuestTasks() = listOf(
    PopTask(1, "Planejar minha semana", "Pessoal", "Hoje, 18:00", "Alta", LocalDate.now().toString()),
    PopTask(2, "Organizar documentos", "Pessoal", "Amanhã, 10:00", "Média", LocalDate.now().plusDays(1).toString()),
    PopTask(3, "Revisar minhas prioridades", "Pessoal", "Esta semana", "Baixa", LocalDate.now().plusDays(3).toString()),
)

private fun normalizedDueDate(dueLabel: String, storedDate: String?): String {
    val persistedDate = runCatching { storedDate?.let(LocalDate::parse) }.getOrNull()
    if (persistedDate != null) return persistedDate.toString()

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
    return (inferred ?: today).toString()
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
    fun advanceRecurrenceDate(from: LocalDate): LocalDate? = when (task.recurrenceRule) {
        "Diária" -> from.plusDays(interval.toLong())
        "Semanal" -> {
            val dayMap = mapOf("S" to 1, "T" to 2, "Q" to 3, "Q2" to 4, "S2" to 5, "Sá" to 6, "D" to 7)
            val selectedDays = task.recurrenceDetail.split(",").mapNotNull(dayMap::get).sorted()
                .ifEmpty { listOf(from.dayOfWeek.value) }
            val weekStart = from.minusDays((from.dayOfWeek.value - 1).toLong())
            val laterThisWeek = selectedDays.firstOrNull { it > from.dayOfWeek.value }
            if (laterThisWeek != null) {
                weekStart.plusDays((laterThisWeek - 1).toLong())
            } else {
                weekStart.plusWeeks(interval.toLong()).plusDays((selectedDays.first() - 1).toLong())
            }
        }
        "Mensal" -> {
            val targetMonth = from.plusMonths(interval.toLong())
            val targetDay = task.recurrenceDetail.toIntOrNull()?.coerceIn(1, targetMonth.lengthOfMonth())
                ?: from.dayOfMonth.coerceAtMost(targetMonth.lengthOfMonth())
            targetMonth.withDayOfMonth(targetDay)
        }
        "Anual" -> from.plusYears(interval.toLong())
        else -> null
    }

    var nextDate = advanceRecurrenceDate(currentDate) ?: return null
    val today = LocalDate.now()
    var skippedDates = 0
    while (!nextDate.isAfter(today) && skippedDates < 10_000) {
        nextDate = advanceRecurrenceDate(nextDate) ?: return null
        skippedDates += 1
    }
    if (!nextDate.isAfter(today)) return null

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

private fun decodeTasks(raw: String?, fallback: List<PopTask>): List<PopTask> {
    if (raw.isNullOrBlank()) return fallback
    return runCatching {
        val items = JSONArray(raw)
        List(items.length()) { index ->
            val item = items.getJSONObject(index)
            val dueLabel = item.getString("dueLabel")
            val storedDueDate = if (item.has("dueDate") && !item.isNull("dueDate")) item.getString("dueDate") else null
            PopTask(
                id = item.getInt("id"),
                serverId = item.optString("serverId"),
                title = item.getString("title"),
                department = item.optString("department", "Pessoal"),
                dueLabel = dueLabel,
                priority = item.getString("priority"),
                dueDate = normalizedDueDate(dueLabel, storedDueDate),
                completed = item.optBoolean("completed"),
                description = item.optString("description"),
                assignee = item.optString("assignee"),
                assignedBy = item.optString("assignedBy"),
                createdBy = item.optString("createdBy"),
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
                canEdit = item.optBoolean("canEdit", true),
                canComplete = item.optBoolean("canComplete", true),
                canDelete = item.optBoolean("canDelete", true),
                assignmentType = item.optString("assignmentType", "user"),
                assignmentTargetId = item.optString("assignmentTargetId"),
                assignmentTargetLabel = item.optString("assignmentTargetLabel"),
                assignees = item.optJSONArray("assignees")?.let { values ->
                    List(values.length()) { assigneeIndex -> values.optString(assigneeIndex) }
                        .filter(String::isNotBlank)
                        .take(3)
                }.orEmpty(),
                checklist = item.optJSONArray("checklist")?.let { values ->
                    List(values.length()) { checklistIndex ->
                        val checklistItem = values.optJSONObject(checklistIndex) ?: JSONObject()
                        TaskChecklistItem(
                            id = checklistItem.optString("id", "check-$checklistIndex"),
                            title = checklistItem.optString("title"),
                            done = checklistItem.optBoolean("done"),
                        )
                    }.filter { it.title.isNotBlank() }
                }.orEmpty(),
            )
        }
    }.getOrElse { fallback }
}

private fun loadGuestTasks(context: Context): List<PopTask> = decodeTasks(
    context.getSharedPreferences(LOCAL_PREFERENCES, Context.MODE_PRIVATE)
        .getString(GUEST_TASKS_STORAGE, null),
    defaultGuestTasks(),
)

private fun accountTasksKey(accountId: String) = "$ACCOUNT_TASKS_STORAGE_PREFIX$accountId"
private fun companyTasksKey(accountId: String, workspaceId: String) =
    "$COMPANY_TASKS_STORAGE_PREFIX${accountId}_$workspaceId"
private fun accountTasksDirtyKey(accountId: String) = "$ACCOUNT_TASKS_DIRTY_PREFIX$accountId"
private fun deletedTasksKey(accountId: String, workspaceId: String) =
    "$DELETED_TASKS_STORAGE_PREFIX${accountId}_${workspaceId.ifBlank { "personal" }}"

private fun loadPendingTaskDeletions(
    context: Context,
    accountId: String,
    workspaceId: String = "",
): List<String> {
    val raw = context.getSharedPreferences(LOCAL_PREFERENCES, Context.MODE_PRIVATE)
        .getString(deletedTasksKey(accountId, workspaceId), null)
        .orEmpty()
    return runCatching {
        val values = JSONArray(raw)
        buildList {
            repeat(values.length()) { index ->
                values.optString(index).takeIf(String::isNotBlank)?.let(::add)
            }
        }
    }.getOrDefault(emptyList())
}

private fun queueTaskDeletion(
    context: Context,
    accountId: String,
    workspaceId: String,
    serverId: String,
) {
    if (serverId.isBlank()) return
    val pending = (loadPendingTaskDeletions(context, accountId, workspaceId) + serverId).distinct()
    context.getSharedPreferences(LOCAL_PREFERENCES, Context.MODE_PRIVATE)
        .edit()
        .putString(deletedTasksKey(accountId, workspaceId), JSONArray(pending).toString())
        .apply()
}

private fun clearPendingTaskDeletions(
    context: Context,
    accountId: String,
    workspaceId: String = "",
) {
    context.getSharedPreferences(LOCAL_PREFERENCES, Context.MODE_PRIVATE)
        .edit()
        .remove(deletedTasksKey(accountId, workspaceId))
        .apply()
}

private fun loadAccountTasks(context: Context, accountId: String): List<PopTask> = decodeTasks(
    context.getSharedPreferences(LOCAL_PREFERENCES, Context.MODE_PRIVATE)
        .getString(accountTasksKey(accountId), null),
    emptyList(),
)

private fun loadCompanyTasks(
    context: Context,
    accountId: String,
    workspaceId: String,
): List<PopTask> = decodeTasks(
    context.getSharedPreferences(LOCAL_PREFERENCES, Context.MODE_PRIVATE)
        .getString(companyTasksKey(accountId, workspaceId), null),
    emptyList(),
)

private fun mergeRemoteTaskRouting(
    remoteTasks: List<PopTask>,
    localTasks: List<PopTask>,
): List<PopTask> {
    val localByServerId = localTasks
        .filter { it.serverId.isNotBlank() }
        .associateBy(PopTask::serverId)
    val localById = localTasks.associateBy(PopTask::id)
    return remoteTasks.map { remote ->
        val local = localByServerId[remote.serverId] ?: localById[remote.id]
        val remoteRoutingMissing =
            remote.assignmentTargetId.isBlank() &&
                remote.assignmentTargetLabel.isBlank() &&
                remote.assignees.isEmpty()
        val localHasRouting =
            local != null &&
                (
                    local.assignmentType != "user" ||
                        local.assignmentTargetId.isNotBlank() ||
                        local.assignmentTargetLabel.isNotBlank() ||
                        local.assignees.isNotEmpty()
                    )
        val merged = if (remoteRoutingMissing && localHasRouting) {
            remote.copy(
                department = local.department,
                assignee = local.assignee,
                assignmentType = local.assignmentType,
                assignmentTargetId = local.assignmentTargetId,
                assignmentTargetLabel = local.assignmentTargetLabel,
                assignees = local.assignees,
            )
        } else {
            remote
        }
        if (merged.checklist.isEmpty() && !local?.checklist.isNullOrEmpty()) {
            merged.copy(checklist = local?.checklist.orEmpty())
        } else {
            merged
        }
    }
}

private fun tasksToJson(tasks: List<PopTask>): JSONArray {
    val items = JSONArray()
    tasks.forEach { task ->
        items.put(
            JSONObject()
                .put("id", task.id)
                .put("serverId", task.serverId)
                .put("title", task.title)
                .put("department", task.department)
                .put("dueLabel", task.dueLabel)
                .put("priority", task.priority)
                .put("dueDate", task.dueDate)
                .put("completed", task.completed)
                .put("description", task.description)
                .put("assignee", task.assignee)
                .put("assignedBy", task.assignedBy)
                .put("createdBy", task.createdBy)
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
                .put("recurrenceOccurrence", task.recurrenceOccurrence)
                .put("canEdit", task.canEdit)
                .put("canComplete", task.canComplete)
                .put("canDelete", task.canDelete)
                .put("assignmentType", task.assignmentType)
                .put("assignmentTargetId", task.assignmentTargetId)
                .put("assignmentTargetLabel", task.assignmentTargetLabel)
                .put("assignees", JSONArray(task.assignees))
                .put(
                    "checklist",
                    JSONArray().apply {
                        task.checklist.forEach { item ->
                            put(
                                JSONObject()
                                    .put("id", item.id)
                                    .put("title", item.title)
                                    .put("done", item.done),
                            )
                        }
                    },
                ),
        )
    }
    return items
}

private fun saveTasks(context: Context, storageKey: String, tasks: List<PopTask>) {
    context.getSharedPreferences(LOCAL_PREFERENCES, Context.MODE_PRIVATE)
        .edit().putString(storageKey, tasksToJson(tasks).toString()).apply()
}

private fun saveGuestTasks(context: Context, tasks: List<PopTask>) =
    saveTasks(context, GUEST_TASKS_STORAGE, tasks)

private fun saveCompanyTasks(
    context: Context,
    accountId: String,
    workspaceId: String,
    tasks: List<PopTask>,
) = saveTasks(context, companyTasksKey(accountId, workspaceId), tasks)

private fun saveAccountTasks(context: Context, accountId: String, tasks: List<PopTask>) =
    saveTasks(context, accountTasksKey(accountId), tasks)

private fun setAccountTasksDirty(context: Context, accountId: String, dirty: Boolean) {
    context.getSharedPreferences(LOCAL_PREFERENCES, Context.MODE_PRIVATE)
        .edit().putBoolean(accountTasksDirtyKey(accountId), dirty).apply()
}

private fun accountTasksAreDirty(context: Context, accountId: String): Boolean =
    context.getSharedPreferences(LOCAL_PREFERENCES, Context.MODE_PRIVATE)
        .getBoolean(accountTasksDirtyKey(accountId), false)

private data class ApiGoogleSession(val token: String)
private data class ApiEmailCodeRequest(val developmentCode: String?)
private data class ApiEmailSession(
    val token: String,
    val id: String,
    val name: String,
    val email: String,
    val photoUrl: String,
)
private data class ApiWorkspaceSummary(
    val id: String,
    val name: String,
    val description: String,
    val kind: String,
    val isOwner: Boolean,
    val canCreateTasks: Boolean,
    val canManageEmployees: Boolean,
    val canManageDepartments: Boolean,
    val canManageGroups: Boolean,
    val employees: List<CompanyMember>,
    val sectors: List<CompanySector>,
    val groups: List<CompanyGroup>,
)
private data class ApiInvitation(
    val id: String,
    val companyName: String,
    val role: String,
    val permissionGroupName: String,
)

private suspend fun loadMobileWorkspaces(apiToken: String): List<ApiWorkspaceSummary> = withContext(Dispatchers.IO) {
    val connection = (URL("$MOBILE_API_BASE_URL/workspaces").openConnection() as java.net.HttpURLConnection).apply {
        requestMethod = "GET"
        connectTimeout = 15_000
        readTimeout = 20_000
        setRequestProperty("Authorization", "Bearer $apiToken")
        setRequestProperty("Accept", "application/json")
    }
    try {
        val responseCode = connection.responseCode
        val responseText = (if (responseCode in 200..299) connection.inputStream else connection.errorStream)
            ?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()
        val response = runCatching { JSONObject(responseText) }.getOrElse { JSONObject() }
        if (responseCode !in 200..299) throw IllegalStateException(response.optString("error", "Falha ao carregar empresas."))
        val items = response.optJSONArray("workspaces") ?: JSONArray()
        buildList {
            repeat(items.length()) { index ->
                val item = items.optJSONObject(index) ?: return@repeat
                val sectorsJson = item.optJSONArray("sectors") ?: JSONArray()
                val groupsJson = item.optJSONArray("groups") ?: JSONArray()
                val employeesJson = item.optJSONArray("employees") ?: JSONArray()
                val sectors = List(sectorsJson.length()) { sectorIndex ->
                    val sector = sectorsJson.optJSONObject(sectorIndex) ?: JSONObject()
                    CompanySector(
                        sector.optString("name"),
                        sector.optString("description"),
                        sector.optString("id"),
                    )
                }
                val groups = List(groupsJson.length()) { groupIndex ->
                    val group = groupsJson.optJSONObject(groupIndex) ?: JSONObject()
                    val memberIdsJson = group.optJSONArray("memberIds") ?: JSONArray()
                    CompanyGroup(
                        group.optString("name"),
                        group.optString("description"),
                        group.optString("id"),
                        List(memberIdsJson.length()) { memberIndex -> memberIdsJson.optString(memberIndex) },
                    )
                }
                val employees = List(employeesJson.length()) { employeeIndex ->
                    val employee = employeesJson.optJSONObject(employeeIndex) ?: JSONObject()
                    val groupIdsJson = employee.optJSONArray("groupIds") ?: JSONArray()
                    CompanyMember(
                        name = employee.optString("name"),
                        email = employee.optString("email"),
                        role = employee.optString("role"),
                        sector = employee.optString("sector"),
                        id = employee.optString("id"),
                        pending = employee.optBoolean("pending", false),
                        isOwner = employee.optBoolean("isOwner", false),
                        photoUrl = employee.optString("photoUrl"),
                        sectorId = employee.optString("sectorId"),
                        groupIds = List(groupIdsJson.length()) { groupIndex -> groupIdsJson.optString(groupIndex) },
                    )
                }
                add(
                    ApiWorkspaceSummary(
                        id = item.optString("id"),
                        name = item.optString("name"),
                        description = item.optString("description"),
                        kind = item.optString("kind"),
                        isOwner = item.optBoolean("isOwner", false),
                        canCreateTasks = item.optBoolean("canCreateTasks", false),
                        canManageEmployees = item.optBoolean("canManageEmployees", false),
                        canManageDepartments = item.optBoolean("canManageDepartments", false),
                        canManageGroups = item.optBoolean("canManageGroups", false),
                        employees = employees,
                        sectors = sectors,
                        groups = groups,
                    ),
                )
            }
        }
    } finally {
        connection.disconnect()
    }
}

private suspend fun loadMobileInvitations(apiToken: String): List<ApiInvitation> = withContext(Dispatchers.IO) {
    val connection = (URL("$MOBILE_API_BASE_URL/invitations").openConnection() as java.net.HttpURLConnection).apply {
        requestMethod = "GET"
        connectTimeout = 15_000
        readTimeout = 20_000
        setRequestProperty("Authorization", "Bearer $apiToken")
        setRequestProperty("Accept", "application/json")
    }
    try {
        val responseCode = connection.responseCode
        val responseText = (if (responseCode in 200..299) connection.inputStream else connection.errorStream)
            ?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()
        val response = runCatching { JSONObject(responseText) }.getOrElse { JSONObject() }
        if (responseCode !in 200..299) throw IllegalStateException(response.optString("error", "Falha ao carregar convites."))
        val items = response.optJSONArray("invitations") ?: JSONArray()
        buildList {
            repeat(items.length()) { index ->
                val item = items.optJSONObject(index) ?: return@repeat
                add(
                    ApiInvitation(
                        id = item.optString("id"),
                        companyName = item.optString("companyName"),
                        role = item.optString("role"),
                        permissionGroupName = item.optString("permissionGroupName"),
                    ),
                )
            }
        }
    } finally {
        connection.disconnect()
    }
}

private suspend fun respondToMobileInvitation(apiToken: String, invitationId: String, accept: Boolean) = withContext(Dispatchers.IO) {
    val connection = (URL("$MOBILE_API_BASE_URL/invitations").openConnection() as java.net.HttpURLConnection).apply {
        requestMethod = "POST"
        connectTimeout = 15_000
        readTimeout = 20_000
        doOutput = true
        setRequestProperty("Authorization", "Bearer $apiToken")
        setRequestProperty("Content-Type", "application/json; charset=utf-8")
        setRequestProperty("Accept", "application/json")
    }
    try {
        connection.outputStream.bufferedWriter(Charsets.UTF_8).use { writer ->
            writer.write(JSONObject().put("invitationId", invitationId).put("accept", accept).toString())
        }
        val responseCode = connection.responseCode
        val responseText = (if (responseCode in 200..299) connection.inputStream else connection.errorStream)
            ?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()
        val response = runCatching { JSONObject(responseText) }.getOrElse { JSONObject() }
        if (responseCode !in 200..299) throw IllegalStateException(response.optString("error", "Falha ao responder ao convite."))
    } finally {
        connection.disconnect()
    }
}

private suspend fun requestEmailCodeWithApi(email: String): ApiEmailCodeRequest = withContext(Dispatchers.IO) {
    val connection = (URL("$MOBILE_API_BASE_URL/auth/email/request-code").openConnection() as java.net.HttpURLConnection).apply {
        requestMethod = "POST"
        connectTimeout = 15_000
        readTimeout = 20_000
        doOutput = true
        setRequestProperty("Content-Type", "application/json; charset=utf-8")
        setRequestProperty("Accept", "application/json")
    }
    try {
        connection.outputStream.bufferedWriter(Charsets.UTF_8).use { writer ->
            writer.write(JSONObject().put("email", email.trim().lowercase()).toString())
        }
        val responseCode = connection.responseCode
        val responseText = (if (responseCode in 200..299) connection.inputStream else connection.errorStream)
            ?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()
        val response = runCatching { JSONObject(responseText) }.getOrElse { JSONObject() }
        if (responseCode !in 200..299) {
            throw IllegalStateException(response.optString("error", "Não foi possível enviar o código."))
        }
        ApiEmailCodeRequest(response.optString("developmentCode").takeIf(String::isNotBlank))
    } finally {
        connection.disconnect()
    }
}

private suspend fun verifyEmailCodeWithApi(email: String, code: String): ApiEmailSession = withContext(Dispatchers.IO) {
    val connection = (URL("$MOBILE_API_BASE_URL/auth/email/verify-code").openConnection() as java.net.HttpURLConnection).apply {
        requestMethod = "POST"
        connectTimeout = 15_000
        readTimeout = 20_000
        doOutput = true
        setRequestProperty("Content-Type", "application/json; charset=utf-8")
        setRequestProperty("Accept", "application/json")
    }
    try {
        connection.outputStream.bufferedWriter(Charsets.UTF_8).use { writer ->
            writer.write(
                JSONObject()
                    .put("email", email.trim().lowercase())
                    .put("code", code)
                    .toString(),
            )
        }
        val responseCode = connection.responseCode
        val responseText = (if (responseCode in 200..299) connection.inputStream else connection.errorStream)
            ?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()
        val response = runCatching { JSONObject(responseText) }.getOrElse { JSONObject() }
        if (responseCode !in 200..299) {
            throw IllegalStateException(response.optString("error", "Não foi possível confirmar o código."))
        }
        val token = response.optString("token")
        val user = response.optJSONObject("user") ?: JSONObject()
        if (token.isBlank() || user.optString("id").isBlank()) {
            throw IllegalStateException("O servidor não retornou uma sessão válida.")
        }
        ApiEmailSession(
            token = token,
            id = user.optString("id"),
            name = user.optString("name"),
            email = user.optString("email"),
            photoUrl = user.optString("photoUrl"),
        )
    } finally {
        connection.disconnect()
    }
}

private suspend fun authenticateGoogleWithApi(idToken: String): ApiGoogleSession = withContext(Dispatchers.IO) {
    val connection = (URL("$MOBILE_API_BASE_URL/auth/google").openConnection() as java.net.HttpURLConnection).apply {
        requestMethod = "POST"
        connectTimeout = 15_000
        readTimeout = 20_000
        doOutput = true
        setRequestProperty("Content-Type", "application/json; charset=utf-8")
        setRequestProperty("Accept", "application/json")
    }
    try {
        connection.outputStream.bufferedWriter(Charsets.UTF_8).use { writer ->
            writer.write(JSONObject().put("credential", idToken).toString())
        }
        val responseCode = connection.responseCode
        val responseText = (if (responseCode in 200..299) connection.inputStream else connection.errorStream)
            ?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()
        val response = runCatching { JSONObject(responseText) }.getOrElse { JSONObject() }
        if (responseCode !in 200..299) {
            throw IllegalStateException(response.optString("error", "Não foi possível conectar ao servidor."))
        }
        val token = response.optString("token")
        if (token.isBlank()) throw IllegalStateException("O servidor não retornou uma sessão válida.")
        ApiGoogleSession(token)
    } finally {
        connection.disconnect()
    }
}

private fun displayDueLabel(task: PopTask): String {
    val date = runCatching { LocalDate.parse(task.dueDate) }.getOrNull() ?: return task.dueLabel
    val dateLabel = dueLabelForDate(date)
    val legacyInlineTime = task.dueLabel.substringAfter(",", missingDelimiterValue = "").trim()
    return if (task.dueTime.isBlank() && legacyInlineTime.isNotBlank()) {
        "$dateLabel, $legacyInlineTime"
    } else {
        dateLabel
    }
}

private fun isTaskOverdue(task: PopTask): Boolean =
    !task.completed &&
        runCatching { LocalDate.parse(task.dueDate) }.getOrNull()?.isBefore(LocalDate.now()) == true

private fun isFutureRecurrence(task: PopTask, today: LocalDate = LocalDate.now()): Boolean =
    !task.completed &&
        task.recurrenceOccurrence > 1 &&
        runCatching { LocalDate.parse(task.dueDate) }.getOrNull()?.isAfter(today) == true

private suspend fun loadRemoteTasks(apiToken: String, workspaceId: String = ""): List<PopTask> = withContext(Dispatchers.IO) {
    val connection = (URL("$MOBILE_API_BASE_URL/tasks").openConnection() as java.net.HttpURLConnection).apply {
        requestMethod = "GET"
        connectTimeout = 15_000
        readTimeout = 20_000
        setRequestProperty("Authorization", "Bearer $apiToken")
        if (workspaceId.isNotBlank()) setRequestProperty("X-Workspace-Id", workspaceId)
        setRequestProperty("Accept", "application/json")
    }
    try {
        val responseCode = connection.responseCode
        val responseText = (if (responseCode in 200..299) connection.inputStream else connection.errorStream)
            ?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()
        val response = runCatching { JSONObject(responseText) }.getOrElse { JSONObject() }
        if (responseCode !in 200..299) {
            throw IllegalStateException(response.optString("error", "Falha ao carregar tarefas."))
        }
        decodeTasks(response.optJSONArray("tasks")?.toString(), emptyList())
    } finally {
        connection.disconnect()
    }
}

private suspend fun syncRemoteTasks(
    apiToken: String,
    tasks: List<PopTask>,
    workspaceId: String = "",
    deletedServerIds: List<String> = emptyList(),
) = withContext(Dispatchers.IO) {
    val connection = (URL("$MOBILE_API_BASE_URL/tasks").openConnection() as java.net.HttpURLConnection).apply {
        requestMethod = "PUT"
        connectTimeout = 15_000
        readTimeout = 20_000
        doOutput = true
        setRequestProperty("Authorization", "Bearer $apiToken")
        if (workspaceId.isNotBlank()) setRequestProperty("X-Workspace-Id", workspaceId)
        setRequestProperty("Content-Type", "application/json; charset=utf-8")
        setRequestProperty("Accept", "application/json")
    }
    try {
        connection.outputStream.bufferedWriter(Charsets.UTF_8).use { writer ->
            writer.write(
                JSONObject()
                    .put("tasks", tasksToJson(tasks))
                    .put("deletedServerIds", JSONArray(deletedServerIds))
                    .toString(),
            )
        }
        val responseCode = connection.responseCode
        val responseText = (if (responseCode in 200..299) connection.inputStream else connection.errorStream)
            ?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()
        if (responseCode !in 200..299) {
            val response = runCatching { JSONObject(responseText) }.getOrElse { JSONObject() }
            throw IllegalStateException(response.optString("error", "Falha ao salvar tarefas."))
        }
    } finally {
        connection.disconnect()
    }
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
fun PopOrganizeApp(
    externalTaskId: Int? = null,
    onExternalTaskOpened: () -> Unit = {},
) {
    val context = LocalContext.current
    var lightTheme by remember {
        mutableStateOf(
            context.getSharedPreferences(LOCAL_PREFERENCES, Context.MODE_PRIVATE)
                .getBoolean(LIGHT_THEME_STORAGE, false),
        )
    }
    PopTheme(lightTheme = lightTheme) {
        val appScope = rememberCoroutineScope()
        var stage by remember { mutableStateOf(AppStage.Splash) }
        val notificationPermissionLauncher = rememberLauncherForActivityResult(
            ActivityResultContracts.RequestPermission(),
        ) { }
        LaunchedEffect(stage) {
            if (
                stage == AppStage.Main &&
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
                ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
            ) {
                notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
        }
        var logoEntered by remember { mutableStateOf(false) }
        var sessionMode by remember {
            val storedMode = context.getSharedPreferences(LOCAL_PREFERENCES, Context.MODE_PRIVATE)
                .getString(SESSION_MODE_STORAGE, null)
            mutableStateOf(storedMode?.let { value -> runCatching { SessionMode.valueOf(value) }.getOrNull() })
        }
        var googleAccount by remember {
            val preferences = context.getSharedPreferences(LOCAL_PREFERENCES, Context.MODE_PRIVATE)
            val id = preferences.getString(GOOGLE_ACCOUNT_ID_STORAGE, null)
            val email = preferences.getString(GOOGLE_ACCOUNT_EMAIL_STORAGE, null)
            val name = preferences.getString(GOOGLE_ACCOUNT_NAME_STORAGE, null)
            val photoUrl = preferences.getString(GOOGLE_ACCOUNT_PHOTO_STORAGE, null)
            val apiToken = preferences.getString(API_SESSION_TOKEN_STORAGE, null)
            mutableStateOf(
                if (!id.isNullOrBlank() && !email.isNullOrBlank() && !apiToken.isNullOrBlank()) {
                    GoogleAccount(
                        id = id,
                        name = name.orEmpty(),
                        email = email,
                        photoUrl = photoUrl.orEmpty(),
                        apiToken = apiToken,
                    )
                } else {
                    null
                },
            )
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
                sessionMode == SessionMode.Guest -> AppStage.Main
                sessionMode != null && sessionMode != SessionMode.Guest && googleAccount != null -> AppStage.Main
                else -> AppStage.Login
            }
        }

        SystemBarAppearance(darkBackground = stage != AppStage.Main || !lightTheme)

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
                    onGoogleSignedIn = { account ->
                        completeOnboarding()
                        sessionMode = SessionMode.Google
                        googleAccount = account
                        context.getSharedPreferences(LOCAL_PREFERENCES, Context.MODE_PRIVATE)
                            .edit()
                            .putString(SESSION_MODE_STORAGE, SessionMode.Google.name)
                            .putString(GOOGLE_ACCOUNT_ID_STORAGE, account.id)
                            .putString(GOOGLE_ACCOUNT_NAME_STORAGE, account.name)
                            .putString(GOOGLE_ACCOUNT_EMAIL_STORAGE, account.email)
                            .putString(GOOGLE_ACCOUNT_PHOTO_STORAGE, account.photoUrl)
                            .putString(API_SESSION_TOKEN_STORAGE, account.apiToken)
                            .apply()
                        stage = AppStage.Main
                    },
                    onEmailSignedIn = { account ->
                        completeOnboarding()
                        sessionMode = SessionMode.Email
                        googleAccount = account
                        context.getSharedPreferences(LOCAL_PREFERENCES, Context.MODE_PRIVATE)
                            .edit()
                            .putString(SESSION_MODE_STORAGE, SessionMode.Email.name)
                            .putString(GOOGLE_ACCOUNT_ID_STORAGE, account.id)
                            .putString(GOOGLE_ACCOUNT_NAME_STORAGE, account.name)
                            .putString(GOOGLE_ACCOUNT_EMAIL_STORAGE, account.email)
                            .putString(GOOGLE_ACCOUNT_PHOTO_STORAGE, account.photoUrl)
                            .putString(API_SESSION_TOKEN_STORAGE, account.apiToken)
                            .apply()
                        stage = AppStage.Main
                    },
                )
                AppStage.Main -> PopMainContent(
                    sessionMode = sessionMode ?: SessionMode.Guest,
                    googleAccount = googleAccount,
                    externalTaskId = externalTaskId,
                    onExternalTaskOpened = onExternalTaskOpened,
                    lightTheme = lightTheme,
                    onLightThemeChange = { enabled ->
                        lightTheme = enabled
                        context.getSharedPreferences(LOCAL_PREFERENCES, Context.MODE_PRIVATE)
                            .edit()
                            .putBoolean(LIGHT_THEME_STORAGE, enabled)
                            .apply()
                    },
                    onRequireLogin = { stage = AppStage.Login },
                    onSignOut = {
                        sessionMode = null
                        googleAccount = null
                        context.getSharedPreferences(LOCAL_PREFERENCES, Context.MODE_PRIVATE)
                            .edit()
                            .remove(SESSION_MODE_STORAGE)
                            .remove(GOOGLE_ACCOUNT_ID_STORAGE)
                            .remove(GOOGLE_ACCOUNT_NAME_STORAGE)
                            .remove(GOOGLE_ACCOUNT_EMAIL_STORAGE)
                            .remove(GOOGLE_ACCOUNT_PHOTO_STORAGE)
                            .remove(API_SESSION_TOKEN_STORAGE)
                            .apply()
                        appScope.launch {
                            runCatching {
                                CredentialManager.create(context).clearCredentialState(ClearCredentialStateRequest())
                            }
                        }
                        stage = AppStage.Login
                    },
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
        window.navigationBarColor = if (darkBackground) android.graphics.Color.rgb(5, 5, 5) else android.graphics.Color.rgb(244, 247, 250)
        WindowCompat.getInsetsController(window, view).apply {
            isAppearanceLightStatusBars = !darkBackground
            isAppearanceLightNavigationBars = !darkBackground
        }
    }
}

private fun decodeTaskOrganization(response: JSONObject): NativeTaskOrganization {
    val foldersJson = response.optJSONArray("folders") ?: JSONArray()
    val listsJson = response.optJSONArray("lists") ?: JSONArray()
    val folders = buildList {
        repeat(foldersJson.length()) { index ->
            val item = foldersJson.optJSONObject(index) ?: return@repeat
            add(
                NativeTaskFolder(
                    id = item.optString("id"),
                    name = item.optString("name"),
                    parentId = item.optString("parentId"),
                    position = item.optInt("position", index),
                ),
            )
        }
    }
    val lists = buildList {
        repeat(listsJson.length()) { index ->
            val item = listsJson.optJSONObject(index) ?: return@repeat
            val taskIdsJson = item.optJSONArray("taskIds") ?: JSONArray()
            add(
                NativeTaskList(
                    id = item.optString("id"),
                    name = item.optString("name"),
                    folderId = item.optString("folderId"),
                    taskIds = buildList {
                        repeat(taskIdsJson.length()) { taskIndex ->
                            taskIdsJson.optString(taskIndex).takeIf(String::isNotBlank)?.let(::add)
                        }
                    },
                    position = item.optInt("position", index),
                ),
            )
        }
    }
    return NativeTaskOrganization(folders, lists)
}

private fun taskOrganizationJson(organization: NativeTaskOrganization): JSONObject =
    JSONObject()
        .put(
            "folders",
            JSONArray().apply {
                organization.folders.forEach { folder ->
                    put(
                        JSONObject()
                            .put("id", folder.id)
                            .put("name", folder.name)
                            .put("position", folder.position)
                            .apply {
                                if (folder.parentId.isNotBlank()) put("parentId", folder.parentId)
                            },
                    )
                }
            },
        )
        .put(
            "lists",
            JSONArray().apply {
                organization.lists.forEach { list ->
                    put(
                        JSONObject()
                            .put("id", list.id)
                            .put("name", list.name)
                            .put("taskIds", JSONArray(list.taskIds))
                            .put("position", list.position)
                            .apply {
                                if (list.folderId.isNotBlank()) put("folderId", list.folderId)
                            },
                    )
                }
            },
        )

private suspend fun loadRemoteTaskOrganization(
    apiToken: String,
    workspaceId: String = "",
): NativeTaskOrganization = withContext(Dispatchers.IO) {
    val connection = (URL("$MOBILE_API_BASE_URL/task-lists").openConnection() as java.net.HttpURLConnection).apply {
        requestMethod = "GET"
        connectTimeout = 15_000
        readTimeout = 20_000
        setRequestProperty("Authorization", "Bearer $apiToken")
        if (workspaceId.isNotBlank()) setRequestProperty("X-Workspace-Id", workspaceId)
        setRequestProperty("Accept", "application/json")
    }
    try {
        val responseCode = connection.responseCode
        val responseText = (if (responseCode in 200..299) connection.inputStream else connection.errorStream)
            ?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()
        val response = runCatching { JSONObject(responseText) }.getOrElse { JSONObject() }
        if (responseCode !in 200..299) {
            throw IllegalStateException(response.optString("error", "Falha ao carregar listas."))
        }
        decodeTaskOrganization(response)
    } finally {
        connection.disconnect()
    }
}

private suspend fun syncRemoteTaskOrganization(
    apiToken: String,
    organization: NativeTaskOrganization,
    workspaceId: String = "",
): NativeTaskOrganization = withContext(Dispatchers.IO) {
    val connection = (URL("$MOBILE_API_BASE_URL/task-lists").openConnection() as java.net.HttpURLConnection).apply {
        requestMethod = "PUT"
        connectTimeout = 15_000
        readTimeout = 20_000
        doOutput = true
        setRequestProperty("Authorization", "Bearer $apiToken")
        if (workspaceId.isNotBlank()) setRequestProperty("X-Workspace-Id", workspaceId)
        setRequestProperty("Content-Type", "application/json; charset=utf-8")
        setRequestProperty("Accept", "application/json")
    }
    try {
        connection.outputStream.bufferedWriter(Charsets.UTF_8).use { writer ->
            writer.write(taskOrganizationJson(organization).toString())
        }
        val responseCode = connection.responseCode
        val responseText = (if (responseCode in 200..299) connection.inputStream else connection.errorStream)
            ?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()
        val response = runCatching { JSONObject(responseText) }.getOrElse { JSONObject() }
        if (responseCode !in 200..299) {
            throw IllegalStateException(response.optString("error", "Falha ao salvar listas."))
        }
        decodeTaskOrganization(response)
    } finally {
        connection.disconnect()
    }
}

private suspend fun mutateMobileWorkspace(
    apiToken: String,
    workspaceId: String,
    payload: JSONObject,
): JSONObject = withContext(Dispatchers.IO) {
    val connection = (URL("$MOBILE_API_BASE_URL/workspaces").openConnection() as java.net.HttpURLConnection).apply {
        requestMethod = "POST"
        connectTimeout = 15_000
        readTimeout = 30_000
        doOutput = true
        setRequestProperty("Authorization", "Bearer $apiToken")
        setRequestProperty("X-Workspace-Id", workspaceId)
        setRequestProperty("Content-Type", "application/json; charset=utf-8")
        setRequestProperty("Accept", "application/json")
    }
    try {
        connection.outputStream.bufferedWriter(Charsets.UTF_8).use { writer ->
            writer.write(payload.toString())
        }
        val responseCode = connection.responseCode
        val responseText = (if (responseCode in 200..299) connection.inputStream else connection.errorStream)
            ?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()
        val response = runCatching { JSONObject(responseText) }.getOrElse { JSONObject() }
        if (responseCode !in 200..299) {
            throw IllegalStateException(response.optString("error", "Falha ao salvar o cadastro."))
        }
        response
    } finally {
        connection.disconnect()
    }
}

@Composable
private fun KeepModalNavigationBarHidden() {
    val view = LocalView.current

    fun hideNavigationBar() {
        val window = (view.parent as? DialogWindowProvider)?.window
            ?: (view.context as? Activity)?.window
            ?: return
        WindowCompat.getInsetsController(window, window.decorView).apply {
            systemBarsBehavior =
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            hide(WindowInsetsCompat.Type.navigationBars())
        }
    }

    SideEffect {
        hideNavigationBar()
    }
    LaunchedEffect(view) {
        delay(80)
        hideNavigationBar()
        delay(180)
        hideNavigationBar()
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
private fun PopWordmark(modifier: Modifier = Modifier, large: Boolean = false, color: Color = PopText) {
    val mainSize = if (large) 29.sp else 22.sp
    Row(modifier = modifier, verticalAlignment = Alignment.CenterVertically) {
        Text("P", color = color, fontSize = mainSize, fontWeight = FontWeight.ExtraBold, letterSpacing = (-2).sp)
        Box(Modifier.size(if (large) 19.dp else 14.dp).clip(CircleShape).background(PopBlue))
        Text("p", color = color, fontSize = mainSize, fontWeight = FontWeight.ExtraBold, letterSpacing = (-2).sp)
        Text("Organize", color = color, fontSize = mainSize, fontWeight = FontWeight.ExtraBold, letterSpacing = (-2).sp, modifier = Modifier.padding(start = if (large) 5.dp else 4.dp))
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
        PopWordmark(large = true, color = Color.White)
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
private fun LoginScreen(
    onGuest: () -> Unit,
    onGoogleSignedIn: (GoogleAccount) -> Unit,
    onEmailSignedIn: (GoogleAccount) -> Unit,
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val credentialManager = remember(context) { CredentialManager.create(context) }
    val googleWebClientId = context.getString(R.string.google_web_client_id).trim()
    var showEmail by remember { mutableStateOf(false) }
    var email by remember { mutableStateOf("") }
    var emailCode by remember { mutableStateOf("") }
    var emailCodeSent by remember { mutableStateOf(false) }
    var emailFeedback by remember { mutableStateOf<String?>(null) }
    var emailFeedbackIsError by remember { mutableStateOf(false) }
    var isEmailPending by remember { mutableStateOf(false) }
    var isGoogleSignInPending by remember { mutableStateOf(false) }

    fun startGoogleSignIn() {
        if (googleWebClientId.isBlank() || googleWebClientId.startsWith("YOUR_")) {
            Toast.makeText(
                context,
                "Configure o ID do cliente Web do Google em strings.xml.",
                Toast.LENGTH_LONG,
            ).show()
            return
        }

        val googleOption = GetSignInWithGoogleOption.Builder(googleWebClientId)
            .setNonce(generateGoogleSignInNonce())
            .build()
        val request = GetCredentialRequest.Builder()
            .addCredentialOption(googleOption)
            .build()

        isGoogleSignInPending = true
        coroutineScope.launch {
            try {
                val response = credentialManager.getCredential(context, request)
                val credential = response.credential
                if (
                    credential !is CustomCredential ||
                    credential.type != GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
                ) {
                    Toast.makeText(context, "O Google retornou uma credencial incompatível.", Toast.LENGTH_LONG).show()
                    return@launch
                }

                val googleCredential = GoogleIdTokenCredential.createFrom(credential.data)
                val apiSession = authenticateGoogleWithApi(googleCredential.idToken)
                onGoogleSignedIn(
                    GoogleAccount(
                        id = googleCredential.id,
                        name = googleCredential.displayName.orEmpty(),
                        email = googleCredential.id,
                        photoUrl = googleCredential.profilePictureUri?.toString().orEmpty(),
                        apiToken = apiSession.token,
                    ),
                )
            } catch (_: GetCredentialCancellationException) {
                Toast.makeText(context, "Login com Google cancelado.", Toast.LENGTH_SHORT).show()
            } catch (_: NoCredentialException) {
                Toast.makeText(
                    context,
                    "Nenhuma conta Google está disponível neste aparelho.",
                    Toast.LENGTH_LONG,
                ).show()
            } catch (_: GoogleIdTokenParsingException) {
                Toast.makeText(context, "Não foi possível validar a resposta do Google.", Toast.LENGTH_LONG).show()
            } catch (error: GetCredentialException) {
                Toast.makeText(
                    context,
                    error.localizedMessage ?: "Falha ao entrar com o Google.",
                    Toast.LENGTH_LONG,
                ).show()
            } catch (error: Exception) {
                Toast.makeText(
                    context,
                    error.localizedMessage ?: "Não foi possível conectar ao servidor.",
                    Toast.LENGTH_LONG,
                ).show()
            } finally {
                isGoogleSignInPending = false
            }
        }
    }

    fun requestEmailCode() {
        val normalizedEmail = email.trim().lowercase()
        if (!android.util.Patterns.EMAIL_ADDRESS.matcher(normalizedEmail).matches()) {
            emailFeedback = "Informe um e-mail válido."
            emailFeedbackIsError = true
            return
        }
        val isResending = emailCodeSent
        emailFeedback = null
        isEmailPending = true
        coroutineScope.launch {
            try {
                requestEmailCodeWithApi(normalizedEmail)
                email = normalizedEmail
                emailCodeSent = true
                emailCode = ""
                emailFeedback = if (isResending) "Novo código enviado." else null
                emailFeedbackIsError = false
            } catch (error: Exception) {
                emailFeedback = error.localizedMessage ?: "Não foi possível enviar o código."
                emailFeedbackIsError = true
            } finally {
                isEmailPending = false
            }
        }
    }

    fun confirmEmailCode() {
        if (emailCode.length != 6) {
            emailFeedback = "Digite os 6 números do código."
            emailFeedbackIsError = true
            return
        }
        emailFeedback = null
        isEmailPending = true
        coroutineScope.launch {
            try {
                val session = verifyEmailCodeWithApi(email, emailCode)
                onEmailSignedIn(
                    GoogleAccount(
                        id = session.id,
                        name = session.name,
                        email = session.email,
                        photoUrl = session.photoUrl,
                        apiToken = session.token,
                    ),
                )
            } catch (error: Exception) {
                emailFeedback = error.localizedMessage ?: "Não foi possível confirmar o código."
                emailFeedbackIsError = true
            } finally {
                isEmailPending = false
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF2C2C2C))
            .padding(WindowInsets.statusBars.asPaddingValues())
            .imePadding()
            .padding(horizontal = 28.dp, vertical = 18.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        PopWordmark(large = true, color = Color.White)
        Column(
            Modifier.weight(1f),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            AnimatedVisibility(visible = emailCodeSent) {
                Image(
                    painter = painterResource(R.drawable.email_code_message),
                    contentDescription = "Mensagem com código de confirmação",
                    contentScale = ContentScale.Fit,
                    modifier = Modifier.fillMaxWidth().height(132.dp).padding(bottom = 8.dp),
                )
            }
            Text(
                when {
                    emailCodeSent -> "Verifique seu e-mail"
                    showEmail -> "Entre com seu e-mail"
                    else -> "Comece por aqui"
                },
                color = Color.White,
                fontSize = if (showEmail) 28.sp else 34.sp,
                fontWeight = FontWeight.ExtraBold,
                lineHeight = if (showEmail) 34.sp else 41.sp,
                letterSpacing = (-0.35).sp,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            )
            Text(
                when {
                    emailCodeSent -> "Digite o código de 6 números que enviamos para você."
                    showEmail -> "Use seu e-mail para acessar o Pop Organize."
                    else -> "Escolha como você quer continuar."
                },
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
                AnimatedContent(
                    targetState = emailCodeSent,
                    transitionSpec = { fadeIn(tween(220)) togetherWith fadeOut(tween(160)) },
                    label = "emailVerificationStep",
                ) { codeStep ->
                    if (!codeStep) {
                        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            DarkLoginField(
                                value = email,
                                onValueChange = {
                                    email = it
                                    emailFeedback = null
                                },
                                label = "E-mail",
                                icon = Icons.Rounded.Email,
                                keyboardType = KeyboardType.Email,
                                imeAction = ImeAction.Done,
                            )
                            LoginActionButton(
                                text = if (isEmailPending) "Enviando..." else "Enviar código",
                                background = PopBlue,
                                foreground = Color.White,
                                enabled = !isEmailPending,
                                showLoader = isEmailPending,
                                onClick = ::requestEmailCode,
                            )
                        }
                    } else {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            Surface(
                                color = Color.White.copy(alpha = .075f),
                                contentColor = Color.White.copy(alpha = .82f),
                                shape = RoundedCornerShape(16.dp),
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 11.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Icon(Icons.Rounded.Lock, null, tint = PopBlue, modifier = Modifier.size(18.dp))
                                    Spacer(Modifier.width(9.dp))
                                    Text(
                                        email,
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                    )
                                }
                            }
                            Text(
                                "Digite o código",
                                color = Color.White.copy(alpha = .65f),
                                fontSize = 13.sp,
                                fontWeight = FontWeight.SemiBold,
                            )
                            EmailOtpField(
                                value = emailCode,
                                onValueChange = {
                                    emailCode = it
                                    if (emailFeedbackIsError) emailFeedback = null
                                },
                                enabled = !isEmailPending,
                            )
                            LoginActionButton(
                                text = if (isEmailPending) "Verificando..." else "Verificar código",
                                background = PopBlue,
                                foreground = Color.White,
                                enabled = !isEmailPending && emailCode.length == 6,
                                showLoader = isEmailPending,
                                onClick = ::confirmEmailCode,
                            )
                            Surface(
                                onClick = ::requestEmailCode,
                                enabled = !isEmailPending,
                                color = Color.Transparent,
                                contentColor = PopBlue,
                                shape = RoundedCornerShape(15.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(44.dp)
                                    .border(1.dp, PopBlue.copy(alpha = .62f), RoundedCornerShape(15.dp)),
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Text("Reenviar código", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }
                AnimatedVisibility(visible = !emailFeedback.isNullOrBlank()) {
                    Text(
                        emailFeedback.orEmpty(),
                        color = if (emailFeedbackIsError) Color(0xFFFF7C85) else Color.White.copy(alpha = .7f),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp),
                    )
                }
                Surface(
                    onClick = {
                        if (emailCodeSent) {
                            emailCodeSent = false
                            emailCode = ""
                            emailFeedback = null
                        } else {
                            showEmail = false
                            emailFeedback = null
                        }
                    },
                    color = Color.Transparent,
                    contentColor = Color.White.copy(alpha = .68f),
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier.fillMaxWidth().height(44.dp),
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Text(
                            if (emailCodeSent) "Voltar e alterar e-mail" else "Voltar para outras opções",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.SemiBold,
                        )
                    }
                }
            }
        }

        if (!showEmail) {
            LoginActionButton(
                text = if (isGoogleSignInPending) "Conectando ao Google..." else "Continuar com Google",
                background = Color.White,
                foreground = Color(0xFF202124),
                googleLogo = true,
                enabled = !isGoogleSignInPending,
                showLoader = isGoogleSignInPending,
                onClick = ::startGoogleSignIn,
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
private fun EmailOtpField(
    value: String,
    onValueChange: (String) -> Unit,
    enabled: Boolean,
) {
    val focusRequester = remember { FocusRequester() }
    val keyboardController = LocalSoftwareKeyboardController.current

    LaunchedEffect(Unit) {
        focusRequester.requestFocus()
        keyboardController?.show()
    }
    LaunchedEffect(value) {
        if (value.length == 6) keyboardController?.hide()
    }

    BasicTextField(
        value = value,
        onValueChange = { onValueChange(it.filter(Char::isDigit).take(6)) },
        enabled = enabled,
        singleLine = true,
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword, imeAction = ImeAction.Done),
        textStyle = androidx.compose.ui.text.TextStyle(color = Color.Transparent),
        cursorBrush = SolidColor(Color.Transparent),
        modifier = Modifier.fillMaxWidth().focusRequester(focusRequester),
        decorationBox = { innerTextField ->
            Box {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    repeat(6) { index ->
                        val digit = value.getOrNull(index)?.toString().orEmpty()
                        val isActive = enabled && (index == value.length || (value.length == 6 && index == 5))
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .height(54.dp)
                                .background(Color.White.copy(alpha = if (digit.isNotEmpty()) .12f else .07f), RoundedCornerShape(15.dp))
                                .border(
                                    width = if (isActive) 1.5.dp else 1.dp,
                                    color = if (isActive) PopBlue else Color.White.copy(alpha = .1f),
                                    shape = RoundedCornerShape(15.dp),
                                ),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                digit,
                                color = Color.White,
                                fontSize = 21.sp,
                                fontWeight = FontWeight.Bold,
                            )
                        }
                    }
                }
                Box(Modifier.size(1.dp).graphicsLayer { alpha = 0f }) {
                    innerTextField()
                }
            }
        },
    )
}

@Composable
private fun LoginActionButton(
    text: String,
    background: Color,
    foreground: Color,
    onClick: () -> Unit,
    icon: ImageVector? = null,
    googleLogo: Boolean = false,
    enabled: Boolean = true,
    showLoader: Boolean = false,
) {
    Surface(
        onClick = onClick,
        enabled = enabled,
        color = background,
        contentColor = foreground,
        shape = RoundedCornerShape(18.dp),
        modifier = Modifier.fillMaxWidth().height(56.dp),
    ) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            if (showLoader) {
                CircularProgressIndicator(
                    color = foreground,
                    strokeWidth = 3.dp,
                    modifier = Modifier.size(27.dp),
                )
            } else if (googleLogo) {
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
            if (!showLoader) {
                Text(
                    text,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = .15.sp,
                )
            }
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PopMainContent(
    sessionMode: SessionMode,
    googleAccount: GoogleAccount?,
    externalTaskId: Int?,
    onExternalTaskOpened: () -> Unit,
    lightTheme: Boolean,
    onLightThemeChange: (Boolean) -> Unit,
    onRequireLogin: () -> Unit,
    onSignOut: () -> Unit,
) {
    val context = LocalContext.current
    val navigationScope = rememberCoroutineScope()
    var destination by remember { mutableStateOf(PopDestination.Dashboard) }
    var showMoreSheet by remember { mutableStateOf(false) }
    var showTaskOrganizer by remember { mutableStateOf(false) }
    val moreSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    var taskToOpenId by remember { mutableStateOf<Int?>(null) }
    var taskToCreateDate by remember { mutableStateOf<LocalDate?>(null) }
    var workSpace by remember { mutableStateOf(WorkSpace.Personal) }
    var selectedCompanyIndex by remember { mutableIntStateOf(0) }
    var preferredWorkspaceRestored by remember(googleAccount?.id) { mutableStateOf(false) }
    var showCreateCompany by remember { mutableStateOf(false) }
    var createCompanyName by remember { mutableStateOf("") }
    var createCompanyDescription by remember { mutableStateOf("") }
    var createCompanyPending by remember { mutableStateOf(false) }
    var createCompanyError by remember { mutableStateOf<String?>(null) }
    val companyNames = remember { mutableStateListOf<String>() }
    val companyIds = remember { mutableStateListOf<String>() }
    val companyOwnership = remember { mutableStateListOf<Boolean>() }
    val companyDescriptions = remember { mutableStateListOf<String>() }
    val companyCanCreateTasks = remember { mutableStateListOf<Boolean>() }
    val companyCanManageEmployees = remember { mutableStateListOf<Boolean>() }
    val companyCanManageDepartments = remember { mutableStateListOf<Boolean>() }
    val companyCanManageGroups = remember { mutableStateListOf<Boolean>() }
    val companyMembers = remember { mutableStateListOf<CompanyMember>() }
    val companySectors = remember { mutableStateListOf<CompanySector>() }
    val companyGroups = remember { mutableStateListOf<CompanyGroup>() }
    val companyMemberLists = remember { mutableStateListOf<List<CompanyMember>>() }
    val companySectorLists = remember { mutableStateListOf<List<CompanySector>>() }
    val companyGroupLists = remember { mutableStateListOf<List<CompanyGroup>>() }
    val pendingInvitations = remember { mutableStateListOf<ApiInvitation>() }
    var invitationActionPending by remember { mutableStateOf(false) }
    val personalTasks = remember(sessionMode, googleAccount?.id) {
        mutableStateListOf<PopTask>().apply {
            addAll(
                if (sessionMode == SessionMode.Guest) {
                    loadGuestTasks(context)
                } else {
                    googleAccount?.id?.let { loadAccountTasks(context, it) }.orEmpty()
                },
            )
        }
    }
    var remoteTasksLoaded by remember(sessionMode, googleAccount?.id) {
        mutableStateOf(sessionMode == SessionMode.Guest)
    }
    var isRefreshing by remember { mutableStateOf(false) }
    var lastSyncedTasksJson by remember(sessionMode, googleAccount?.id) { mutableStateOf("") }
    val lastSyncedCompanyTasks = remember(sessionMode, googleAccount?.id) { mutableStateMapOf<String, String>() }
    val companyTaskGroups = remember(sessionMode) { mutableStateListOf<MutableList<PopTask>>() }
    val taskFolders = remember(sessionMode, googleAccount?.id) { mutableStateListOf<NativeTaskFolder>() }
    val taskLists = remember(sessionMode, googleAccount?.id) { mutableStateListOf<NativeTaskList>() }
    var selectedTaskListId by remember { mutableStateOf<String?>(null) }
    val assignmentPreferences = remember {
        context.getSharedPreferences(LOCAL_PREFERENCES, Context.MODE_PRIVATE)
    }
    val lastWorkspaceKey = remember(googleAccount?.id) {
        "$LAST_WORKSPACE_STORAGE_PREFIX${googleAccount?.id.orEmpty()}"
    }
    val assignmentSeenKey = remember(googleAccount?.id) {
        "$ASSIGNED_TASKS_SEEN_PREFIX${googleAccount?.id.orEmpty()}"
    }
    val seenAssignedTaskIds = remember(assignmentSeenKey) {
        mutableStateListOf<String>().apply {
            val raw = assignmentPreferences.getString(assignmentSeenKey, null)
            if (!raw.isNullOrBlank()) {
                runCatching {
                    val values = JSONArray(raw)
                    repeat(values.length()) { index -> add(values.optString(index)) }
                }
            }
        }
    }
    var assignmentAlertsReady by remember(assignmentSeenKey) {
        mutableStateOf(assignmentPreferences.contains(assignmentSeenKey))
    }
    val tasks = if (workSpace == WorkSpace.Personal) {
        personalTasks
    } else {
        companyTaskGroups.getOrElse(selectedCompanyIndex) { personalTasks }
    }
    val canCreateTask =
        workSpace == WorkSpace.Personal || companyCanCreateTasks.getOrElse(selectedCompanyIndex) { false }
    val selectedNativeTaskList = taskLists.firstOrNull { it.id == selectedTaskListId }

    LaunchedEffect(
        sessionMode,
        googleAccount?.apiToken,
        workSpace,
        selectedCompanyIndex,
        companyIds.toList(),
    ) {
        selectedTaskListId = null
        val account = googleAccount
        if (sessionMode == SessionMode.Guest || account?.apiToken.isNullOrBlank()) {
            taskFolders.clear()
            taskLists.clear()
            return@LaunchedEffect
        }
        val workspaceId =
            if (workSpace == WorkSpace.Company) companyIds.getOrNull(selectedCompanyIndex).orEmpty()
            else ""
        if (workSpace == WorkSpace.Company && workspaceId.isBlank()) return@LaunchedEffect
        runCatching { loadRemoteTaskOrganization(account!!.apiToken, workspaceId) }
            .onSuccess { organization ->
                taskFolders.clear()
                taskFolders.addAll(organization.folders)
                taskLists.clear()
                taskLists.addAll(organization.lists)
            }
    }

    fun updateTaskOrganization(organization: NativeTaskOrganization) {
        taskFolders.clear()
        taskFolders.addAll(organization.folders)
        taskLists.clear()
        taskLists.addAll(organization.lists)
        val account = googleAccount ?: return
        if (account.apiToken.isBlank()) return
        val workspaceId =
            if (workSpace == WorkSpace.Company) companyIds.getOrNull(selectedCompanyIndex).orEmpty()
            else ""
        navigationScope.launch {
            runCatching {
                syncRemoteTaskOrganization(account.apiToken, organization, workspaceId)
            }.onSuccess { synced ->
                taskFolders.clear()
                taskFolders.addAll(synced.folders)
                taskLists.clear()
                taskLists.addAll(synced.lists)
            }.onFailure { error ->
                Toast.makeText(
                    context,
                    error.localizedMessage ?: "A organização será sincronizada depois.",
                    Toast.LENGTH_LONG,
                ).show()
            }
        }
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
            companyMembers.clear()
            companyMembers.addAll(companyMemberLists.getOrElse(index) { emptyList() })
            companySectors.clear()
            companySectors.addAll(companySectorLists.getOrElse(index) { emptyList() })
            companyGroups.clear()
            companyGroups.addAll(companyGroupLists.getOrElse(index) { emptyList() })
            val token = googleAccount?.apiToken.orEmpty()
            val workspaceId = companyIds.getOrNull(index).orEmpty()
            if (token.isNotBlank() && workspaceId.isNotBlank()) {
                navigationScope.launch {
                    runCatching { loadRemoteTasks(token, workspaceId) }.onSuccess { remoteTasks ->
                        companyTaskGroups.getOrNull(index)?.let { group ->
                            val mergedTasks = mergeRemoteTaskRouting(remoteTasks, group)
                            lastSyncedCompanyTasks[workspaceId] =
                                tasksToJson(mergedTasks).toString()
                            group.clear()
                            group.addAll(mergedTasks)
                        }
                    }
                }
            }
        }
    }

    fun requestCreateCompany() {
        if (sessionMode == SessionMode.Guest || googleAccount?.apiToken.isNullOrBlank()) {
            Toast.makeText(context, "Entre na sua conta para criar um novo espaço.", Toast.LENGTH_LONG).show()
            return
        }
        if (companyOwnership.count { it } >= 3) {
            Toast.makeText(context, "Você pode criar no máximo 3 espaços empresariais.", Toast.LENGTH_LONG).show()
            return
        }
        createCompanyError = null
        showCreateCompany = true
    }

    fun applyCompanyWorkspaces(workspaces: List<ApiWorkspaceSummary>) {
        val companies = workspaces.filter { it.kind == "company" }
        companyIds.clear()
        companyIds.addAll(companies.map { it.id })
        companyOwnership.clear()
        companyOwnership.addAll(companies.map { it.isOwner })
        companyNames.clear()
        companyNames.addAll(companies.map { it.name })
        companyDescriptions.clear()
        companyDescriptions.addAll(companies.map { it.description.trim() })
        companyCanCreateTasks.clear()
        companyCanCreateTasks.addAll(companies.map { it.canCreateTasks })
        companyCanManageEmployees.clear()
        companyCanManageEmployees.addAll(companies.map { it.canManageEmployees })
        companyCanManageDepartments.clear()
        companyCanManageDepartments.addAll(companies.map { it.canManageDepartments })
        companyCanManageGroups.clear()
        companyCanManageGroups.addAll(companies.map { it.canManageGroups })
        val currentAccountEmail = googleAccount?.email.orEmpty()
        val currentAccountPhoto = googleAccount?.photoUrl.orEmpty()
        companyMemberLists.clear()
        companyMemberLists.addAll(
            companies.map { company ->
                company.employees.map { member ->
                    if (
                        member.photoUrl.isBlank() &&
                        currentAccountPhoto.isNotBlank() &&
                        member.email.equals(currentAccountEmail, ignoreCase = true)
                    ) {
                        member.copy(photoUrl = currentAccountPhoto)
                    } else {
                        member
                    }
                }
            },
        )
        companySectorLists.clear()
        companySectorLists.addAll(companies.map { it.sectors })
        companyGroupLists.clear()
        companyGroupLists.addAll(companies.map { it.groups })
        while (companyTaskGroups.size < companies.size) {
            val companyIndex = companyTaskGroups.size
            val cachedTasks = googleAccount?.id?.let { accountId ->
                loadCompanyTasks(context, accountId, companies[companyIndex].id)
            }.orEmpty()
            companyTaskGroups.add(
                mutableStateListOf<PopTask>().apply { addAll(cachedTasks) },
            )
        }
        while (companyTaskGroups.size > companies.size) companyTaskGroups.removeAt(companyTaskGroups.lastIndex)
        if (!preferredWorkspaceRestored) {
            val preferredWorkspaceId = assignmentPreferences.getString(
                lastWorkspaceKey,
                PERSONAL_WORKSPACE_STORAGE_VALUE,
            )
            val preferredCompanyIndex = companies.indexOfFirst { it.id == preferredWorkspaceId }
            if (preferredCompanyIndex >= 0) {
                selectedCompanyIndex = preferredCompanyIndex
                workSpace = WorkSpace.Company
            } else {
                workSpace = WorkSpace.Personal
            }
            preferredWorkspaceRestored = true
        }
        if (selectedCompanyIndex !in companyTaskGroups.indices) selectedCompanyIndex = 0
        companyMembers.clear()
        companyMembers.addAll(companyMemberLists.getOrElse(selectedCompanyIndex) { emptyList() })
        companySectors.clear()
        companySectors.addAll(companySectorLists.getOrElse(selectedCompanyIndex) { emptyList() })
        companyGroups.clear()
        companyGroups.addAll(companyGroupLists.getOrElse(selectedCompanyIndex) { emptyList() })
    }

    fun rememberAssignedTasks(remoteTasks: List<PopTask>, notify: Boolean) {
        val assignedTasks = remoteTasks.filter { it.assignedBy.isNotBlank() }
        val fresh = assignedTasks.filter { task ->
            val identity = task.serverId.ifBlank { task.id.toString() }
            identity !in seenAssignedTaskIds
        }
        if (notify) {
            fresh.forEach { task ->
                showAssignedTaskNotification(
                    context,
                    task.title,
                    task.assignedBy,
                    task.id,
                    task.assignmentType,
                    task.assignmentTargetLabel,
                )
            }
        }
        var changed = false
        assignedTasks.forEach { task ->
            val identity = task.serverId.ifBlank { task.id.toString() }
            if (identity !in seenAssignedTaskIds) {
                seenAssignedTaskIds.add(identity)
                changed = true
            }
        }
        if (changed || !assignmentPreferences.contains(assignmentSeenKey)) {
            assignmentPreferences.edit()
                .putString(assignmentSeenKey, JSONArray(seenAssignedTaskIds).toString())
                .apply()
        }
    }

    fun applyRemoteTasks(remoteTasks: List<PopTask>) {
        lastSyncedTasksJson = tasksToJson(remoteTasks).toString()
        personalTasks.clear()
        personalTasks.addAll(remoteTasks)
        googleAccount?.let { saveAccountTasks(context, it.id, remoteTasks) }
        googleAccount?.let { setAccountTasksDirty(context, it.id, false) }
        remoteTasksLoaded = true
    }

    suspend fun syncTasksWithPendingDeletions(
        account: GoogleAccount,
        localTasks: List<PopTask>,
        workspaceId: String = "",
    ) {
        val deletedServerIds = loadPendingTaskDeletions(context, account.id, workspaceId)
        syncRemoteTasks(
            apiToken = account.apiToken,
            tasks = localTasks,
            workspaceId = workspaceId,
            deletedServerIds = deletedServerIds,
        )
        if (deletedServerIds.isNotEmpty()) {
            clearPendingTaskDeletions(context, account.id, workspaceId)
        }
    }

    suspend fun refreshRemoteTasks(showFeedback: Boolean = false) {
        val account = googleAccount ?: return
        if (account.apiToken.isBlank()) return
        val showIndicator = showFeedback
        val refreshStartedAt = System.currentTimeMillis()
        if (showIndicator) isRefreshing = true
        runCatching {
            val localTasksJson = tasksToJson(personalTasks).toString()
            if (accountTasksAreDirty(context, account.id) || (remoteTasksLoaded && localTasksJson != lastSyncedTasksJson)) {
                syncTasksWithPendingDeletions(account, personalTasks.toList())
            }
            loadRemoteTasks(account.apiToken)
        }.onSuccess { remoteTasks ->
            applyRemoteTasks(remoteTasks)
            if (workSpace == WorkSpace.Company) {
                val workspaceId = companyIds.getOrNull(selectedCompanyIndex).orEmpty()
                if (workspaceId.isNotBlank()) {
                    runCatching { loadRemoteTasks(account.apiToken, workspaceId) }.onSuccess { companyTasks ->
                        companyTaskGroups.getOrNull(selectedCompanyIndex)?.let { group ->
                            val mergedTasks = mergeRemoteTaskRouting(companyTasks, group)
                            lastSyncedCompanyTasks[workspaceId] =
                                tasksToJson(mergedTasks).toString()
                            group.clear()
                            group.addAll(mergedTasks)
                        }
                    }
                }
            }
        }.onFailure { error ->
            if (showFeedback) {
                Toast.makeText(context, error.localizedMessage ?: "Não foi possível atualizar.", Toast.LENGTH_LONG).show()
            }
        }
        if (showIndicator) {
            val remainingIndicatorTime = 1_400L - (System.currentTimeMillis() - refreshStartedAt)
            if (remainingIndicatorTime > 0) delay(remainingIndicatorTime)
            isRefreshing = false
        }
    }

    LaunchedEffect(sessionMode, googleAccount?.apiToken) {
        val account = googleAccount ?: return@LaunchedEffect
        val token = account.apiToken
        if (sessionMode != SessionMode.Guest && token.isNotBlank()) {
            while (true) {
                runCatching { loadMobileWorkspaces(token) }.onSuccess { workspaces ->
                    applyCompanyWorkspaces(workspaces)
                    companyIds.forEachIndexed { index, workspaceId ->
                        val companyTasks = companyTaskGroups.getOrNull(index)
                        val localJson = companyTasks?.let(::tasksToJson)?.toString()
                        val lastSyncedJson = lastSyncedCompanyTasks[workspaceId]
                        if (
                            companyTasks != null &&
                            localJson != null &&
                            (
                                (lastSyncedJson != null && localJson != lastSyncedJson) ||
                                    loadPendingTaskDeletions(context, account.id, workspaceId).isNotEmpty()
                            )
                        ) {
                            runCatching {
                                syncTasksWithPendingDeletions(account, companyTasks.toList(), workspaceId)
                            }
                                .onSuccess { lastSyncedCompanyTasks[workspaceId] = localJson }
                        }
                        runCatching { loadRemoteTasks(token, workspaceId) }.onSuccess { remoteTasks ->
                            val currentGroup = companyTaskGroups.getOrNull(index)
                            val mergedTasks =
                                mergeRemoteTaskRouting(remoteTasks, currentGroup.orEmpty())
                            rememberAssignedTasks(mergedTasks, assignmentAlertsReady)
                            val remoteJson = tasksToJson(mergedTasks).toString()
                            val currentLocalJson = companyTaskGroups
                                .getOrNull(index)
                                ?.let(::tasksToJson)
                                ?.toString()
                            if (
                                lastSyncedCompanyTasks[workspaceId].isNullOrBlank() ||
                                currentLocalJson == lastSyncedCompanyTasks[workspaceId]
                            ) {
                                lastSyncedCompanyTasks[workspaceId] = remoteJson
                                companyTaskGroups.getOrNull(index)?.let { group ->
                                    group.clear()
                                    group.addAll(mergedTasks)
                                }
                            }
                        }
                    }
                    assignmentAlertsReady = true
                }
                runCatching { loadMobileInvitations(token) }.onSuccess { invitations ->
                    pendingInvitations.clear()
                    pendingInvitations.addAll(invitations)
                }
                delay(15_000)
            }
        }
    }

    LaunchedEffect(sessionMode, googleAccount?.apiToken) {
        if (sessionMode != SessionMode.Guest && !googleAccount?.apiToken.isNullOrBlank()) {
            refreshRemoteTasks(showFeedback = true)
            while (true) {
                delay(15_000)
                refreshRemoteTasks()
            }
        }
    }
    LaunchedEffect(personalTasks.toList(), sessionMode, googleAccount?.apiToken, remoteTasksLoaded) {
        if (sessionMode == SessionMode.Guest) {
            saveGuestTasks(context, personalTasks)
        } else if (googleAccount != null) {
            saveAccountTasks(context, googleAccount.id, personalTasks)
            val localTasksJson = tasksToJson(personalTasks).toString()
            if (remoteTasksLoaded && googleAccount.apiToken.isNotBlank() && localTasksJson != lastSyncedTasksJson) {
                setAccountTasksDirty(context, googleAccount.id, true)
                delay(350)
                runCatching {
                    syncTasksWithPendingDeletions(googleAccount, personalTasks.toList())
                }
                    .onSuccess {
                        lastSyncedTasksJson = localTasksJson
                        setAccountTasksDirty(context, googleAccount.id, false)
                    }
                    .onFailure { error ->
                        Toast.makeText(
                            context,
                            error.localizedMessage ?: "A tarefa ficou salva no aparelho e será sincronizada depois.",
                            Toast.LENGTH_LONG,
                        ).show()
                    }
            }
        }
    }
    LaunchedEffect(personalTasks.toList(), companyTaskGroups.map { it.toList() }) {
        saveNotificationTaskSnapshot(
            context,
            (personalTasks + companyTaskGroups.flatten()).map { task ->
                NotificationTaskSnapshot(
                    title = task.title,
                    dueDate = task.dueDate,
                    dueTime = task.dueTime,
                    completed = task.completed,
                )
            },
        )
    }

    PullToRefreshBox(
        isRefreshing = isRefreshing,
        onRefresh = {
            if (sessionMode == SessionMode.Guest) {
                Toast.makeText(context, "Entre na sua conta para sincronizar", Toast.LENGTH_SHORT).show()
            } else {
                navigationScope.launch { refreshRemoteTasks(showFeedback = true) }
            }
        },
        modifier = Modifier.fillMaxSize(),
    ) {
    Scaffold(
            containerColor = PopBackground,
            bottomBar = {
                PopBottomBar(
                    selected = destination,
                    onSelect = { selectedDestination ->
                        if (selectedDestination == PopDestination.More) {
                            showMoreSheet = true
                        } else {
                            showMoreSheet = false
                            destination = selectedDestination
                        }
                    },
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
                        canCreateTask = canCreateTask,
                        isGuest = sessionMode == SessionMode.Guest,
                        displayName = when {
                            sessionMode == SessionMode.Guest -> "Visitante"
                            else -> googleAccount?.name
                                ?.trim()
                                ?.substringBefore(" ")
                                ?.takeIf { it.isNotBlank() }
                                ?.replaceFirstChar { it.titlecase(Locale("pt", "BR")) }
                                ?: "Você"
                        },
                        workSpace = workSpace,
                        onWorkSpaceChange = ::selectWorkSpace,
                        companyNames = companyNames,
                        companyDescriptions = companyDescriptions,
                        selectedCompanyIndex = selectedCompanyIndex,
                        onCompanySelect = ::selectCompany,
                        onCreateCompany = ::requestCreateCompany,
                        onOpenMenu = { showTaskOrganizer = true },
                        onViewTasks = { destination = PopDestination.Tasks },
                        onOpenTask = { task ->
                            taskToOpenId = task.id
                            destination = PopDestination.Tasks
                        },
                    )
                    PopDestination.Tasks -> TasksScreen(
                        tasks = tasks,
                        canCreateTask = canCreateTask,
                        currentUserId = googleAccount?.id.orEmpty(),
                        currentUserName = googleAccount?.name.orEmpty(),
                        workSpace = workSpace,
                        onWorkSpaceChange = ::selectWorkSpace,
                        companyNames = companyNames,
                        companyDescriptions = companyDescriptions,
                        companyMembers = companyMembers,
                        companySectors = companySectors,
                        companyGroups = companyGroups,
                        selectedCompanyIndex = selectedCompanyIndex,
                        onCompanySelect = ::selectCompany,
                        onCreateCompany = ::requestCreateCompany,
                        onOpenMenu = { showTaskOrganizer = true },
                        selectedTaskList = selectedNativeTaskList,
                        initialTaskId = taskToOpenId,
                        onInitialTaskOpened = { taskToOpenId = null },
                        onTaskDeleted = { deletedTask ->
                            val account = googleAccount
                            if (account != null && deletedTask.serverId.isNotBlank()) {
                                val workspaceId =
                                    if (workSpace == WorkSpace.Company) {
                                        companyIds.getOrNull(selectedCompanyIndex).orEmpty()
                                    } else {
                                        ""
                                    }
                                queueTaskDeletion(
                                    context = context,
                                    accountId = account.id,
                                    workspaceId = workspaceId,
                                    serverId = deletedTask.serverId,
                                )
                            }
                        },
                    )
                    PopDestination.Calendar -> Box(Modifier.fillMaxSize()) {
                        CalendarScreen(
                            tasks = tasks,
                            canCreateTask = canCreateTask,
                            workSpace = workSpace,
                            onWorkSpaceChange = ::selectWorkSpace,
                            companyNames = companyNames,
                            companyDescriptions = companyDescriptions,
                            selectedCompanyIndex = selectedCompanyIndex,
                            onCompanySelect = ::selectCompany,
                            onCreateCompany = ::requestCreateCompany,
                            onOpenMenu = { showTaskOrganizer = true },
                            onOpenTask = { task ->
                                taskToOpenId = null
                                destination = PopDestination.Tasks
                                navigationScope.launch {
                                    delay(240)
                                    taskToOpenId = task.id
                                }
                            },
                            onCreateTaskForDate = { date -> taskToCreateDate = date },
                        )
                        if (taskToCreateDate != null) {
                            TasksScreen(
                                tasks = tasks,
                                canCreateTask = canCreateTask,
                                currentUserId = googleAccount?.id.orEmpty(),
                                currentUserName = googleAccount?.name.orEmpty(),
                                workSpace = workSpace,
                                onWorkSpaceChange = ::selectWorkSpace,
                                companyNames = companyNames,
                                companyDescriptions = companyDescriptions,
                                companyMembers = companyMembers,
                                companySectors = companySectors,
                                companyGroups = companyGroups,
                                selectedCompanyIndex = selectedCompanyIndex,
                                onCompanySelect = ::selectCompany,
                                onCreateCompany = ::requestCreateCompany,
                                onOpenMenu = { showTaskOrganizer = true },
                                initialTaskId = null,
                                onInitialTaskOpened = {},
                                onTaskDeleted = {},
                                initialCreateDate = taskToCreateDate,
                                createOnly = true,
                                onCreateFormClosed = { taskToCreateDate = null },
                            )
                        }
                    }
                    PopDestination.More -> MoreScreen(
                        sessionMode = sessionMode,
                        googleAccount = googleAccount,
                        lightTheme = lightTheme,
                        onLightThemeChange = onLightThemeChange,
                        workSpace = workSpace,
                        onWorkSpaceChange = ::selectWorkSpace,
                        companyNames = companyNames,
                        companyDescriptions = companyDescriptions,
                        companyMembers = companyMembers,
                        companySectors = companySectors,
                        companyGroups = companyGroups,
                        tasks = tasks,
                        workspaceId = companyIds.getOrNull(selectedCompanyIndex).orEmpty(),
                        canManageEmployees = companyCanManageEmployees.getOrElse(selectedCompanyIndex) { false },
                        canManageDepartments = companyCanManageDepartments.getOrElse(selectedCompanyIndex) { false },
                        canManageGroups = companyCanManageGroups.getOrElse(selectedCompanyIndex) { false },
                        onWorkspacesReloaded = ::applyCompanyWorkspaces,
                        selectedCompanyIndex = selectedCompanyIndex,
                        onCompanySelect = ::selectCompany,
                        onCreateCompany = ::requestCreateCompany,
                        onOpenTask = { task ->
                            taskToOpenId = task.id
                            destination = PopDestination.Tasks
                        },
                        onRequireLogin = onRequireLogin,
                        onSignOut = onSignOut,
                        onDismiss = { destination = PopDestination.Dashboard },
                    )
                }
            }
    }

    if (showMoreSheet) {
        ModalBottomSheet(
            onDismissRequest = { showMoreSheet = false },
            sheetState = moreSheetState,
            containerColor = PopSurface,
            shape = RoundedCornerShape(topStart = 30.dp, topEnd = 30.dp),
            dragHandle = null,
            sheetMaxWidth = Dp.Unspecified,
            modifier = Modifier.fillMaxWidth(),
        ) {
            KeepModalNavigationBarHidden()
            MoreScreen(
                sessionMode = sessionMode,
                googleAccount = googleAccount,
                lightTheme = lightTheme,
                onLightThemeChange = onLightThemeChange,
                workSpace = workSpace,
                onWorkSpaceChange = ::selectWorkSpace,
                companyNames = companyNames,
                companyDescriptions = companyDescriptions,
                companyMembers = companyMembers,
                companySectors = companySectors,
                companyGroups = companyGroups,
                tasks = tasks,
                workspaceId = companyIds.getOrNull(selectedCompanyIndex).orEmpty(),
                canManageEmployees = companyCanManageEmployees.getOrElse(selectedCompanyIndex) { false },
                canManageDepartments = companyCanManageDepartments.getOrElse(selectedCompanyIndex) { false },
                canManageGroups = companyCanManageGroups.getOrElse(selectedCompanyIndex) { false },
                onWorkspacesReloaded = ::applyCompanyWorkspaces,
                selectedCompanyIndex = selectedCompanyIndex,
                onCompanySelect = ::selectCompany,
                onCreateCompany = ::requestCreateCompany,
                onOpenTask = { task ->
                    showMoreSheet = false
                    taskToOpenId = task.id
                    destination = PopDestination.Tasks
                },
                onRequireLogin = onRequireLogin,
                onSignOut = onSignOut,
                onDismiss = { showMoreSheet = false },
            )
        }
    }

    if (showTaskOrganizer) {
        TaskOrganizerDrawer(
            folders = taskFolders,
            lists = taskLists,
            tasks = tasks,
            isSignedIn = sessionMode != SessionMode.Guest,
            onDismiss = { showTaskOrganizer = false },
            onOrganizationChange = ::updateTaskOrganization,
            onOpenList = { list ->
                selectedTaskListId = list.id
                destination = PopDestination.Tasks
                showTaskOrganizer = false
            },
        )
    }

    LaunchedEffect(
        externalTaskId,
        personalTasks.toList(),
        companyTaskGroups.map { it.toList() },
    ) {
        val requestedTaskId = externalTaskId ?: return@LaunchedEffect
        val personalTask = personalTasks.firstOrNull { it.id == requestedTaskId }
        if (personalTask != null) {
            workSpace = WorkSpace.Personal
            destination = PopDestination.Tasks
            taskToOpenId = personalTask.id
            onExternalTaskOpened()
            return@LaunchedEffect
        }
        val companyIndex = companyTaskGroups.indexOfFirst { group ->
            group.any { it.id == requestedTaskId }
        }
        if (companyIndex >= 0) {
            selectedCompanyIndex = companyIndex
            workSpace = WorkSpace.Company
            destination = PopDestination.Tasks
            taskToOpenId = requestedTaskId
            onExternalTaskOpened()
        }
    }
    LaunchedEffect(
        preferredWorkspaceRestored,
        workSpace,
        selectedCompanyIndex,
        companyIds.toList(),
        googleAccount?.id,
    ) {
        if (!preferredWorkspaceRestored || googleAccount == null) return@LaunchedEffect
        val workspaceValue =
            if (workSpace == WorkSpace.Company) {
                companyIds.getOrNull(selectedCompanyIndex).orEmpty()
            } else {
                PERSONAL_WORKSPACE_STORAGE_VALUE
            }
        if (workspaceValue.isNotBlank()) {
            assignmentPreferences.edit()
                .putString(lastWorkspaceKey, workspaceValue)
                .apply()
        }
    }
    LaunchedEffect(companyTaskGroups.map { it.toList() }, companyIds.toList(), googleAccount?.apiToken) {
        val token = googleAccount?.apiToken.orEmpty()
        if (token.isNotBlank()) {
            companyTaskGroups.forEachIndexed { index, group ->
                val workspaceId = companyIds.getOrNull(index).orEmpty()
                val localJson = tasksToJson(group).toString()
                val account = googleAccount
                if (account != null && workspaceId.isNotBlank()) {
                    saveCompanyTasks(
                        context = context,
                        accountId = account.id,
                        workspaceId = workspaceId,
                        tasks = group,
                    )
                }
                val hasPendingDeletions =
                    account != null &&
                        loadPendingTaskDeletions(context, account.id, workspaceId).isNotEmpty()
                if (
                    workspaceId.isNotBlank() &&
                    account != null &&
                    (
                        (
                            lastSyncedCompanyTasks[workspaceId] != null &&
                                localJson != lastSyncedCompanyTasks[workspaceId]
                        ) ||
                            hasPendingDeletions
                    )
                ) {
                    delay(350)
                    runCatching {
                        syncTasksWithPendingDeletions(account, group.toList(), workspaceId)
                    }
                        .onSuccess { lastSyncedCompanyTasks[workspaceId] = localJson }
                }
            }
        }
    }
    }

    if (showCreateCompany) {
        AlertDialog(
            onDismissRequest = {
                if (!createCompanyPending) showCreateCompany = false
            },
            title = { Text("Novo espaço", fontWeight = FontWeight.ExtraBold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(
                        "Crie um espaço para organizar as tarefas, os funcionários, os setores e os grupos da sua empresa, separado do Meu espaço.",
                        color = PopMuted,
                        lineHeight = 20.sp,
                    )
                    OutlinedTextField(
                        value = createCompanyName,
                        onValueChange = { createCompanyName = it.take(80) },
                        enabled = !createCompanyPending,
                        label = { Text("Nome do espaço") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    OutlinedTextField(
                        value = createCompanyDescription,
                        onValueChange = { createCompanyDescription = it.take(160) },
                        enabled = !createCompanyPending,
                        label = { Text("Descrição do espaço (opcional)") },
                        minLines = 2,
                        maxLines = 4,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Text(
                        "${companyOwnership.count { it }}/3 espaços empresariais criados",
                        color = PopMuted,
                        fontSize = 12.sp,
                    )
                    createCompanyError?.let {
                        Text(it, color = Color(0xFFD32F2F), fontSize = 12.sp)
                    }
                }
            },
            confirmButton = {
                TextButton(
                    enabled = !createCompanyPending && createCompanyName.trim().length >= 2,
                    onClick = {
                        val account = googleAccount ?: return@TextButton
                        createCompanyPending = true
                        createCompanyError = null
                        navigationScope.launch {
                            runCatching {
                                val response = mutateMobileWorkspace(
                                    apiToken = account.apiToken,
                                    workspaceId = companyIds.getOrNull(selectedCompanyIndex).orEmpty(),
                                    payload = JSONObject()
                                        .put("action", "createCompany")
                                        .put("name", createCompanyName.trim())
                                        .put("description", createCompanyDescription.trim()),
                                )
                                val createdCompanyId = response.optString("createdCompanyId")
                                val workspaces = loadMobileWorkspaces(account.apiToken)
                                applyCompanyWorkspaces(workspaces)
                                companyIds.indexOf(createdCompanyId)
                                    .takeIf { it >= 0 }
                                    ?.let { selectedCompanyIndex = it }
                                workSpace = WorkSpace.Company
                            }.onSuccess {
                                createCompanyName = ""
                                createCompanyDescription = ""
                                showCreateCompany = false
                                Toast.makeText(context, "Novo espaço criado com sucesso.", Toast.LENGTH_LONG).show()
                            }.onFailure { error ->
                                createCompanyError = error.localizedMessage ?: "Não foi possível criar o espaço."
                            }
                            createCompanyPending = false
                        }
                    },
                ) {
                    if (createCompanyPending) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(18.dp),
                            strokeWidth = 2.dp,
                            color = PopBlue,
                        )
                    } else {
                        Text("Criar", color = PopBlue, fontWeight = FontWeight.Bold)
                    }
                }
            },
            dismissButton = {
                TextButton(
                    enabled = !createCompanyPending,
                    onClick = { showCreateCompany = false },
                ) {
                    Text("Cancelar", color = PopMuted)
                }
            },
            shape = RoundedCornerShape(26.dp),
            containerColor = PopSurface,
        )
    }

    pendingInvitations.firstOrNull()?.let { invitation ->
        AlertDialog(
            onDismissRequest = {},
            title = { Text("Convite para empresa", fontWeight = FontWeight.ExtraBold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Você foi convidado para participar de ${invitation.companyName}.")
                    Text(
                        listOf(invitation.role, invitation.permissionGroupName)
                            .filter(String::isNotBlank)
                            .joinToString(" • "),
                        color = PopMuted,
                        fontSize = 13.sp,
                    )
                }
            },
            confirmButton = {
                TextButton(
                    enabled = !invitationActionPending,
                    onClick = {
                        val token = googleAccount?.apiToken.orEmpty()
                        invitationActionPending = true
                        navigationScope.launch {
                            runCatching { respondToMobileInvitation(token, invitation.id, true) }
                                .onSuccess {
                                    pendingInvitations.removeAll { it.id == invitation.id }
                                    runCatching { loadMobileWorkspaces(token) }.onSuccess(::applyCompanyWorkspaces)
                                    Toast.makeText(context, "Empresa adicionada aos seus espaços.", Toast.LENGTH_LONG).show()
                                }
                                .onFailure { error ->
                                    Toast.makeText(context, error.localizedMessage ?: "Falha ao aceitar convite.", Toast.LENGTH_LONG).show()
                                }
                            invitationActionPending = false
                        }
                    },
                ) { Text(if (invitationActionPending) "Aguarde..." else "Aceitar", color = PopBlue, fontWeight = FontWeight.Bold) }
            },
            dismissButton = {
                TextButton(
                    enabled = !invitationActionPending,
                    onClick = {
                        val token = googleAccount?.apiToken.orEmpty()
                        invitationActionPending = true
                        navigationScope.launch {
                            runCatching { respondToMobileInvitation(token, invitation.id, false) }
                                .onSuccess { pendingInvitations.removeAll { it.id == invitation.id } }
                                .onFailure { error ->
                                    Toast.makeText(context, error.localizedMessage ?: "Falha ao recusar convite.", Toast.LENGTH_LONG).show()
                                }
                            invitationActionPending = false
                        }
                    },
                ) { Text("Recusar", color = PopMuted) }
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
    companyDescriptions: List<String>,
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
                    fontSize = 21.sp,
                    fontWeight = FontWeight.ExtraBold,
                    letterSpacing = (-0.35).sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Spacer(Modifier.width(4.dp))
                Icon(Icons.Rounded.KeyboardArrowDown, "Trocar espaço", tint = PopBlue, modifier = Modifier.size(22.dp))
            }
        }
    }

        DropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
            shape = RoundedCornerShape(20.dp),
            containerColor = PopSurface,
        ) {
            if (selected != WorkSpace.Personal) {
                DropdownMenuItem(
                    text = {
                        Column {
                            Text("Meu espaço", fontWeight = FontWeight.Bold)
                            Text("Tarefas pessoais", color = PopMuted, fontSize = 11.sp)
                        }
                    },
                    leadingIcon = { Icon(Icons.Rounded.PersonOutline, null, tint = PopBlue) },
                    onClick = {
                        expanded = false
                        onSelect(WorkSpace.Personal)
                    },
                )
            }
            companyNames.forEachIndexed { index, companyName ->
                if (selected == WorkSpace.Company && selectedCompanyIndex == index) {
                    return@forEachIndexed
                }
                DropdownMenuItem(
                    text = {
                        Column {
                            Text(companyName, fontWeight = FontWeight.Bold)
                            companyDescriptions.getOrNull(index)
                                ?.takeIf { it.isNotBlank() }
                                ?.let { description ->
                                    Text(
                                        description,
                                        color = PopMuted,
                                        fontSize = 11.sp,
                                        maxLines = 2,
                                        overflow = TextOverflow.Ellipsis,
                                    )
                                }
                        }
                    },
                    leadingIcon = { Icon(Icons.Rounded.Business, null, tint = PopBlue) },
                    onClick = {
                        expanded = false
                        onCompanySelect(index)
                    },
                )
            }
            DropdownMenuItem(
                text = {
                    Column {
                        Text("Novo espaço", color = PopBlue, fontWeight = FontWeight.ExtraBold)
                        Text("Crie até 3 espaços empresariais", color = PopMuted, fontSize = 11.sp)
                    }
                },
                leadingIcon = { Icon(Icons.Rounded.AddBusiness, null, tint = PopBlue) },
                onClick = {
                    expanded = false
                    onCreateCompany()
                },
            )
        }
    }

@Composable
private fun GoogleProfileAvatar(
    photoUrl: String?,
    modifier: Modifier = Modifier,
    fallbackIcon: ImageVector = Icons.Rounded.PersonOutline,
) {
    val cachedImage = remember(photoUrl) {
        photoUrl?.let { url -> synchronized(googleProfileImageCache) { googleProfileImageCache[url] } }
    }
    val profileImage by produceState<ImageBitmap?>(initialValue = cachedImage, key1 = photoUrl) {
        val url = photoUrl?.takeIf { it.startsWith("https://") } ?: return@produceState
        if (value != null) return@produceState
        value = withContext(Dispatchers.IO) {
            runCatching {
                val connection = URL(url).openConnection().apply {
                    connectTimeout = 8_000
                    readTimeout = 8_000
                }
                connection.getInputStream().use { input -> BitmapFactory.decodeStream(input)?.asImageBitmap() }
            }.getOrNull()?.also { image ->
                synchronized(googleProfileImageCache) { googleProfileImageCache[url] = image }
            }
        }
    }

    Box(
        modifier = modifier
            .clip(CircleShape)
            .background(PopSurfaceAlt)
            .border(1.dp, PopBorder, CircleShape),
        contentAlignment = Alignment.Center,
    ) {
        Icon(fallbackIcon, "Conta", tint = PopText, modifier = Modifier.size(25.dp))
        profileImage?.let { image ->
            Image(
                bitmap = image,
                contentDescription = "Foto da conta Google",
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize(),
            )
        }
    }
}

private fun organizationId(prefix: String): String =
    "$prefix-${System.currentTimeMillis()}-${SecureRandom().nextInt(1_000_000)}"

@Composable
private fun TaskOrganizerDrawer(
    folders: List<NativeTaskFolder>,
    lists: List<NativeTaskList>,
    tasks: List<PopTask>,
    isSignedIn: Boolean,
    onDismiss: () -> Unit,
    onOrganizationChange: (NativeTaskOrganization) -> Unit,
    onOpenList: (NativeTaskList) -> Unit,
) {
    var expandedFolderIds by remember(folders) {
        mutableStateOf(folders.map(NativeTaskFolder::id).toSet())
    }
    var editingListId by remember { mutableStateOf<String?>(null) }
    var selectedTaskIds by remember { mutableStateOf(setOf<String>()) }
    var createKind by remember { mutableStateOf<String?>(null) }
    var createParentId by remember { mutableStateOf("") }
    var newName by remember { mutableStateOf("") }
    val editingList = lists.firstOrNull { it.id == editingListId }
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false),
    ) {
        val dialogView = LocalView.current
        SideEffect {
            (dialogView.parent as? DialogWindowProvider)?.window?.apply {
                setBackgroundDrawable(ColorDrawable(android.graphics.Color.TRANSPARENT))
                setLayout(
                    android.view.ViewGroup.LayoutParams.MATCH_PARENT,
                    android.view.ViewGroup.LayoutParams.MATCH_PARENT,
                )
                attributes = attributes.apply { gravity = android.view.Gravity.START }
            }
        }
        Row(Modifier.fillMaxSize()) {
            Surface(
                color = PopSurface,
                shape = RoundedCornerShape(topEnd = 26.dp, bottomEnd = 26.dp),
                shadowElevation = 12.dp,
                modifier = Modifier
                    .fillMaxHeight()
                    .fillMaxWidth(.9f)
                    .widthIn(max = 410.dp),
            ) {
                Column(Modifier.fillMaxSize()) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(start = 20.dp, end = 10.dp, top = 22.dp, bottom = 16.dp),
                    ) {
                        Column(Modifier.weight(1f)) {
                            Text(
                                if (editingList == null) "Organização" else editingList.name,
                                fontWeight = FontWeight.Bold,
                                fontSize = 22.sp,
                            )
                            Text(
                                if (editingList == null) "Grupos, subgrupos e listas" else "Selecione as tarefas desta lista",
                                color = PopMuted,
                                fontSize = 12.sp,
                            )
                        }
                        IconButton(onClick = { if (editingList != null) editingListId = null else onDismiss() }) {
                            Icon(
                                if (editingList != null) Icons.Rounded.ArrowBack else Icons.Rounded.Close,
                                contentDescription = if (editingList != null) "Voltar" else "Fechar",
                            )
                        }
                    }
                    HorizontalDivider(color = PopBorder)

                    if (editingList != null) {
                        LazyColumn(
                            contentPadding = PaddingValues(14.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp),
                            modifier = Modifier.weight(1f),
                        ) {
                            items(tasks, key = { it.id }) { task ->
                                val serverId = task.serverId
                                val checked = serverId.isNotBlank() && serverId in selectedTaskIds
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(15.dp))
                                        .background(if (checked) PopBlueSoft else PopSurfaceAlt)
                                        .clickable(enabled = serverId.isNotBlank()) {
                                            selectedTaskIds =
                                                if (checked) selectedTaskIds - serverId
                                                else selectedTaskIds + serverId
                                        }
                                        .padding(horizontal = 10.dp, vertical = 7.dp),
                                ) {
                                    Checkbox(
                                        checked = checked,
                                        enabled = serverId.isNotBlank(),
                                        onCheckedChange = {
                                            selectedTaskIds =
                                                if (checked) selectedTaskIds - serverId
                                                else selectedTaskIds + serverId
                                        },
                                    )
                                    Column(Modifier.weight(1f)) {
                                        Text(task.title, fontWeight = FontWeight.SemiBold, maxLines = 1)
                                        Text(
                                            when {
                                                isTaskOverdue(task) -> "Atrasada"
                                                task.dueDate == LocalDate.now().toString() -> "Hoje"
                                                else -> "Próxima"
                                            },
                                            color = PopMuted,
                                            fontSize = 11.sp,
                                        )
                                    }
                                }
                            }
                        }
                        Surface(
                            color = PopBlue,
                            shape = RoundedCornerShape(16.dp),
                            modifier = Modifier
                                .padding(16.dp)
                                .fillMaxWidth()
                                .clickable {
                                    onOrganizationChange(
                                        NativeTaskOrganization(
                                            folders,
                                            lists.map { list ->
                                                if (list.id == editingList.id) {
                                                    list.copy(taskIds = selectedTaskIds.toList())
                                                } else list
                                            },
                                        ),
                                    )
                                    editingListId = null
                                },
                        ) {
                            Text(
                                "Salvar tarefas",
                                color = Color.White,
                                fontWeight = FontWeight.Bold,
                                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                                modifier = Modifier.padding(14.dp),
                            )
                        }
                    } else {
                        LazyColumn(
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 14.dp),
                            verticalArrangement = Arrangement.spacedBy(4.dp),
                            modifier = Modifier.weight(1f),
                        ) {
                            val rootFolders = folders.filter { it.parentId.isBlank() }.sortedBy { it.position }
                            if (rootFolders.isEmpty()) {
                                item {
                                    Column(
                                        horizontalAlignment = Alignment.CenterHorizontally,
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(horizontal = 18.dp, vertical = 36.dp),
                                    ) {
                                        Icon(Icons.Rounded.AccountTree, null, tint = PopBlue, modifier = Modifier.size(34.dp))
                                        Text("Crie seu primeiro grupo", fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 10.dp))
                                        Text("Depois adicione subgrupos, listas e escolha as tarefas.", color = PopMuted, fontSize = 12.sp, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                                    }
                                }
                            }
                            rootFolders.forEach { folder ->
                                item(key = folder.id) {
                                    val expanded = folder.id in expandedFolderIds
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clip(RoundedCornerShape(14.dp))
                                            .clickable {
                                                expandedFolderIds =
                                                    if (expanded) expandedFolderIds - folder.id
                                                    else expandedFolderIds + folder.id
                                            }
                                            .padding(start = 4.dp, end = 2.dp, top = 5.dp, bottom = 5.dp),
                                    ) {
                                        Icon(
                                            if (expanded) Icons.Rounded.KeyboardArrowDown else Icons.Rounded.ChevronRight,
                                            null,
                                            tint = PopMuted,
                                        )
                                        Icon(Icons.Rounded.AccountTree, null, tint = PopBlue, modifier = Modifier.size(20.dp))
                                        Text(folder.name, fontWeight = FontWeight.Bold, modifier = Modifier.padding(start = 9.dp).weight(1f), maxLines = 1)
                                        IconButton(onClick = {
                                            createKind = "subgroup"
                                            createParentId = folder.id
                                            newName = ""
                                        }) { Icon(Icons.Rounded.AddBusiness, "Criar subgrupo", tint = PopMuted, modifier = Modifier.size(20.dp)) }
                                        IconButton(onClick = {
                                            createKind = "list"
                                            createParentId = folder.id
                                            newName = ""
                                        }) { Icon(Icons.Rounded.Checklist, "Criar lista", tint = PopBlue, modifier = Modifier.size(20.dp)) }
                                    }
                                }
                                if (folder.id in expandedFolderIds) {
                                    val subgroups = folders.filter { it.parentId == folder.id }.sortedBy { it.position }
                                    subgroups.forEach { subgroup ->
                                        item(key = subgroup.id) {
                                            Row(
                                                verticalAlignment = Alignment.CenterVertically,
                                                modifier = Modifier.fillMaxWidth().padding(start = 30.dp, end = 2.dp, top = 3.dp, bottom = 3.dp),
                                            ) {
                                                Icon(Icons.Rounded.AccountTree, null, tint = PopBlue.copy(alpha = .75f), modifier = Modifier.size(18.dp))
                                                Text(subgroup.name, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(start = 9.dp).weight(1f), maxLines = 1)
                                                IconButton(onClick = {
                                                    createKind = "list"
                                                    createParentId = subgroup.id
                                                    newName = ""
                                                }) { Icon(Icons.Rounded.Add, "Criar lista", tint = PopBlue, modifier = Modifier.size(20.dp)) }
                                            }
                                        }
                                        lists.filter { it.folderId == subgroup.id }.sortedBy { it.position }.forEach { list ->
                                            item(key = list.id) {
                                                TaskOrganizerListRow(
                                                    list = list,
                                                    tasks = tasks,
                                                    indent = 50.dp,
                                                    onOpen = { onOpenList(list) },
                                                    onSelectTasks = {
                                                        selectedTaskIds = list.taskIds.toSet()
                                                        editingListId = list.id
                                                    },
                                                )
                                            }
                                        }
                                    }
                                    lists.filter { it.folderId == folder.id }.sortedBy { it.position }.forEach { list ->
                                        item(key = list.id) {
                                            TaskOrganizerListRow(
                                                list = list,
                                                tasks = tasks,
                                                indent = 30.dp,
                                                onOpen = { onOpenList(list) },
                                                onSelectTasks = {
                                                    selectedTaskIds = list.taskIds.toSet()
                                                    editingListId = list.id
                                                },
                                            )
                                        }
                                    }
                                }
                            }
                        }
                        HorizontalDivider(color = PopBorder)
                        TextButton(
                            enabled = isSignedIn,
                            onClick = {
                                createKind = "group"
                                createParentId = ""
                                newName = ""
                            },
                            modifier = Modifier.fillMaxWidth().padding(10.dp),
                        ) {
                            Icon(Icons.Rounded.Add, null)
                            Text(if (isSignedIn) "Novo grupo" else "Entre para criar grupos", fontWeight = FontWeight.Bold, modifier = Modifier.padding(start = 8.dp))
                        }
                    }
                }
            }
            Spacer(Modifier.weight(1f).fillMaxHeight().clickable(onClick = onDismiss))
        }
    }

    if (createKind != null) {
        AlertDialog(
            onDismissRequest = { createKind = null },
            title = {
                Text(
                    when (createKind) {
                        "list" -> "Nova lista"
                        "subgroup" -> "Novo subgrupo"
                        else -> "Novo grupo"
                    },
                )
            },
            text = {
                OutlinedTextField(
                    value = newName,
                    onValueChange = { newName = it },
                    label = { Text("Nome") },
                    singleLine = true,
                )
            },
            confirmButton = {
                TextButton(
                    enabled = newName.trim().length >= 2,
                    onClick = {
                        val name = newName.trim()
                        val next = when (createKind) {
                            "list" -> NativeTaskOrganization(
                                folders,
                                lists + NativeTaskList(
                                    id = organizationId("list"),
                                    name = name,
                                    folderId = createParentId,
                                    position = lists.size,
                                ),
                            )
                            else -> NativeTaskOrganization(
                                folders + NativeTaskFolder(
                                    id = organizationId("folder"),
                                    name = name,
                                    parentId = if (createKind == "subgroup") createParentId else "",
                                    position = folders.size,
                                ),
                                lists,
                            )
                        }
                        onOrganizationChange(next)
                        createKind = null
                    },
                ) { Text("Criar") }
            },
            dismissButton = { TextButton(onClick = { createKind = null }) { Text("Cancelar") } },
        )
    }
}

@Composable
private fun TaskOrganizerListRow(
    list: NativeTaskList,
    tasks: List<PopTask>,
    indent: Dp,
    onOpen: () -> Unit,
    onSelectTasks: () -> Unit,
) {
    val activeCount = tasks.count {
        !it.completed && it.serverId.isNotBlank() && it.serverId in list.taskIds
    }
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .padding(start = indent, end = 2.dp, top = 2.dp, bottom = 2.dp)
            .clip(RoundedCornerShape(13.dp))
            .clickable(onClick = onOpen)
            .padding(start = 8.dp, top = 5.dp, bottom = 5.dp),
    ) {
        Icon(Icons.Rounded.Checklist, null, tint = PopBlue, modifier = Modifier.size(18.dp))
        Text(list.name, modifier = Modifier.padding(start = 9.dp).weight(1f), maxLines = 1, overflow = TextOverflow.Ellipsis)
        Text(activeCount.toString(), color = PopMuted, fontSize = 12.sp)
        IconButton(onClick = onSelectTasks) {
            Icon(Icons.Rounded.Settings, "Selecionar tarefas", tint = PopMuted, modifier = Modifier.size(18.dp))
        }
    }
}

@Composable
private fun WorkSpaceHeader(
    subtitle: String,
    selected: WorkSpace,
    companyNames: List<String>,
    companyDescriptions: List<String>,
    selectedCompanyIndex: Int,
    onSelect: (WorkSpace) -> Unit,
    onCompanySelect: (Int) -> Unit,
    onCreateCompany: () -> Unit,
    onOpenMenu: () -> Unit,
    showPopBrand: Boolean = false,
) {
    val context = LocalContext.current
    val profilePhotoUrl = context.getSharedPreferences(LOCAL_PREFERENCES, Context.MODE_PRIVATE)
        .getString(GOOGLE_ACCOUNT_PHOTO_STORAGE, null)
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(PopBackground)
            .padding(WindowInsets.statusBars.asPaddingValues())
            .padding(horizontal = 20.dp, vertical = 14.dp),
    ) {
        Box(
            modifier = Modifier.fillMaxWidth().height(48.dp),
        ) {
            IconButton(
                onClick = onOpenMenu,
                modifier = Modifier.align(Alignment.CenterStart).size(44.dp),
            ) {
                Icon(
                    Icons.Rounded.Menu,
                    contentDescription = "Abrir menu",
                    tint = PopText,
                    modifier = Modifier.size(25.dp),
                )
            }

            Box(
                modifier = Modifier.align(Alignment.Center).widthIn(max = 220.dp),
                contentAlignment = Alignment.Center,
            ) {
                WorkSpaceSelector(
                    selected,
                    companyNames,
                    companyDescriptions,
                    selectedCompanyIndex,
                    onSelect,
                    onCompanySelect,
                    onCreateCompany,
                )
            }

            Box(
                modifier = Modifier.align(Alignment.CenterEnd).size(44.dp),
                contentAlignment = Alignment.Center,
            ) {
                if (showPopBrand) {
                    PopWordmark()
                } else {
                GoogleProfileAvatar(
                    photoUrl = profilePhotoUrl,
                        modifier = Modifier.size(40.dp).clickable { onOpenMenu() },
                )
            }
        }
        }
    }
}

@Composable
private fun DashboardScreen(
    tasks: List<PopTask>,
    canCreateTask: Boolean,
    isGuest: Boolean,
    displayName: String,
    workSpace: WorkSpace,
    onWorkSpaceChange: (WorkSpace) -> Unit,
    companyNames: List<String>,
    companyDescriptions: List<String>,
    selectedCompanyIndex: Int,
    onCompanySelect: (Int) -> Unit,
    onCreateCompany: () -> Unit,
    onOpenMenu: () -> Unit,
    onViewTasks: () -> Unit,
    onOpenTask: (PopTask) -> Unit,
) {
    val today = LocalDate.now()
    val visibleTasks = tasks.filterNot { isFutureRecurrence(it, today) }
    val overdue = visibleTasks.count { task ->
        !task.completed &&
            runCatching { LocalDate.parse(task.dueDate) }.getOrNull()?.isBefore(today) == true
    }

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
                companyDescriptions = companyDescriptions,
                selectedCompanyIndex = selectedCompanyIndex,
                onSelect = onWorkSpaceChange,
                onCompanySelect = onCompanySelect,
                onCreateCompany = onCreateCompany,
                onOpenMenu = onOpenMenu,
            )
        }
        item {
            Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp)) {
                HeroCard(visibleTasks, displayName, canCreateTask, onViewTasks)
                Spacer(Modifier.height(18.dp))
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        "Visão geral",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.ExtraBold,
                        modifier = Modifier.weight(1f),
                    )
                    Text(
                        if (visibleTasks.size == 1) "1 tarefa" else "${visibleTasks.size} tarefas",
                        color = PopMuted,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
                Spacer(Modifier.height(10.dp))
                LazyRow(
                    contentPadding = PaddingValues(end = 20.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    item {
                        MetricCard(
                            "Concluídas",
                            visibleTasks.count { it.completed },
                            visibleTasks.size,
                            Color(0xFF18A66A),
                            showProgress = true,
                            modifier = Modifier.width(158.dp).height(125.dp),
                        )
                    }
                    item {
                        MetricCard(
                            "Pendentes",
                            visibleTasks.count { !it.completed },
                            visibleTasks.size,
                            Color(0xFFFF9F1C),
                            showProgress = false,
                            modifier = Modifier.width(158.dp).height(125.dp),
                        )
                    }
                    item {
                        MetricCard(
                            "Atrasadas",
                            overdue,
                            visibleTasks.size,
                            Color(0xFFE5484D),
                            showProgress = false,
                            modifier = Modifier.width(158.dp).height(125.dp),
                        )
                    }
                }
                Spacer(Modifier.height(20.dp))
                SectionTitle("Tarefas recentes", "Ver todas", onViewTasks)
                Spacer(Modifier.height(8.dp))
                visibleTasks.take(3).forEachIndexed { index, task ->
                    TaskRow(task = task, onClick = { onOpenTask(task) })
                    if (index < 2) HorizontalDivider(color = PopBorder.copy(alpha = .65f))
                }
            }
        }
    }
}

@Composable
private fun HeroCard(
    tasks: List<PopTask>,
    displayName: String,
    canCreateTask: Boolean,
    onStartNow: () -> Unit,
) {
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
                    if (canCreateTask) {
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
}

@Composable
private fun MetricCard(
    label: String,
    value: Int,
    total: Int,
    tint: Color,
    showProgress: Boolean,
    modifier: Modifier = Modifier,
) {
    val percentage = if (total == 0) 0 else ((value.toFloat() / total) * 100).toInt()
    val isLightTheme = MaterialTheme.colorScheme.background.luminance() > .5f
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = PopSurface),
        elevation = CardDefaults.cardElevation(
            defaultElevation = if (isLightTheme) 0.dp else 1.dp,
            pressedElevation = 0.dp,
            focusedElevation = if (isLightTheme) 0.dp else 1.dp,
        ),
    ) {
        Column(Modifier.fillMaxSize().padding(15.dp)) {
            Text(label, fontSize = 13.sp, color = PopText, fontWeight = FontWeight.Bold)
            Spacer(Modifier.weight(1f))
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Text(value.toString(), color = tint, fontSize = 30.sp, fontWeight = FontWeight.ExtraBold)
                Spacer(Modifier.weight(1f))
                Text("$percentage%", color = PopMuted, fontSize = 12.sp, fontWeight = FontWeight.Bold)
            }
            if (showProgress) {
                Spacer(Modifier.height(11.dp))
                LinearProgressIndicator(
                    progress = { if (total == 0) 0f else value.toFloat() / total },
                    modifier = Modifier.fillMaxWidth().height(6.dp).clip(CircleShape),
                    color = tint,
                    trackColor = PopBorder.copy(alpha = .5f),
                    drawStopIndicator = {},
                )
            } else {
                Spacer(Modifier.height(6.dp))
            }
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
private fun AssignmentSelector(
    companyName: String,
    assignmentType: String,
    targetId: String,
    targetLabel: String,
    responsibleNames: Set<String>,
    members: List<CompanyMember>,
    sectors: List<CompanySector>,
    groups: List<CompanyGroup>,
    onChange: (type: String, targetId: String, targetLabel: String, responsibles: Set<String>) -> Unit,
    forceOpen: Boolean = false,
    plain: Boolean = false,
    onSheetClosed: () -> Unit = {},
) {
    var expanded by remember { mutableStateOf(false) }
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    LaunchedEffect(forceOpen) {
        if (forceOpen) expanded = true
    }
    val typeLabel = when (assignmentType) {
        "department" -> "Setor"
        "group" -> "Grupo"
        "company" -> "Empresa"
        else -> "Pessoa individual"
    }
    val summary = when {
        targetLabel.isBlank() -> "Escolher destino"
        assignmentType == "user" -> "$typeLabel • $targetLabel"
        responsibleNames.isEmpty() -> "$typeLabel • $targetLabel"
        else -> "$typeLabel • $targetLabel • ${responsibleNames.size} responsáveis"
    }

    Surface(
        onClick = { expanded = true },
        color = if (plain) Color.Transparent else PopSurface,
        shape = if (plain) RoundedCornerShape(0.dp) else RoundedCornerShape(14.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            Modifier.padding(
                horizontal = if (plain) 15.dp else 14.dp,
                vertical = if (plain) 14.dp else 14.dp,
            ),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                Icons.Rounded.AccountTree,
                null,
                tint = if (plain) PopMuted else PopBlue,
                modifier = Modifier.size(if (plain) 23.dp else 20.dp),
            )
            Spacer(Modifier.width(if (plain) 18.dp else 10.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    "Destino da tarefa",
                    color = if (plain) PopText.copy(alpha = .82f) else PopMuted,
                    fontSize = if (plain) 14.sp else 10.sp,
                    fontWeight = if (plain) FontWeight.SemiBold else FontWeight.Normal,
                )
                Text(
                    summary,
                    color = PopMuted,
                    fontWeight = if (plain) FontWeight.Normal else FontWeight.Bold,
                    fontSize = if (plain) 11.sp else 13.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            Icon(Icons.Rounded.KeyboardArrowDown, null, tint = PopMuted)
        }
    }

    if (expanded) {
        var contentEntered by remember { mutableStateOf(false) }
        LaunchedEffect(Unit) { contentEntered = true }
        val entranceProgress by animateFloatAsState(
            targetValue = if (contentEntered) 1f else 0f,
            animationSpec = tween(260, easing = FastOutSlowInEasing),
            label = "assignmentSheetEntrance",
        )
        ModalBottomSheet(
            onDismissRequest = {
                expanded = false
                onSheetClosed()
            },
            sheetState = sheetState,
            containerColor = PopSurface,
            shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp),
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 650.dp)
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 20.dp)
                    .padding(bottom = 28.dp)
                    .graphicsLayer {
                        alpha = entranceProgress
                        translationY = (1f - entranceProgress) * 18.dp.toPx()
                        scaleX = .985f + (.015f * entranceProgress)
                        scaleY = .985f + (.015f * entranceProgress)
                    },
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Text("Escolher destino", fontSize = 20.sp, fontWeight = FontWeight.ExtraBold)
                Text(
                    "Primeiro escolha para quem a tarefa será exibida.",
                    color = PopMuted,
                    fontSize = 11.sp,
                )
                listOf(
                    Triple("user", "Pessoa individual", Icons.Rounded.PersonOutline),
                    Triple("department", "Setor", Icons.Rounded.AccountTree),
                    Triple("group", "Grupo", Icons.Rounded.Groups),
                    Triple("company", "Empresa", Icons.Rounded.Business),
                ).chunked(2).forEach { rowItems ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(9.dp),
                    ) {
                        rowItems.forEach { (type, label, icon) ->
                            Surface(
                                onClick = {
                                    if (type == "company") {
                                        onChange(type, "", companyName, emptySet())
                                    } else {
                                        onChange(type, "", "", emptySet())
                                    }
                                },
                                color = if (assignmentType == type) PopBlueSoft else PopSurfaceAlt,
                                shape = RoundedCornerShape(16.dp),
                                modifier = Modifier.weight(1f),
                            ) {
                                Row(
                                    modifier = Modifier.padding(13.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Icon(
                                        icon,
                                        null,
                                        tint = if (assignmentType == type) PopBlue else PopMuted,
                                        modifier = Modifier.size(19.dp),
                                    )
                                    Spacer(Modifier.width(7.dp))
                                    Text(
                                        label,
                                        color = if (assignmentType == type) PopBlue else PopText,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                    )
                                }
                            }
                        }
                    }
                }

                val activeMembers = members.filterNot { it.pending }
                val targets: List<Triple<String, String, String>> = when (assignmentType) {
                    "department" -> sectors.map { Triple(it.id, it.name, it.description) }
                    "group" -> groups.map {
                        Triple(it.id, it.name, "${it.memberIds.size} membros")
                    }
                    "user" -> emptyList()
                    else -> listOf(Triple("", companyName, "Toda a empresa"))
                }
                Text(
                    when (assignmentType) {
                        "department" -> "Escolha o setor"
                        "group" -> "Escolha o grupo"
                        "company" -> "Empresa selecionada"
                        else -> "Escolha a pessoa"
                    },
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp,
                )
                if (assignmentType == "user") {
                    activeMembers.forEach { member ->
                        Surface(
                            onClick = {
                                onChange(
                                    assignmentType,
                                    member.id,
                                    member.name,
                                    emptySet(),
                                )
                            },
                            color =
                                if (targetId == member.id && targetLabel == member.name) {
                                    PopBlueSoft
                                } else {
                                    PopSurfaceAlt
                                },
                            shape = RoundedCornerShape(15.dp),
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                GoogleProfileAvatar(
                                    photoUrl = member.photoUrl,
                                    modifier = Modifier.size(40.dp),
                                    fallbackIcon = Icons.Rounded.PersonOutline,
                                )
                                Spacer(Modifier.width(10.dp))
                                Column(Modifier.weight(1f)) {
                                    Text(
                                        member.name,
                                        color = PopText,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 12.sp,
                                    )
                                    Text(member.email, color = PopMuted, fontSize = 9.sp)
                                }
                                if (targetId == member.id && targetLabel == member.name) {
                                    Icon(Icons.Rounded.Check, "Selecionado", tint = PopBlue)
                                }
                            }
                        }
                    }
                } else {
                    targets.forEach { (id, name, detail) ->
                        Surface(
                            onClick = {
                                onChange(assignmentType, id, name, emptySet())
                            },
                            color =
                                if (targetId == id && targetLabel == name) {
                                    PopBlueSoft
                                } else {
                                    PopSurfaceAlt
                                },
                            shape = RoundedCornerShape(15.dp),
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Row(
                                modifier = Modifier.padding(13.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Column(Modifier.weight(1f)) {
                                    Text(
                                        name,
                                        color = PopText,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 12.sp,
                                    )
                                    if (detail.isNotBlank()) {
                                        Text(detail, color = PopMuted, fontSize = 9.sp)
                                    }
                                }
                                if (targetId == id && targetLabel == name) {
                                    Icon(Icons.Rounded.Check, "Selecionado", tint = PopBlue)
                                }
                            }
                        }
                    }
                }

                if (assignmentType != "user" && targetLabel.isNotBlank()) {
                    val eligibleMembers = when (assignmentType) {
                        "department" -> activeMembers.filter { member ->
                            member.sectorId == targetId || member.sector == targetLabel
                        }
                        "group" -> {
                            val selectedGroup = groups.firstOrNull {
                                it.id == targetId || it.name == targetLabel
                            }
                            activeMembers.filter { member ->
                                selectedGroup != null &&
                                    (
                                        member.id in selectedGroup.memberIds ||
                                            selectedGroup.id in member.groupIds
                                        )
                            }
                        }
                        else -> activeMembers
                    }
                    HorizontalDivider(color = PopBorder.copy(alpha = .7f))
                    Text("Responsáveis (opcional)", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    Text(
                        "Escolha até 3 pessoas. Sem responsável, qualquer membro do destino poderá atuar.",
                        color = PopMuted,
                        fontSize = 10.sp,
                    )
                    if (eligibleMembers.isEmpty()) {
                        Text(
                            "Nenhum membro disponível neste destino.",
                            color = PopMuted,
                            fontSize = 10.sp,
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(PopSurfaceAlt, RoundedCornerShape(14.dp))
                                .padding(13.dp),
                        )
                    }
                    eligibleMembers.forEach { member ->
                        val selected = member.name in responsibleNames
                        Surface(
                            onClick = {
                                val next = when {
                                    selected -> responsibleNames - member.name
                                    responsibleNames.size < 3 -> responsibleNames + member.name
                                    else -> responsibleNames
                                }
                                onChange(assignmentType, targetId, targetLabel, next)
                            },
                            color = if (selected) PopBlueSoft else PopSurfaceAlt,
                            shape = RoundedCornerShape(15.dp),
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                GoogleProfileAvatar(
                                    photoUrl = member.photoUrl,
                                    modifier = Modifier.size(36.dp),
                                    fallbackIcon = Icons.Rounded.PersonOutline,
                                )
                                Spacer(Modifier.width(10.dp))
                                Column(Modifier.weight(1f)) {
                                    Text(member.name, color = PopText, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                                    Text(member.email, color = PopMuted, fontSize = 9.sp)
                                }
                                if (selected) Icon(Icons.Rounded.Check, "Responsável", tint = PopBlue)
                            }
                        }
                    }
                    Text(
                        "${responsibleNames.size}/3 selecionados",
                        color = if (responsibleNames.size == 3) PopBlue else PopMuted,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.align(Alignment.End),
                    )
                }

                Surface(
                    onClick = {
                        expanded = false
                        onSheetClosed()
                    },
                    color = PopBlue,
                    contentColor = Color.White,
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(
                        "Concluir",
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(13.dp),
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ResponsibleSelector(
    selectedNames: Set<String>,
    members: List<CompanyMember>,
    enabled: Boolean,
    maxSelections: Int,
    plain: Boolean = false,
    onChange: (Set<String>) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val normalizedSelection = selectedNames
        .filterNot { it.equals("Sem responsável", ignoreCase = true) }
        .toSet()
    val summary = normalizedSelection.joinToString(", ").ifBlank { "Sem responsável" }

    Surface(
        color = if (plain) Color.Transparent else PopSurface,
        shape = if (plain) RoundedCornerShape(0.dp) else RoundedCornerShape(16.dp),
        modifier = Modifier
            .fillMaxWidth()
            .clickable(enabled = enabled) { expanded = true },
    ) {
        Row(
            modifier = Modifier.padding(
                horizontal = if (plain) 15.dp else 14.dp,
                vertical = if (plain) 14.dp else 12.dp,
            ),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                Icons.Rounded.PersonOutline,
                null,
                tint = PopMuted,
                modifier = Modifier.size(if (plain) 23.dp else 24.dp),
            )
            Spacer(Modifier.width(if (plain) 18.dp else 12.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    "Responsável",
                    color = if (plain) PopText.copy(alpha = .82f) else PopMuted,
                    fontSize = if (plain) 14.sp else 11.sp,
                    fontWeight = if (plain) FontWeight.SemiBold else FontWeight.Normal,
                )
                Text(
                    summary,
                    color = PopMuted,
                    fontWeight = if (plain) FontWeight.Normal else FontWeight.Bold,
                    fontSize = if (plain) 11.sp else 13.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            if (enabled) {
                Icon(Icons.Rounded.KeyboardArrowDown, "Escolher responsável", tint = PopMuted)
            }
        }
    }

    if (expanded) {
        ModalBottomSheet(
            onDismissRequest = { expanded = false },
            sheetState = sheetState,
            containerColor = PopSurface,
            shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp),
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 650.dp)
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 20.dp)
                    .padding(bottom = 28.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Text("Escolher responsável", fontSize = 20.sp, fontWeight = FontWeight.ExtraBold)
                Text(
                    if (maxSelections == 1) {
                        "Selecione uma pessoa da lista."
                    } else {
                        "Selecione até $maxSelections pessoas da lista."
                    },
                    color = PopMuted,
                    fontSize = 11.sp,
                )

                Surface(
                    onClick = { onChange(emptySet()) },
                    color = if (normalizedSelection.isEmpty()) PopBlueSoft else PopSurfaceAlt,
                    shape = RoundedCornerShape(15.dp),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Row(
                        modifier = Modifier.padding(13.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(Icons.Rounded.PersonOutline, null, tint = PopMuted)
                        Spacer(Modifier.width(10.dp))
                        Text(
                            "Sem responsável",
                            color = PopText,
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp,
                            modifier = Modifier.weight(1f),
                        )
                        if (normalizedSelection.isEmpty()) {
                            Icon(Icons.Rounded.Check, "Selecionado", tint = PopBlue)
                        }
                    }
                }

                if (members.isEmpty()) {
                    Text(
                        "Nenhum membro disponível neste destino.",
                        color = PopMuted,
                        fontSize = 11.sp,
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(PopSurfaceAlt, RoundedCornerShape(14.dp))
                            .padding(14.dp),
                    )
                }

                members.forEach { member ->
                    val selected = member.name in normalizedSelection
                    Surface(
                        onClick = {
                            val next = when {
                                selected -> normalizedSelection - member.name
                                maxSelections == 1 -> setOf(member.name)
                                normalizedSelection.size < maxSelections ->
                                    normalizedSelection + member.name
                                else -> normalizedSelection
                            }
                            onChange(next)
                        },
                        color = if (selected) PopBlueSoft else PopSurfaceAlt,
                        shape = RoundedCornerShape(15.dp),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            GoogleProfileAvatar(
                                photoUrl = member.photoUrl,
                                modifier = Modifier.size(40.dp),
                                fallbackIcon = Icons.Rounded.PersonOutline,
                            )
                            Spacer(Modifier.width(10.dp))
                            Column(Modifier.weight(1f)) {
                                Text(
                                    member.name,
                                    color = PopText,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 12.sp,
                                )
                                Text(member.email, color = PopMuted, fontSize = 9.sp)
                            }
                            if (selected) {
                                Icon(Icons.Rounded.Check, "Responsável", tint = PopBlue)
                            }
                        }
                    }
                }

                Surface(
                    onClick = { expanded = false },
                    color = PopBlue,
                    contentColor = Color.White,
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(
                        "Concluir",
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(13.dp),
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TasksScreen(
    tasks: MutableList<PopTask>,
    canCreateTask: Boolean,
    currentUserId: String,
    currentUserName: String,
    workSpace: WorkSpace,
    onWorkSpaceChange: (WorkSpace) -> Unit,
    companyNames: List<String>,
    companyDescriptions: List<String>,
    companyMembers: List<CompanyMember>,
    companySectors: List<CompanySector>,
    companyGroups: List<CompanyGroup>,
    selectedCompanyIndex: Int,
    onCompanySelect: (Int) -> Unit,
    onCreateCompany: () -> Unit,
    onOpenMenu: () -> Unit,
    initialTaskId: Int?,
    onInitialTaskOpened: () -> Unit,
    onTaskDeleted: (PopTask) -> Unit,
    selectedTaskList: NativeTaskList? = null,
    initialCreateDate: LocalDate? = null,
    createOnly: Boolean = false,
    onCreateFormClosed: () -> Unit = {},
) {
    val context = LocalContext.current
    val keyboardController = LocalSoftwareKeyboardController.current
    var query by remember { mutableStateOf("") }
    var showCreate by remember { mutableStateOf(false) }
    var createOnlyOpened by remember { mutableStateOf(false) }
    var newTaskTitle by remember { mutableStateOf("") }
    var newTaskDescription by remember { mutableStateOf("") }
    var newTaskChecklistText by remember { mutableStateOf("") }
    var newTaskAssignee by remember { mutableStateOf("") }
    var newTaskAssignmentType by remember { mutableStateOf("company") }
    var newTaskAssignmentTargetId by remember { mutableStateOf("") }
    var newTaskAssignmentTargetLabel by remember { mutableStateOf("") }
    var newTaskResponsibleNames by remember { mutableStateOf(setOf<String>()) }
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
    var showAssignmentSheet by remember { mutableStateOf(false) }
    var showTaskDateSheet by remember { mutableStateOf(false) }
    var showPriorityMenu by remember { mutableStateOf(false) }
    var taskDateDraft by remember { mutableStateOf(LocalDate.now()) }
    var taskDateMonth by remember { mutableStateOf(YearMonth.now()) }
    var taskDateTab by remember { mutableStateOf("Data") }
    var showTaskTimePicker by remember { mutableStateOf(false) }
    var showTaskYearMenu by remember { mutableStateOf(false) }
    var showCompleted by remember { mutableStateOf(false) }
    var selectedFilter by remember { mutableStateOf("Hoje") }
    var editingTaskId by remember { mutableStateOf<Int?>(null) }
    var completingTaskId by remember { mutableStateOf<Int?>(null) }
    var movingTaskId by remember { mutableStateOf<Int?>(null) }
    var reorderTaskId by remember { mutableStateOf<Int?>(null) }
    var deletingTaskId by remember { mutableStateOf<Int?>(null) }
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
    var editAssignmentType by remember { mutableStateOf("company") }
    var editAssignmentTargetId by remember { mutableStateOf("") }
    var editAssignmentTargetLabel by remember { mutableStateOf("") }
    var editResponsibleNames by remember { mutableStateOf(setOf<String>()) }
    var editChecklist by remember { mutableStateOf<List<TaskChecklistItem>>(emptyList()) }
    var editAttachment by remember { mutableStateOf("") }
    val createTaskSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val taskDetailSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val taskDateSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val taskListState = rememberLazyListState()
    var taskViewportTopPx by remember { mutableFloatStateOf(0f) }
    var taskViewportBottomPx by remember { mutableFloatStateOf(Float.MAX_VALUE) }
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
    val isTaskAdmin =
        workSpace == WorkSpace.Personal ||
            companyMembers.any {
                (
                    it.id.equals(currentUserId, ignoreCase = true) ||
                        it.name.equals(currentUserName, ignoreCase = true)
                    ) &&
                    (it.isOwner || it.role.contains("admin", ignoreCase = true))
            }
    val currentCompanyMember = companyMembers.firstOrNull {
        it.id.equals(currentUserId, ignoreCase = true) ||
            it.name.equals(currentUserName, ignoreCase = true)
    }
    val currentMemberGroupIds = buildSet {
        addAll(currentCompanyMember?.groupIds.orEmpty())
        companyGroups
            .filter { group ->
                currentCompanyMember != null &&
                    group.memberIds.any { it.equals(currentCompanyMember.id, ignoreCase = true) }
            }
            .forEach { add(it.id) }
    }
    fun canCompleteTask(task: PopTask): Boolean = task.canComplete
    fun canEditTask(task: PopTask): Boolean = task.canEdit

    LaunchedEffect(showCreate) {
        if (showCreate) {
            delay(250)
            newTaskTitleFocusRequester.requestFocus()
        }
    }

    LaunchedEffect(canCreateTask) {
        if (!canCreateTask) showCreate = false
    }

    LaunchedEffect(initialCreateDate) {
        val date = initialCreateDate ?: return@LaunchedEffect
        newTaskDateOffset = ChronoUnit.DAYS.between(LocalDate.now(), date).toInt()
        taskDateDraft = date
        taskDateMonth = YearMonth.from(date)
        showAdvancedOptions = false
        createOnlyOpened = true
        showCreate = true
    }

    LaunchedEffect(showCreate, createOnly, createOnlyOpened) {
        if (createOnly && createOnlyOpened && !showCreate) {
            createOnlyOpened = false
            onCreateFormClosed()
        }
    }

    val taskFilters = if (selectedTaskList != null) {
        listOf("Todas", "Atrasadas", "Hoje", "Próximas")
    } else if (isTaskAdmin && workSpace == WorkSpace.Company) {
        listOf("Hoje", "Atrasadas", "Próximas", "Para mim", "Setor", "Grupo", "Todas")
    } else {
        listOf("Hoje", "Atrasadas", "Próximas")
    }

    LaunchedEffect(workSpace, isTaskAdmin, selectedTaskList?.id) {
        if (selectedFilter !in taskFilters) {
            selectedFilter = if (selectedTaskList != null) "Todas" else "Hoje"
        }
    }

    val selectedListTaskIds = selectedTaskList?.taskIds?.toSet()
    val listedTasks = if (selectedListTaskIds == null) tasks else tasks.filter {
        it.serverId.isNotBlank() && it.serverId in selectedListTaskIds
    }
    val filtered = listedTasks
        .filterNot { isFutureRecurrence(it, today) }
        .filter {
            it.title.contains(query, ignoreCase = true) ||
                it.description.contains(query, ignoreCase = true) ||
                it.assignee.contains(query, ignoreCase = true)
        }
        .filter { task ->
            val dueDate = runCatching { LocalDate.parse(task.dueDate) }.getOrNull()
            when (selectedFilter) {
                "Hoje" -> dueDate == today
                "Atrasadas" ->
                    !task.completed &&
                        dueDate != null &&
                        dueDate < today
                "Próximas" ->
                    !task.completed &&
                        dueDate != null &&
                        dueDate > today
                "Para mim" ->
                    (
                        task.assignmentType == "user" &&
                            task.assignmentTargetId.equals(currentUserId, ignoreCase = true)
                        ) ||
                        task.assignees.any { it.equals(currentUserName, ignoreCase = true) } ||
                        task.assignee.split(",").any {
                            it.trim().equals(currentUserName, ignoreCase = true)
                        }
                "Setor" ->
                    task.assignmentType == "department" &&
                        currentCompanyMember != null &&
                        (
                            currentCompanyMember.sectorId.isNotBlank() &&
                                task.assignmentTargetId == currentCompanyMember.sectorId ||
                                currentCompanyMember.sector.isNotBlank() &&
                                task.assignmentTargetLabel.equals(
                                    currentCompanyMember.sector,
                                    ignoreCase = true,
                                )
                            )
                "Grupo" ->
                    task.assignmentType == "group" &&
                        task.assignmentTargetId in currentMemberGroupIds
                "Todas" -> true
                else -> true
            }
        }
    val pendingTasks = filtered.filterNot { it.completed }
    val completedTasks = filtered.filter { it.completed }
    val displayedPendingTasks = pendingTasks

    fun toggleTask(task: PopTask) {
        if (!canCompleteTask(task)) {
            Toast.makeText(context, "Somente o responsável pode concluir esta tarefa", Toast.LENGTH_SHORT).show()
            return
        }
        val markingCompleted = !task.completed
        if (markingCompleted) {
            if (completingTaskId == task.id) return
            completingTaskId = task.id
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
                                id = (tasks.filter { it.id > 0 }.maxOfOrNull { it.id } ?: 0) + 1,
                                serverId = "",
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

    fun reorderTask(task: PopTask, targetTask: PopTask?, placeAfter: Boolean) {
        if (movingTaskId != null) return
        movingTaskId = task.id
        taskActionScope.launch {
            delay(280)
            val sourceIndex = tasks.indexOfFirst { it.id == task.id }
            if (sourceIndex >= 0) {
                val source = tasks.removeAt(sourceIndex)
                val targetIndex = targetTask?.let { target ->
                    tasks.indexOfFirst { it.id == target.id }.takeIf { it >= 0 }
                }
                val insertionIndex = when {
                    targetIndex == null -> tasks.size
                    placeAfter -> (targetIndex + 1).coerceAtMost(tasks.size)
                    else -> targetIndex
                }
                tasks.add(insertionIndex, source)
            }
            reorderTaskId = null
            delay(90)
            movingTaskId = null
        }
    }

    fun moveTaskOneStep(taskId: Int, direction: Int): Boolean {
        val visibleIndex = displayedPendingTasks.indexOfFirst { it.id == taskId }
        if (visibleIndex < 0) return false
        val targetIndex = visibleIndex + direction
        val target = displayedPendingTasks.getOrNull(targetIndex) ?: return false
        val sourceIndex = tasks.indexOfFirst { it.id == taskId }
        if (sourceIndex < 0) return false
        val source = tasks.removeAt(sourceIndex)
        val targetSourceIndex = tasks.indexOfFirst { it.id == target.id }
        if (targetSourceIndex < 0) {
            tasks.add(sourceIndex.coerceAtMost(tasks.size), source)
            return false
        }
        val insertionIndex =
            if (direction < 0) targetSourceIndex else (targetSourceIndex + 1).coerceAtMost(tasks.size)
        tasks.add(insertionIndex, source)
        return true
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
        editAssignee = if (task.assignmentType == "user") "" else task.assignee
        editAssignmentType = task.assignmentType
        editAssignmentTargetId = task.assignmentTargetId
        editAssignmentTargetLabel = task.assignmentTargetLabel
        editResponsibleNames =
            if (task.assignmentType == "user") emptySet() else task.assignees.toSet()
        editChecklist = task.checklist
        editAttachment = task.attachmentName
    }

    LaunchedEffect(initialTaskId) {
        initialTaskId?.let { taskId ->
            tasks.firstOrNull { it.id == taskId }?.let(::openTask)
            onInitialTaskOpened()
        }
    }

    fun saveEditedTask() {
        val taskId = editingTaskId ?: return
        val index = tasks.indexOfFirst { it.id == taskId }
        if (index < 0 || editTitle.trim().length < 3) return
        val original = tasks[index]
        if (!canEditTask(original)) {
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
        val editedAssignees = if (workSpace == WorkSpace.Personal) {
            emptyList()
        } else {
            editAssignee
                .split(",")
                .map(String::trim)
                .filter { it.isNotBlank() && it != "Sem responsável" }
                .distinct()
                .take(3)
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
            assignee = editedAssignees.joinToString(", ").ifBlank { "Sem responsável" },
            assignees = editedAssignees,
            assignmentType = editAssignmentType,
            assignmentTargetId = editAssignmentTargetId,
            assignmentTargetLabel =
                if (editAssignmentType == "user") {
                    editAssignmentTargetLabel.ifBlank { original.assignmentTargetLabel }
                } else {
                    editAssignmentTargetLabel
                },
            department = editAssignmentTargetLabel.ifBlank { original.department },
            checklist = if (isTaskAdmin) editChecklist else original.checklist,
            attachmentName = editAttachment,
        )
        editingTaskId = null
    }

    fun dismissTaskDetails() {
        val currentTask = tasks.firstOrNull { it.id == editingTaskId }
        if (currentTask?.canEdit == true) {
            saveEditedTask()
        } else {
            editingTaskId = null
        }
    }

    fun updateTaskReminder(reminder: String) {
        editReminder = reminder
        val index = tasks.indexOfFirst { it.id == editingTaskId }
        if (index >= 0) tasks[index] = tasks[index].copy(reminder = reminder)
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
                id = (tasks.filter { it.id > 0 }.maxOfOrNull { it.id } ?: 0) + 1,
                title = newTaskTitle.trim(),
                department = if (workSpace == WorkSpace.Personal) {
                    "Pessoal"
                } else {
                    newTaskAssignmentTargetLabel.ifBlank {
                        companyNames.getOrElse(selectedCompanyIndex) { "Empresa" }
                    }
                },
                dueLabel = when (newTaskDateOffset) {
                    0 -> "Hoje"
                    1 -> "Amanhã"
                    else -> "${selectedDueDate.dayOfMonth}/${selectedDueDate.monthValue}"
                },
                priority = newTaskPriority,
                dueDate = selectedDueDate.toString(),
                description = newTaskDescription.trim(),
                assignee = if (workSpace == WorkSpace.Personal) {
                    ""
                } else {
                    newTaskResponsibleNames.joinToString(", ").ifBlank { "Sem responsável" }
                },
                assignmentType = if (workSpace == WorkSpace.Personal) "user" else newTaskAssignmentType,
                assignmentTargetId = if (workSpace == WorkSpace.Personal) "" else newTaskAssignmentTargetId,
                assignmentTargetLabel =
                    if (workSpace == WorkSpace.Personal) {
                        "Eu"
                    } else {
                        newTaskAssignmentTargetLabel.ifBlank {
                            companyNames.getOrElse(selectedCompanyIndex) { "Empresa" }
                        }
                    },
                assignees =
                    if (workSpace == WorkSpace.Personal) emptyList() else newTaskResponsibleNames.take(3),
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
                checklist = if (isTaskAdmin) {
                    newTaskChecklistText
                        .lines()
                        .map(String::trim)
                        .filter(String::isNotBlank)
                        .mapIndexed { index, title ->
                            TaskChecklistItem(
                                id = "check-${System.currentTimeMillis()}-$index",
                                title = title,
                            )
                        }
                } else {
                    emptyList()
                },
            ),
        )
        newTaskTitle = ""
        newTaskDescription = ""
        newTaskChecklistText = ""
        newTaskAssignee = ""
        newTaskAssignmentType = "company"
        newTaskAssignmentTargetId = ""
        newTaskAssignmentTargetLabel = ""
        newTaskResponsibleNames = emptySet()
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

    if (!createOnly && initialCreateDate == null) Box(Modifier.fillMaxSize()) {
        LazyColumn(
            state = taskListState,
            contentPadding = PaddingValues(bottom = 92.dp),
            modifier = Modifier
                .fillMaxSize()
                .onGloballyPositioned { coordinates ->
                    val bounds = coordinates.boundsInWindow()
                    taskViewportTopPx = bounds.top
                    taskViewportBottomPx = bounds.bottom
                },
        ) {
            item {
                WorkSpaceHeader(
                    subtitle = selectedTaskList?.let { "Lista • ${it.name}" }
                        ?: if (workSpace == WorkSpace.Personal) "Tarefas pessoais • só você pode visualizar" else "Tarefas e prioridades da empresa",
                    selected = workSpace,
                    companyNames = companyNames,
                    companyDescriptions = companyDescriptions,
                    selectedCompanyIndex = selectedCompanyIndex,
                    onSelect = onWorkSpaceChange,
                    onCompanySelect = onCompanySelect,
                    onCreateCompany = onCreateCompany,
                    onOpenMenu = onOpenMenu,
                )
            }
            item {
                if (selectedTaskList != null) {
                    val activeListTasks = listedTasks.filterNot { it.completed }
                    val overdueCount = activeListTasks.count { isTaskOverdue(it) }
                    val todayCount = activeListTasks.count {
                        runCatching { LocalDate.parse(it.dueDate) }.getOrNull() == today
                    }
                    val upcomingCount = activeListTasks.count {
                        runCatching { LocalDate.parse(it.dueDate) }.getOrNull()?.isAfter(today) == true
                    }
                    Column(
                        Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 20.dp, vertical = 8.dp)
                            .background(PopBlueSoft, RoundedCornerShape(22.dp))
                            .padding(16.dp),
                    ) {
                        Text("LISTA", color = PopBlue, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        Text(selectedTaskList.name, fontSize = 21.sp, fontWeight = FontWeight.Bold)
                        Spacer(Modifier.height(10.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            listOf(
                                "Todas" to activeListTasks.size,
                                "Atrasadas" to overdueCount,
                                "Hoje" to todayCount,
                                "Próximas" to upcomingCount,
                            ).forEach { (label, count) ->
                                Surface(
                                    color = PopSurface,
                                    shape = RoundedCornerShape(12.dp),
                                    modifier = Modifier.weight(1f),
                                ) {
                                    Column(Modifier.padding(horizontal = 8.dp, vertical = 9.dp)) {
                                        Text(count.toString(), fontWeight = FontWeight.Bold, fontSize = 18.sp)
                                        Text(label, color = PopMuted, fontSize = 9.sp, maxLines = 1)
                                    }
                                }
                            }
                        }
                    }
                }
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
                Spacer(Modifier.height(10.dp))
                LazyRow(
                    contentPadding = PaddingValues(horizontal = 20.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    items(
                        taskFilters,
                        key = { it },
                    ) { filter ->
                        FilterChip(filter, selectedFilter == filter) {
                            selectedFilter = filter
                        }
                    }
                }
                Text("${pendingTasks.size} atividades pendentes", color = PopMuted, fontSize = 12.sp, modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp))
            }
            itemsIndexed(displayedPendingTasks, key = { _, task -> task.id }) { _, task ->
                val isCompleting = completingTaskId == task.id
                val taskSlotHeight by animateDpAsState(
                    targetValue = if (isCompleting) 0.dp else 94.dp,
                    animationSpec = tween(580, easing = FastOutSlowInEasing),
                    label = "taskSlotHeight",
                )
                Column {
                    val placementModifier =
                        if (reorderTaskId == task.id) Modifier.zIndex(10f) else Modifier.animateItem()
                    Box(
                        placementModifier
                            .fillMaxWidth()
                            .height(taskSlotHeight)
                            .padding(horizontal = 26.dp, vertical = 6.dp),
                    ) {
                        TaskCard(
                            task = task,
                            members = companyMembers,
                            showAssigneeAvatars =
                                workSpace == WorkSpace.Company &&
                                    task.assignmentType in setOf("department", "group"),
                            isCompleting = isCompleting,
                            isMoving = movingTaskId == task.id,
                            isReorderSelected = reorderTaskId == task.id,
                            onComplete = { toggleTask(task) },
                            onOpen = { openTask(task) },
                            onReorderStart = { reorderTaskId = task.id },
                            onReorderStep = { direction -> moveTaskOneStep(task.id, direction) },
                            onReorderEnd = { reorderTaskId = null },
                            onAutoScroll = { amount ->
                                taskActionScope.launch { taskListState.scrollBy(amount) }
                            },
                            autoScrollViewportTopPx = taskViewportTopPx,
                            autoScrollViewportBottomPx = taskViewportBottomPx,
                        )
                    }
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
                        AnimatedVisibility(
                            visible = showCompleted,
                            enter = expandVertically(tween(320, easing = FastOutSlowInEasing)) + fadeIn(tween(220)),
                            exit = shrinkVertically(tween(280, easing = FastOutSlowInEasing)) + fadeOut(tween(180)),
                        ) {
                            Column {
                                completedTasks.forEach { task ->
                                    Box(Modifier.padding(horizontal = 26.dp, vertical = 6.dp)) {
                                        TaskCard(
                                            task = task,
                                            members = companyMembers,
                                            showAssigneeAvatars =
                                                workSpace == WorkSpace.Company &&
                                                    task.assignmentType in setOf("department", "group"),
                                            isCompleting = false,
                                            isMoving = movingTaskId == task.id,
                                            isReorderSelected = reorderTaskId == task.id,
                                            onComplete = { toggleTask(task) },
                                            onOpen = { openTask(task) },
                                            onReorderStart = {},
                                            onReorderStep = { false },
                                            onReorderEnd = {},
                                            onAutoScroll = {},
                                            reorderEnabled = false,
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        if (canCreateTask) {
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
    }

    if (showCreate && canCreateTask) {
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
                            tint = taskPriorityColor(newTaskPriority),
                        ) { showPriorityMenu = true }
                        DropdownMenu(
                            expanded = showPriorityMenu,
                            onDismissRequest = { showPriorityMenu = false },
                            shape = RoundedCornerShape(14.dp),
                            containerColor = PopSurface,
                        ) {
                            listOf(
                                "Urgente" to taskPriorityColor("Urgente"),
                                "Alta" to taskPriorityColor("Alta"),
                                "Média" to taskPriorityColor("Média"),
                                "Baixa" to taskPriorityColor("Baixa"),
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
                        TaskComposerIcon(Icons.Rounded.PersonOutline, "Escolher destino", PopBlue) {
                            keyboardController?.hide()
                            showAssignmentSheet = true
                        }
                    }
                    TaskComposerIcon(Icons.Rounded.AttachFile, "Adicionar anexo", if (newTaskAttachment.isBlank()) PopMuted else PopBlue) {
                        attachmentPicker.launch(arrayOf("*/*"))
                    }
                    TaskComposerIcon(Icons.Rounded.MoreHoriz, "Mais opções", PopMuted) {
                        showAdvancedOptions = !showAdvancedOptions
                    }
                }
                AnimatedVisibility(visible = showAdvancedOptions || showAssignmentSheet) {
                    Column(
                        modifier = Modifier.fillMaxWidth().background(PopSurfaceAlt, RoundedCornerShape(18.dp)).padding(14.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        if (workSpace == WorkSpace.Company) {
                            AssignmentSelector(
                                companyName = companyNames.getOrElse(selectedCompanyIndex) { "Empresa" },
                                assignmentType = newTaskAssignmentType,
                                targetId = newTaskAssignmentTargetId,
                                targetLabel = newTaskAssignmentTargetLabel,
                                responsibleNames = newTaskResponsibleNames,
                                members = companyMembers,
                                sectors = companySectors,
                                groups = companyGroups,
                                onChange = { type, id, label, responsibles ->
                                    newTaskAssignmentType = type
                                    newTaskAssignmentTargetId = id
                                    newTaskAssignmentTargetLabel = label
                                    newTaskResponsibleNames = responsibles.take(3).toSet()
                                    newTaskAssignee = newTaskResponsibleNames.joinToString(", ")
                                },
                                forceOpen = showAssignmentSheet,
                                onSheetClosed = { showAssignmentSheet = false },
                            )
                        }
                        if (isTaskAdmin) {
                            TextField(
                                value = newTaskChecklistText,
                                onValueChange = { newTaskChecklistText = it },
                                label = { Text("Checklist (um item por linha)") },
                                leadingIcon = {
                                    Icon(Icons.Rounded.Checklist, null, tint = PopBlue)
                                },
                                minLines = 3,
                                maxLines = 6,
                                shape = RoundedCornerShape(14.dp),
                                colors = taskEditorFieldColors(PopSurface),
                                modifier = Modifier.fillMaxWidth(),
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
            onDismissRequest = ::dismissTaskDetails,
            properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false),
        ) {
            val dialogView = LocalView.current
            val openedTask = tasks.firstOrNull { it.id == editingTaskId }
            val detailCanEdit = openedTask?.canEdit == true
            val detailIsOverdue = openedTask?.let(::isTaskOverdue) == true
            val activeCompanyMembers = companyMembers.filterNot { it.pending }
            val eligibleResponsibleMembers = when (openedTask?.assignmentType) {
                "department" -> activeCompanyMembers.filter { member ->
                    member.sectorId == openedTask.assignmentTargetId ||
                        member.sector == openedTask.assignmentTargetLabel
                }
                "group" -> {
                    val selectedGroup = companyGroups.firstOrNull { group ->
                        group.id == openedTask.assignmentTargetId ||
                            group.name == openedTask.assignmentTargetLabel
                    }
                    activeCompanyMembers.filter { member ->
                        selectedGroup != null &&
                            (
                                member.id in selectedGroup.memberIds ||
                                    selectedGroup.id in member.groupIds
                                )
                    }
                }
                "user" -> activeCompanyMembers.filter { member ->
                    member.id == openedTask.assignmentTargetId ||
                        member.name == openedTask.assignmentTargetLabel
                }
                else -> activeCompanyMembers
            }
            val detailIsLightTheme = MaterialTheme.colorScheme.background.luminance() > .5f
            val detailOverdueBackground =
                if (detailIsLightTheme) Color(0xFFD63843) else Color(0xFFB52D3A)
            SideEffect {
                (dialogView.parent as? DialogWindowProvider)?.window?.setBackgroundDrawable(ColorDrawable(android.graphics.Color.TRANSPARENT))
            }
            var detailVisible by remember(editingTaskId) { mutableStateOf(false) }
            LaunchedEffect(editingTaskId) { detailVisible = true }
            val detailAlpha by animateFloatAsState(
                targetValue =
                    if (
                        detailVisible &&
                        deletingTaskId != editingTaskId &&
                        movingTaskId != editingTaskId
                    ) 1f else 0f,
                animationSpec = tween(
                    if (deletingTaskId == editingTaskId || movingTaskId == editingTaskId) 300 else 380,
                    easing = FastOutSlowInEasing,
                ),
                label = "taskDetailEntrance",
            )
            Surface(
                color = PopBackground,
                modifier = Modifier.fillMaxSize().graphicsLayer {
                    alpha = detailAlpha
                    translationY = (1f - detailAlpha) * 44f
                    val entranceScale = .985f + (.015f * detailAlpha)
                    scaleX = entranceScale
                    scaleY = entranceScale
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
                    IconButton(onClick = ::dismissTaskDetails) {
                        Icon(Icons.Rounded.ArrowBack, "Voltar", tint = PopText, modifier = Modifier.size(28.dp))
                    }
                    Text(
                        openedTask?.department?.uppercase() ?: "DETALHES",
                        color = PopMuted,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        modifier = Modifier.weight(1f),
                    )
                    if (detailCanEdit && openedTask != null) {
                        var detailMoveMenu by remember(openedTask.id) { mutableStateOf(false) }
                        Box {
                            IconButton(onClick = { detailMoveMenu = true }) {
                                Icon(
                                    Icons.Rounded.MoreVert,
                                    "Mais opções da atividade",
                                    tint = PopText,
                                    modifier = Modifier.size(24.dp),
                                )
                            }
                            DropdownMenu(
                                expanded = detailMoveMenu,
                                onDismissRequest = { detailMoveMenu = false },
                            ) {
                                DropdownMenuItem(
                                    text = { Text("Mover para o início") },
                                    onClick = {
                                        val first = tasks.firstOrNull { it.id != openedTask.id }
                                        reorderTask(openedTask, first, placeAfter = false)
                                        detailMoveMenu = false
                                    },
                                )
                                DropdownMenuItem(
                                    text = { Text("Mover para o final") },
                                    onClick = {
                                        reorderTask(openedTask, null, placeAfter = true)
                                        detailMoveMenu = false
                                    },
                                )
                            }
                        }
                    }
                    if (detailCanEdit) {
                        TextButton(onClick = ::saveEditedTask, enabled = editTitle.trim().length >= 3) {
                            Text("Salvar", color = PopBlue, fontWeight = FontWeight.ExtraBold)
                        }
                    }
                }
                LazyColumn(
                    modifier = Modifier.fillMaxWidth().weight(1f),
                    contentPadding = PaddingValues(bottom = 28.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    item {
                        val currentTask = openedTask
                        val detailCompleting = completingTaskId == currentTask?.id
                        val detailCompletedVisual = currentTask?.completed == true || detailCompleting
                        val detailCheckColor by animateColorAsState(
                            targetValue = if (detailCompletedVisual) PopBlue else Color.Transparent,
                            animationSpec = tween(220),
                            label = "detailCheckColor",
                        )
                        val detailCheckScale by animateFloatAsState(
                            targetValue = if (detailCompletedVisual) 1f else .55f,
                            animationSpec = spring(
                                dampingRatio = Spring.DampingRatioMediumBouncy,
                                stiffness = Spring.StiffnessLow,
                            ),
                            label = "detailCheckScale",
                        )
                        val detailCheckAlpha by animateFloatAsState(
                            targetValue = if (detailCompletedVisual) 1f else 0f,
                            animationSpec = tween(160),
                            label = "detailCheckAlpha",
                        )
                        val detailPulseScale by animateFloatAsState(
                            targetValue = if (detailCompleting) 1.22f else 1f,
                            animationSpec = spring(
                                dampingRatio = Spring.DampingRatioMediumBouncy,
                                stiffness = Spring.StiffnessMedium,
                            ),
                            label = "detailCheckPulse",
                        )
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 12.dp),
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
                                        .size(38.dp)
                                        .graphicsLayer {
                                            scaleX = detailPulseScale
                                            scaleY = detailPulseScale
                                        }
                                        .background(
                                            if (detailCompleting) PopBlue.copy(alpha = .14f) else Color.Transparent,
                                            CircleShape,
                                        ),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Box(
                                        Modifier
                                            .size(31.dp)
                                            .background(
                                                when {
                                                    detailCompletedVisual -> detailCheckColor
                                                    else -> Color.Transparent
                                                },
                                                CircleShape,
                                            )
                                            .border(
                                                2.dp,
                                                when {
                                                    detailCompletedVisual -> PopBlue
                                                    else -> PopBorder
                                                },
                                                CircleShape,
                                            ),
                                        contentAlignment = Alignment.Center,
                                    ) {
                                        Icon(
                                            Icons.Rounded.Check,
                                            "Concluída",
                                            tint = Color.White,
                                            modifier = Modifier.size(20.dp).graphicsLayer {
                                                alpha = detailCheckAlpha
                                                scaleX = detailCheckScale
                                                scaleY = detailCheckScale
                                            },
                                        )
                                    }
                                }
                            }
                            TextField(
                                value = editTitle,
                                onValueChange = { editTitle = it },
                                readOnly = !detailCanEdit,
                                placeholder = { Text("Nome da tarefa") },
                                minLines = 1,
                                maxLines = 3,
                                textStyle = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.ExtraBold),
                                colors = TextFieldDefaults.colors(
                                    focusedContainerColor = Color.Transparent,
                                    unfocusedContainerColor = Color.Transparent,
                                    focusedTextColor = PopText,
                                    unfocusedTextColor = PopText,
                                    cursorColor = PopBlue,
                                    focusedPlaceholderColor = PopMuted,
                                    unfocusedPlaceholderColor = PopMuted,
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
                                    enabled = detailCanEdit,
                                    valueColor = taskPriorityColor(editPriority),
                                ) {
                                    expandedDetailSection = if (expandedDetailSection == "priority") null else "priority"
                                }
                                AnimatedVisibility(visible = detailCanEdit && expandedDetailSection == "priority") {
                                    LazyRow(
                                        modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp),
                                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                                    ) {
                                        items(listOf("Baixa", "Média", "Alta", "Urgente")) { option ->
                                            PriorityChoicePill(option, editPriority == option) {
                                                editPriority = option
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
                                    icon = Icons.Rounded.CalendarMonth,
                                    label = "Data de conclusão",
                                    value = listOf(editDueDate, editDueTime).filter { it.isNotBlank() }.joinToString(" • "),
                                    expanded = expandedDetailSection == "date",
                                    enabled = detailCanEdit,
                                    valueColor = if (detailIsOverdue) detailOverdueBackground else PopMuted,
                                ) {
                                    expandedDetailSection = if (expandedDetailSection == "date") null else "date"
                                }
                                AnimatedVisibility(visible = detailCanEdit && expandedDetailSection == "date") {
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
                                                DetailChoicePill(option, editReminder == option) { updateTaskReminder(option) }
                                                if (option != "No horário") Spacer(Modifier.width(7.dp))
                                            }
                                        }
                                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
                                            listOf("15 min", "1 hora antes", "1 dia antes").forEach { option ->
                                                DetailChoicePill(option, editReminder == option) { updateTaskReminder(option) }
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
                                    enabled = detailCanEdit,
                                ) {
                                    expandedDetailSection = if (expandedDetailSection == "recurrence") null else "recurrence"
                                }
                                AnimatedVisibility(visible = detailCanEdit && expandedDetailSection == "recurrence") {
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
                            AssignmentSelector(
                                companyName = companyNames.getOrElse(selectedCompanyIndex) { "Empresa" },
                                assignmentType = editAssignmentType,
                                targetId = editAssignmentTargetId,
                                targetLabel = editAssignmentTargetLabel,
                                responsibleNames = editResponsibleNames,
                                members = companyMembers,
                                sectors = companySectors,
                                groups = companyGroups,
                                onChange = { type, id, label, responsibles ->
                                    editAssignmentType = type
                                    editAssignmentTargetId = id
                                    editAssignmentTargetLabel = label
                                    editResponsibleNames = responsibles.take(3).toSet()
                                    editAssignee =
                                        if (type == "user") {
                                            ""
                                        } else {
                                            editResponsibleNames.joinToString(", ")
                                        }
                                },
                                forceOpen = false,
                                plain = true,
                                onSheetClosed = {},
                            )
                        }
                        if (editAssignmentType != "user") item {
                            ResponsibleSelector(
                                selectedNames = editAssignee
                                    .split(",")
                                    .map(String::trim)
                                    .filter(String::isNotBlank)
                                    .toSet(),
                                members = eligibleResponsibleMembers,
                                enabled = detailCanEdit,
                                maxSelections =
                                    3,
                                plain = true,
                                onChange = { selected ->
                                    editAssignee = selected.joinToString(", ")
                                },
                            )
                        }
                    }
                    if (openedTask != null && (openedTask.checklist.isNotEmpty() || isTaskAdmin)) {
                        item {
                            Column(
                                Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 15.dp, vertical = 10.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                Text(
                                    "Checklist",
                                    color = PopText.copy(alpha = .82f),
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 14.sp,
                                )
                                editChecklist.forEach { checklistItem ->
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clickable(enabled = isTaskAdmin) {
                                                editChecklist = editChecklist.map {
                                                    if (it.id == checklistItem.id) {
                                                        it.copy(done = !it.done)
                                                    } else {
                                                        it
                                                    }
                                                }
                                            },
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        Checkbox(
                                            checked = checklistItem.done,
                                            onCheckedChange = if (isTaskAdmin) {
                                                {
                                                    editChecklist = editChecklist.map {
                                                        if (it.id == checklistItem.id) {
                                                            it.copy(done = !it.done)
                                                        } else {
                                                            it
                                                        }
                                                    }
                                                }
                                            } else {
                                                null
                                            },
                                        )
                                        Text(checklistItem.title, modifier = Modifier.weight(1f))
                                        if (isTaskAdmin) {
                                            IconButton(
                                                onClick = {
                                                    editChecklist = editChecklist.filterNot {
                                                        it.id == checklistItem.id
                                                    }
                                                },
                                            ) {
                                                Icon(
                                                    Icons.Rounded.Delete,
                                                    "Excluir item do checklist",
                                                    tint = Color(0xFFD87373),
                                                    modifier = Modifier.size(19.dp),
                                                )
                                            }
                                        }
                                    }
                                }
                                if (isTaskAdmin) {
                                    var newChecklistItem by remember(editingTaskId) {
                                        mutableStateOf("")
                                    }
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        TextField(
                                            value = newChecklistItem,
                                            onValueChange = { newChecklistItem = it },
                                            placeholder = { Text("Novo item") },
                                            singleLine = true,
                                            shape = RoundedCornerShape(12.dp),
                                            colors = taskEditorFieldColors(PopSurfaceAlt),
                                            modifier = Modifier.weight(1f),
                                        )
                                        IconButton(
                                            onClick = {
                                                val title = newChecklistItem.trim()
                                                if (title.isNotBlank()) {
                                                    editChecklist = editChecklist + TaskChecklistItem(
                                                        id = "check-${System.currentTimeMillis()}",
                                                        title = title,
                                                    )
                                                    newChecklistItem = ""
                                                }
                                            },
                                        ) {
                                            Icon(Icons.Rounded.Add, "Adicionar item", tint = PopBlue)
                                        }
                                    }
                                }
                            }
                        }
                    }
                    item {
                        Surface(color = PopSurface, shape = RoundedCornerShape(18.dp), modifier = Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text("Anotação", color = PopMuted, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                TextField(
                                    value = editDescription,
                                    onValueChange = { editDescription = it },
                                    readOnly = !detailCanEdit,
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
                            enabled = detailCanEdit,
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
                    if (!openedTask?.createdBy.isNullOrBlank() || openedTask?.canDelete == true) {
                        item {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(start = 15.dp, top = 18.dp, bottom = 4.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    if (!openedTask?.createdBy.isNullOrBlank()) {
                                        Text(
                                            "Criada por",
                                            color = PopMuted,
                                            fontSize = 10.sp,
                                        )
                                        Text(
                                            openedTask?.createdBy.orEmpty(),
                                            color = PopText.copy(alpha = .82f),
                                            fontWeight = FontWeight.SemiBold,
                                            fontSize = 12.sp,
                                        )
                                    }
                                }
                                if (openedTask?.canDelete == true) {
                                    Surface(
                                        onClick = {
                                            val currentTask = tasks.firstOrNull { it.id == editingTaskId }
                                            if (currentTask?.canDelete == true) {
                                                showDeleteTaskConfirmation = true
                                            } else {
                                                Toast.makeText(context, "Você não tem permissão para excluir esta tarefa", Toast.LENGTH_SHORT).show()
                                            }
                                        },
                                        color = Color.Transparent,
                                        contentColor = Color(0xFFD87373),
                                        shape = RoundedCornerShape(14.dp),
                                    ) {
                                        Row(
                                            Modifier.padding(horizontal = 13.dp, vertical = 9.dp),
                                            verticalAlignment = Alignment.CenterVertically,
                                        ) {
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
        }
    }

    if (showDeleteTaskConfirmation) {
        val taskToDelete = tasks.firstOrNull { it.id == editingTaskId }
        val recurringDelete = taskToDelete?.recurrenceRule != null &&
            taskToDelete.recurrenceRule != "Não repetir"
        AlertDialog(
            onDismissRequest = { showDeleteTaskConfirmation = false },
            title = {
                Text(
                    if (recurringDelete) "Excluir atividade recorrente?" else "Excluir tarefa?",
                    fontWeight = FontWeight.ExtraBold,
                )
            },
            text = {
                Text(
                    if (recurringDelete) {
                        "Escolha se deseja excluir somente esta data ou toda a recorrência."
                    } else {
                        "Tem certeza de que deseja excluir esta tarefa? Essa ação não pode ser desfeita."
                    },
                )
            },
            confirmButton = {
                Column(horizontalAlignment = Alignment.End) {
                    if (recurringDelete) {
                        TextButton(
                            onClick = {
                                val taskId = editingTaskId
                                if (taskId != null) {
                                    deletingTaskId = taskId
                                    taskActionScope.launch {
                                        delay(340)
                                        tasks.firstOrNull { it.id == taskId }?.let(onTaskDeleted)
                                        tasks.removeAll { it.id == taskId }
                                        editingTaskId = null
                                        deletingTaskId = null
                                    }
                                }
                                showDeleteTaskConfirmation = false
                            },
                        ) {
                            Text("Somente esta data", color = PopBlue, fontWeight = FontWeight.Bold)
                        }
                    }
                    TextButton(
                        onClick = {
                            val taskId = editingTaskId
                            val selectedTask = tasks.firstOrNull { it.id == taskId }
                            if (taskId != null && selectedTask != null) {
                                deletingTaskId = taskId
                                taskActionScope.launch {
                                    delay(340)
                                    if (recurringDelete) {
                                        val seriesTasks = tasks.filter {
                                            it.title == selectedTask.title &&
                                                it.recurrenceRule == selectedTask.recurrenceRule &&
                                                it.createdBy == selectedTask.createdBy &&
                                                it.assignmentType == selectedTask.assignmentType &&
                                                it.assignmentTargetId == selectedTask.assignmentTargetId
                                        }
                                        seriesTasks.forEach(onTaskDeleted)
                                        tasks.removeAll(seriesTasks.toSet())
                                    } else {
                                        onTaskDeleted(selectedTask)
                                        tasks.removeAll { it.id == taskId }
                                    }
                                    editingTaskId = null
                                    deletingTaskId = null
                                }
                            }
                            showDeleteTaskConfirmation = false
                        },
                    ) {
                        Text(
                            if (recurringDelete) "Toda a recorrência" else "Excluir",
                            color = Color(0xFFE5484D),
                            fontWeight = FontWeight.Bold,
                        )
                    }
                }
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
                        AssignmentSelector(
                            companyName = companyNames.getOrElse(selectedCompanyIndex) { "Empresa" },
                            assignmentType = newTaskAssignmentType,
                            targetId = newTaskAssignmentTargetId,
                            targetLabel = newTaskAssignmentTargetLabel,
                            responsibleNames = newTaskResponsibleNames,
                            members = companyMembers,
                            sectors = companySectors,
                            groups = companyGroups,
                            onChange = { type, id, label, responsibles ->
                                newTaskAssignmentType = type
                                newTaskAssignmentTargetId = id
                                newTaskAssignmentTargetLabel = label
                                newTaskResponsibleNames = responsibles.take(3).toSet()
                                newTaskAssignee = newTaskResponsibleNames.joinToString(", ")
                            },
                        )
                    }
                    Text("Prioridade", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(listOf("Baixa", "Média", "Alta", "Urgente")) { priority ->
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
                                    ""
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
    val priorityColor = taskPriorityColor(label)
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
        targetValue = if (selected) PopBlue else PopText,
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
private fun TaskAssigneeAvatarStack(
    task: PopTask,
    members: List<CompanyMember>,
) {
    if (task.assignmentType !in setOf("department", "group", "company")) return
    val responsibleNames = (
        task.assignees.ifEmpty {
            task.assignee.split(",").map(String::trim)
        }
        )
        .filter {
            it.isNotBlank() &&
                !it.equals("Sem responsável", ignoreCase = true)
        }
        .distinctBy { it.lowercase(Locale("pt", "BR")) }
        .take(3)
    if (responsibleNames.isEmpty()) return

    val avatarSize = 27.dp
    val visibleStep = 17.dp
    Box(
        modifier = Modifier
            .width(avatarSize + visibleStep * (responsibleNames.size - 1))
            .height(avatarSize),
    ) {
        responsibleNames.forEachIndexed { index, responsibleName ->
            val member = members.firstOrNull {
                it.name.equals(responsibleName, ignoreCase = true)
            }
            GoogleProfileAvatar(
                photoUrl = member?.photoUrl,
                modifier = Modifier
                    .offset(x = visibleStep * index)
                    .size(avatarSize),
                fallbackIcon = Icons.Rounded.PersonOutline,
            )
        }
    }
}

@Composable
private fun TaskCard(
    task: PopTask,
    members: List<CompanyMember>,
    showAssigneeAvatars: Boolean,
    isCompleting: Boolean,
    isMoving: Boolean,
    isReorderSelected: Boolean,
    onComplete: () -> Unit,
    onOpen: () -> Unit,
    onReorderStart: () -> Unit,
    onReorderStep: (direction: Int) -> Boolean,
    onReorderEnd: () -> Unit,
    onAutoScroll: (amount: Float) -> Unit,
    autoScrollViewportTopPx: Float = 0f,
    autoScrollViewportBottomPx: Float = Float.MAX_VALUE,
    reorderEnabled: Boolean = true,
) {
    val hapticFeedback = LocalHapticFeedback.current
    val currentOnReorderStep by rememberUpdatedState(onReorderStep)
    val currentOnReorderEnd by rememberUpdatedState(onReorderEnd)
    val currentOnAutoScroll by rememberUpdatedState(onAutoScroll)
    var suppressTap by remember(task.id) { mutableStateOf(false) }
    var ignoreTapUntil by remember(task.id) { mutableLongStateOf(0L) }
    var dragTranslationX by remember(task.id) { mutableFloatStateOf(0f) }
    var dragTranslationY by remember(task.id) { mutableFloatStateOf(0f) }
    var cardTopInWindowPx by remember(task.id) { mutableFloatStateOf(0f) }
    var cardHeightPx by remember(task.id) { mutableFloatStateOf(0f) }
    val completedVisual = task.completed || isCompleting
    val isOverdue = isTaskOverdue(task) && !isCompleting
    val isUrgent = task.priority == "Urgente" && !completedVisual
    val hasVisibleAssignees =
        task.assignmentType in setOf("department", "group", "company") &&
            (
                task.assignees.isNotEmpty() ||
                    (
                        task.assignee.isNotBlank() &&
                            !task.assignee.equals("Sem responsável", ignoreCase = true)
                        )
                )
    val isLightTheme = MaterialTheme.colorScheme.background.luminance() > .5f
    val urgentBackground = if (isLightTheme) Color(0xFFD63843) else Color(0xFFB52D3A)
    val cardColor by animateColorAsState(
        targetValue = when {
            completedVisual -> if (isLightTheme) PopSurfaceAlt else Color(0xFF141717)
            isUrgent -> urgentBackground
            else -> PopSurface
        },
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
    val moveProgress by animateFloatAsState(
        targetValue = if (isMoving) 1f else 0f,
        animationSpec = tween(280, easing = FastOutSlowInEasing),
        label = "taskMoveProgress",
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
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(
            containerColor = cardColor,
            contentColor = if (isUrgent || (completedVisual && !isLightTheme)) Color.White else PopText,
        ),
        modifier = Modifier
            .fillMaxWidth()
            .height(82.dp)
            .onGloballyPositioned { coordinates ->
                cardTopInWindowPx = coordinates.boundsInWindow().top
                cardHeightPx = coordinates.size.height.toFloat()
            }
            .pointerInput(task.id) {
                detectTapGestures(
                    onTap = {
                        if (!suppressTap && System.currentTimeMillis() >= ignoreTapUntil) onOpen()
                    },
                )
            }
            .pointerInput(task.id, reorderEnabled) {
                if (!reorderEnabled) return@pointerInput
                detectDragGesturesAfterLongPress(
                    onDragStart = {
                        suppressTap = true
                        ignoreTapUntil = Long.MAX_VALUE
                        dragTranslationX = 0f
                        dragTranslationY = 0f
                        hapticFeedback.performHapticFeedback(HapticFeedbackType.LongPress)
                        onReorderStart()
                    },
                    onDragEnd = {
                        if (suppressTap) currentOnReorderEnd()
                        dragTranslationX = 0f
                        dragTranslationY = 0f
                        suppressTap = false
                        ignoreTapUntil = System.currentTimeMillis() + 500L
                    },
                    onDragCancel = {
                        if (suppressTap) currentOnReorderEnd()
                        dragTranslationX = 0f
                        dragTranslationY = 0f
                        suppressTap = false
                        ignoreTapUntil = System.currentTimeMillis() + 500L
                    },
                    onDrag = { change, dragAmount ->
                        change.consume()
                        dragTranslationX += dragAmount.x
                        dragTranslationY += dragAmount.y
                        val stepThreshold = size.height * .52f
                        val slotDistance = size.height + 12.dp.toPx()
                        when {
                            dragTranslationY <= -stepThreshold -> {
                                if (currentOnReorderStep(-1)) dragTranslationY += slotDistance
                                else dragTranslationY = -stepThreshold
                            }
                            dragTranslationY >= stepThreshold -> {
                                if (currentOnReorderStep(1)) dragTranslationY -= slotDistance
                                else dragTranslationY = stepThreshold
                            }
                        }
                        val visualCardTop = cardTopInWindowPx + dragTranslationY
                        val visualCardBottom = visualCardTop + cardHeightPx
                        val edgeMargin = 12.dp.toPx()
                        when {
                            dragAmount.y < 0f &&
                                visualCardTop <= autoScrollViewportTopPx + edgeMargin ->
                                currentOnAutoScroll(-22f)
                            dragAmount.y > 0f &&
                                visualCardBottom >= autoScrollViewportBottomPx - edgeMargin ->
                                currentOnAutoScroll(22f)
                        }
                    },
                )
            }
            .graphicsLayer {
                scaleX = cardScale - (.025f * moveProgress)
                scaleY = cardScale - (.025f * moveProgress)
                translationX =
                    (-34f * completionProgress) + (34f * moveProgress) + dragTranslationX
                translationY = dragTranslationY
                shadowElevation = if (isReorderSelected) 18f else 0f
                alpha =
                    (1f - completionProgress) *
                        (1f - (.68f * moveProgress))
            },
    ) {
        Box(Modifier.fillMaxSize()) {
        Row(
            Modifier.fillMaxSize().padding(start = 14.dp, end = 76.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
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
                        .border(
                            2.dp,
                            when {
                                completedVisual -> PopBlue
                                isUrgent -> Color.White.copy(alpha = .72f)
                                else -> PopMuted.copy(alpha = .55f)
                            },
                            CircleShape,
                        ),
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
                Text(
                    task.title,
                    color = if (isUrgent) Color.White else Color.Unspecified,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                val dueLabel = displayDueLabel(task)
                val dueText = if (task.dueTime.isBlank()) dueLabel else "$dueLabel, ${task.dueTime}"
                val hasRecurrence = task.recurrenceRule != "Não repetir"
                val hasDescription = task.description.isNotBlank()
                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (hasRecurrence) {
                        Icon(
                            Icons.Rounded.Repeat,
                            "Tarefa recorrente",
                            tint = if (isUrgent) Color.White.copy(alpha = .82f) else PopMuted,
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
                            tint = if (isUrgent) Color.White.copy(alpha = .82f) else PopMuted,
                            modifier = Modifier.size(14.dp),
                        )
                    }
                    if (hasRecurrence || hasDescription) {
                        Text(
                            "•",
                            color = if (isUrgent) Color.White.copy(alpha = .82f) else PopMuted,
                            fontSize = 10.sp,
                            modifier = Modifier.padding(horizontal = 5.dp),
                        )
                    }
                    Text(
                        dueText,
                        color = when {
                            isUrgent -> Color.White.copy(alpha = .9f)
                            isOverdue -> taskPriorityColor("Urgente")
                            else -> PopMuted
                        },
                        fontSize = 11.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f),
                    )
                }
            }
            if (showAssigneeAvatars && hasVisibleAssignees) {
                TaskAssigneeAvatarStack(task = task, members = members)
            }
        }
            Box(
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(end = 13.dp, bottom = 7.dp),
            ) {
                PriorityPill(task.priority, if (isUrgent) Color.White else null)
            }
        }
    }
}

@Composable
private fun TaskRow(task: PopTask, onClick: (() -> Unit)? = null) {
    val isOverdue = isTaskOverdue(task)
    val rowModifier = if (onClick != null) {
        Modifier.fillMaxWidth().clickable(onClick = onClick).padding(vertical = 13.dp)
    } else {
        Modifier.fillMaxWidth().padding(vertical = 13.dp)
    }
    Row(rowModifier, verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (task.completed) {
                    Icon(
                        Icons.Rounded.CheckCircle,
                        "Concluída",
                        tint = PopBlue,
                        modifier = Modifier.size(15.dp),
                    )
                    Spacer(Modifier.width(6.dp))
                }
                Text(
                    task.title,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
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
                    displayDueLabel(task),
                    fontSize = 11.sp,
                    color = if (isOverdue) Color(0xFFE5484D) else PopMuted,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                if (task.completed) {
                    Text(
                        " • Concluída",
                        color = PopBlue,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                    )
                }
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
    enabled: Boolean = true,
    valueColor: Color = PopMuted,
    onClick: () -> Unit,
) {
    val rowModifier = if (enabled) {
        Modifier.fillMaxWidth().clickable(onClick = onClick)
    } else {
        Modifier.fillMaxWidth()
    }
    Row(
        modifier = rowModifier.padding(horizontal = 15.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, null, tint = PopMuted, modifier = Modifier.size(23.dp))
        Spacer(Modifier.width(18.dp))
        Column(Modifier.weight(1f)) {
            Text(label, color = PopText.copy(alpha = .82f), fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
            if (value.isNotBlank()) {
                Text(value, color = valueColor, fontSize = 11.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
        }
        if (enabled) {
            Icon(
                Icons.Rounded.KeyboardArrowDown,
                if (expanded) "Recolher" else "Editar",
                tint = PopMuted,
                modifier = Modifier.size(21.dp).graphicsLayer { rotationZ = if (expanded) 180f else 0f },
            )
        }
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
private fun PriorityPill(priority: String, colorOverride: Color? = null) {
    val color = taskPriorityColor(priority)
    if (priority == "Urgente" && colorOverride == null) {
        Surface(
            color = color,
            contentColor = Color.White,
            shape = CircleShape,
        ) {
            Text(
                "URGENTE",
                fontSize = 9.sp,
                fontWeight = FontWeight.ExtraBold,
                modifier = Modifier.padding(horizontal = 9.dp, vertical = 5.dp),
            )
        }
        return
    }
    Text(
        priority,
        color = colorOverride ?: color,
        fontSize = 10.sp,
        fontWeight = FontWeight.Bold,
        modifier = Modifier.padding(horizontal = 6.dp, vertical = 5.dp),
    )
}

private fun taskPriorityColor(priority: String): Color = when (priority) {
    "Urgente" -> Color(0xFFE32636)
    "Alta" -> Color(0xFFFF7A1A)
    "Média" -> Color(0xFFFFB000)
    else -> Color(0xFF159B62)
}

private fun calendarVisibleTasks(tasks: List<PopTask>): List<PopTask> {
    val today = LocalDate.now()
    fun seriesKey(task: PopTask) = listOf(
        task.title.trim().lowercase(Locale("pt", "BR")),
        task.assignmentType,
        task.assignmentTargetId,
        task.recurrenceRule,
        task.recurrenceDetail,
        task.recurrenceInterval.toString(),
    ).joinToString("|")

    val firstFutureBySeries = tasks
        .asSequence()
        .filter { it.recurrenceRule != "Não repetir" }
        .mapNotNull { task ->
            val date = runCatching { LocalDate.parse(task.dueDate) }.getOrNull()
            if (date != null && date.isAfter(today)) seriesKey(task) to date else null
        }
        .groupBy({ it.first }, { it.second })
        .mapValues { (_, dates) -> dates.minOrNull() }

    return tasks.filter { task ->
        if (task.recurrenceRule == "Não repetir") return@filter true
        val date = runCatching { LocalDate.parse(task.dueDate) }.getOrNull() ?: return@filter true
        !date.isAfter(today) || firstFutureBySeries[seriesKey(task)] == date
    }
}

@Composable
private fun CalendarScreen(
    tasks: List<PopTask>,
    canCreateTask: Boolean,
    workSpace: WorkSpace,
    onWorkSpaceChange: (WorkSpace) -> Unit,
    companyNames: List<String>,
    companyDescriptions: List<String>,
    selectedCompanyIndex: Int,
    onCompanySelect: (Int) -> Unit,
    onCreateCompany: () -> Unit,
    onOpenMenu: () -> Unit,
    onOpenTask: (PopTask) -> Unit,
    onCreateTaskForDate: (LocalDate) -> Unit,
) {
    var month by remember { mutableStateOf(YearMonth.now()) }
    var selectedDate by remember { mutableStateOf(LocalDate.now()) }
    val locale = remember { Locale("pt", "BR") }
    val today = LocalDate.now()
    val visibleCalendarTasks = calendarVisibleTasks(tasks)
    val selectedDayTasks = visibleCalendarTasks.filter { task ->
        runCatching { LocalDate.parse(task.dueDate) }.getOrNull() == selectedDate
    }.sortedWith(compareByDescending<PopTask> { it.completed }.thenBy {
        when (it.priority) {
            "Urgente" -> 0
            "Alta" -> 1
            "Média" -> 2
            else -> 3
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
                companyDescriptions = companyDescriptions,
                selectedCompanyIndex = selectedCompanyIndex,
                onSelect = onWorkSpaceChange,
                onCompanySelect = onCompanySelect,
                onCreateCompany = onCreateCompany,
                onOpenMenu = onOpenMenu,
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
                tasks = visibleCalendarTasks,
                selectedDate = selectedDate,
                onDateSelected = { selectedDate = it },
                onDateDoubleSelected = if (canCreateTask) {
                    { date ->
                        selectedDate = date
                        onCreateTaskForDate(date)
                    }
                } else {
                    null
                },
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
                        val unavailableRecurrence = isFutureRecurrence(task, today)
                        Column {
                            TaskRow(
                                task,
                                onClick = if (unavailableRecurrence) null else ({ onOpenTask(task) }),
                            )
                            if (unavailableRecurrence) {
                                Text(
                                    "Disponível para concluir somente nesta data.",
                                    color = PopMuted,
                                    fontSize = 10.sp,
                                    modifier = Modifier.padding(bottom = 6.dp),
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
                    item {
                        CalendarTaskInfoRow(
                            Icons.Rounded.CalendarMonth,
                            "Data",
                            displayDueLabel(task) + task.dueTime.takeIf { it.isNotBlank() }?.let { ", $it" }.orEmpty(),
                            valueColor = if (isTaskOverdue(task)) taskPriorityColor("Urgente") else null,
                        )
                    }
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
                    if (task.createdBy.isNotBlank()) {
                        item { CalendarTaskInfoRow(Icons.Rounded.PersonOutline, "Criada por", task.createdBy) }
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
private fun CalendarTaskInfoRow(icon: ImageVector, label: String, value: String, valueColor: Color? = null) {
    val isUrgentPriority = label == "Prioridade" && value == "Urgente"
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                if (isUrgentPriority) taskPriorityColor("Urgente").copy(alpha = .14f) else PopSurfaceAlt,
                RoundedCornerShape(16.dp),
            )
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, null, tint = if (isUrgentPriority) taskPriorityColor("Urgente") else PopMuted, modifier = Modifier.size(21.dp))
        Spacer(Modifier.width(13.dp))
        Column(Modifier.weight(1f)) {
            Text(label, color = PopMuted, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
            Text(
                value,
                color = valueColor ?: if (isUrgentPriority) taskPriorityColor("Urgente") else PopText,
                fontSize = 13.sp,
                fontWeight = if (isUrgentPriority) FontWeight.ExtraBold else FontWeight.SemiBold,
            )
        }
    }
}

@Composable
private fun CalendarGrid(
    month: YearMonth,
    tasks: List<PopTask>,
    selectedDate: LocalDate,
    onDateSelected: (LocalDate) -> Unit,
    onDateDoubleSelected: ((LocalDate) -> Unit)? = null,
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
                                Modifier
                                    .size(38.dp)
                                    .clip(CircleShape)
                                    .pointerInput(date, onDateDoubleSelected) {
                                        val selectedDay = date ?: return@pointerInput
                                        detectTapGestures(
                                            onTap = { onDateSelected(selectedDay) },
                                            onDoubleTap = {
                                                onDateDoubleSelected?.invoke(selectedDay)
                                                    ?: onDateSelected(selectedDay)
                                            },
                                        )
                                    },
                                contentAlignment = Alignment.Center,
                            ) {
                                Canvas(Modifier.fillMaxSize()) {
                                    val pendingDayTasks = dayTasks.filterNot { it.completed }
                                    val completedDayTasks = dayTasks.filter { it.completed }
                                    val angleStep = 18f
                                    val maximumMarkers = (360f / angleStep).toInt()
                                    val visibleTasks =
                                        (pendingDayTasks + completedDayTasks).take(maximumMarkers)
                                    if (visibleTasks.isNotEmpty()) {
                                        val startAngle =
                                            90f - (angleStep * visibleTasks.lastIndex / 2f)
                                        val orbitRadius = size.minDimension / 2f - 2.4.dp.toPx()
                                        visibleTasks.forEachIndexed { index, task ->
                                            val angle =
                                                Math.toRadians((startAngle + angleStep * index).toDouble())
                                            val dotColor =
                                                if (task.completed) PopBlue else taskPriorityColor(task.priority)
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
                                        .clip(CircleShape),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Text(
                                        day.toString(),
                                        color = if (isToday || selected) PopBlue else PopText,
                                        fontSize = 12.sp,
                                        fontWeight = if (isToday || selected) FontWeight.Bold else FontWeight.Normal,
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
        Spacer(Modifier.height(10.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.padding(horizontal = 4.dp)) {
            PriorityLegend("Urgente", taskPriorityColor("Urgente"))
            PriorityLegend("Alta", taskPriorityColor("Alta"))
            PriorityLegend("Média", taskPriorityColor("Média"))
            PriorityLegend("Baixa", taskPriorityColor("Baixa"))
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
    googleAccount: GoogleAccount?,
    lightTheme: Boolean,
    onLightThemeChange: (Boolean) -> Unit,
    workSpace: WorkSpace,
    onWorkSpaceChange: (WorkSpace) -> Unit,
    companyNames: List<String>,
    companyDescriptions: List<String>,
    companyMembers: MutableList<CompanyMember>,
    companySectors: MutableList<CompanySector>,
    companyGroups: MutableList<CompanyGroup>,
    tasks: List<PopTask>,
    workspaceId: String,
    canManageEmployees: Boolean,
    canManageDepartments: Boolean,
    canManageGroups: Boolean,
    onWorkspacesReloaded: (List<ApiWorkspaceSummary>) -> Unit,
    selectedCompanyIndex: Int,
    onCompanySelect: (Int) -> Unit,
    onCreateCompany: () -> Unit,
    onOpenTask: (PopTask) -> Unit,
    onRequireLogin: () -> Unit,
    onSignOut: () -> Unit,
    onDismiss: () -> Unit,
) {
    val isGuest = sessionMode == SessionMode.Guest
    val context = LocalContext.current
    val managementScope = rememberCoroutineScope()
    var showThemeDialog by remember { mutableStateOf(false) }
    var activeManagementPage by remember { mutableStateOf<String?>(null) }
    var showSectorsDialog by remember { mutableStateOf(false) }
    var showGroupsDialog by remember { mutableStateOf(false) }
    var showEmployeeForm by remember { mutableStateOf(false) }
    var selectedMember by remember { mutableStateOf<CompanyMember?>(null) }
    var memberPendingRemoval by remember { mutableStateOf<CompanyMember?>(null) }
    var editingMemberSectorId by remember { mutableStateOf("") }
    var editingMemberGroupIds by remember { mutableStateOf(setOf<String>()) }
    var editingMemberRole by remember { mutableStateOf("Colaborador") }
    var memberName by remember { mutableStateOf("") }
    var memberEmail by remember { mutableStateOf("") }
    var memberRole by remember { mutableStateOf("Colaborador") }
    var memberSectorId by remember { mutableStateOf("") }
    var memberGroupIds by remember { mutableStateOf(setOf<String>()) }
    var sectorName by remember { mutableStateOf("") }
    var sectorDescription by remember { mutableStateOf("") }
    var groupName by remember { mutableStateOf("") }
    var groupDescription by remember { mutableStateOf("") }
    var savingManagementAction by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(activeManagementPage, companySectors.toList()) {
        if (activeManagementPage == "employees" && companySectors.none { it.id == memberSectorId }) {
            memberSectorId = companySectors.firstOrNull()?.id.orEmpty()
        }
    }

    fun submitManagementAction(
        action: String,
        payload: JSONObject,
        successMessage: String,
        afterSuccess: () -> Unit,
    ) {
        val token = googleAccount?.apiToken.orEmpty()
        if (token.isBlank() || workspaceId.isBlank() || savingManagementAction != null) return
        savingManagementAction = action
        managementScope.launch {
            runCatching {
                mutateMobileWorkspace(token, workspaceId, payload)
                loadMobileWorkspaces(token)
            }.onSuccess { workspaces ->
                onWorkspacesReloaded(workspaces)
                afterSuccess()
                Toast.makeText(context, successMessage, Toast.LENGTH_LONG).show()
            }.onFailure { error ->
                Toast.makeText(
                    context,
                    error.message ?: "Não foi possível salvar o cadastro.",
                    Toast.LENGTH_LONG,
                ).show()
            }
            savingManagementAction = null
        }
    }

    fun openWebPage(path: String) {
        context.startActivity(
            Intent(
                Intent.ACTION_VIEW,
                Uri.parse("https://app.poporganize.com.br$path"),
            ),
        )
    }

    if (activeManagementPage == "reports") {
        Dialog(
            onDismissRequest = { activeManagementPage = null },
            properties = DialogProperties(usePlatformDefaultWidth = false),
        ) {
            Surface(color = PopBackground, modifier = Modifier.fillMaxSize()) {
                MobileReportsPage(
                    companyName = companyNames.getOrElse(selectedCompanyIndex) { "Empresa" },
                    tasks = tasks,
                    companyMembers = companyMembers,
                    companySectors = companySectors,
                    companyGroups = companyGroups,
                    currentUserEmail = googleAccount?.email.orEmpty(),
                    currentUserPhotoUrl = googleAccount?.photoUrl.orEmpty(),
                    onBack = { activeManagementPage = null },
                    onOpenTask = { task ->
                        activeManagementPage = null
                        onOpenTask(task)
                    },
                )
            }
        }
    } else if (activeManagementPage == "employees") {
        Dialog(
            onDismissRequest = { activeManagementPage = null },
            properties = DialogProperties(usePlatformDefaultWidth = false),
        ) {
            Surface(
                color = PopBackground,
                modifier = Modifier.fillMaxSize(),
            ) {
                EmployeesManagementPage(
                    companyName = companyNames.getOrElse(selectedCompanyIndex) { "Empresa" },
                    companyMembers = companyMembers,
                    companySectors = companySectors,
                    companyGroups = companyGroups,
                    currentUserEmail = googleAccount?.email.orEmpty(),
                    currentUserPhotoUrl = googleAccount?.photoUrl.orEmpty(),
                    canManageEmployees = canManageEmployees,
                    onAdd = {
                        memberSectorId = companySectors.firstOrNull()?.id.orEmpty()
                        memberGroupIds = emptySet()
                        showEmployeeForm = true
                    },
                    onMemberClick = { member ->
                        editingMemberSectorId = member.sectorId.ifBlank {
                            companySectors.firstOrNull { it.name == member.sector }?.id.orEmpty()
                        }
                        editingMemberGroupIds = member.groupIds.toSet()
                        editingMemberRole = member.role
                        selectedMember = member
                    },
                    onBack = { activeManagementPage = null },
                )
            }
        }
    } else if (activeManagementPage == "sectors") {
        Dialog(
            onDismissRequest = { activeManagementPage = null },
            properties = DialogProperties(usePlatformDefaultWidth = false),
        ) {
            Surface(color = PopBackground, modifier = Modifier.fillMaxSize()) {
                ManagementOverviewPage(
                    title = "Setores",
                    subtitle = "${companyNames.getOrElse(selectedCompanyIndex) { "Empresa" }} • ${companySectors.size} cadastrados",
                    emptyMessage = "Nenhum setor cadastrado nesta empresa.",
                    items = companySectors.map { sector ->
                        ManagementOverviewEntry(
                            id = sector.id,
                            title = sector.name,
                            description = sector.description,
                            detail = "${companyMembers.count { it.sectorId == sector.id || it.sector == sector.name }} pessoas",
                        )
                    },
                    icon = Icons.Rounded.AccountTree,
                    canAdd = canManageDepartments,
                    addDescription = "Cadastrar setor",
                    onAdd = { showSectorsDialog = true },
                    onBack = { activeManagementPage = null },
                )
            }
        }
    } else if (activeManagementPage == "groups") {
        Dialog(
            onDismissRequest = { activeManagementPage = null },
            properties = DialogProperties(usePlatformDefaultWidth = false),
        ) {
            Surface(color = PopBackground, modifier = Modifier.fillMaxSize()) {
                ManagementOverviewPage(
                    title = "Grupos",
                    subtitle = "${companyNames.getOrElse(selectedCompanyIndex) { "Empresa" }} • ${companyGroups.size} cadastrados",
                    emptyMessage = "Nenhum grupo cadastrado nesta empresa.",
                    items = companyGroups.map { group ->
                        ManagementOverviewEntry(
                            id = group.id,
                            title = group.name,
                            description = group.description,
                            detail = "${group.memberIds.size} membros",
                        )
                    },
                    icon = Icons.Rounded.Groups,
                    canAdd = canManageGroups,
                    addDescription = "Cadastrar grupo",
                    onAdd = { showGroupsDialog = true },
                    onBack = { activeManagementPage = null },
                )
            }
        }
    } else {
        LazyColumn(
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(max = 530.dp),
            contentPadding = PaddingValues(bottom = 18.dp),
        ) {
            item {
                Surface(
                    color = PopSurface,
                    shape = RoundedCornerShape(0.dp),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Column(
                        modifier = Modifier.padding(horizontal = 20.dp, vertical = 22.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.Top,
                    ) {
                        Column(Modifier.weight(1f)) {
                            Text(
                                "Mais opções",
                                fontSize = 23.sp,
                                fontWeight = FontWeight.ExtraBold,
                            )
                            Spacer(Modifier.height(5.dp))
                            Text(
                                "Navegação e conta",
                                color = PopMuted,
                                fontSize = 13.sp,
                            )
                        }
                        IconButton(
                            onClick = onDismiss,
                            modifier = Modifier.size(32.dp),
                        ) {
                            Icon(
                                Icons.Rounded.Close,
                                "Fechar",
                                tint = PopMuted,
                                modifier = Modifier.size(19.dp),
                            )
                        }
                    }

                    if (!isGuest && workSpace == WorkSpace.Company && companyNames.isNotEmpty()) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            MoreShortcut(
                                icon = Icons.Rounded.Groups,
                                title = "Grupos",
                                onClick = { activeManagementPage = "groups" },
                                modifier = Modifier.weight(1f),
                            )
                            MoreShortcut(
                                icon = Icons.Rounded.AccountTree,
                                title = "Setores",
                                onClick = { activeManagementPage = "sectors" },
                                modifier = Modifier.weight(1f),
                            )
                            MoreShortcut(
                                icon = Icons.Rounded.BarChart,
                                title = "Relatórios",
                                onClick = { activeManagementPage = "reports" },
                                modifier = Modifier.weight(1f),
                            )
                        }
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            MoreShortcut(
                                icon = Icons.Rounded.Groups,
                                title = "Funcionários",
                                onClick = { activeManagementPage = "employees" },
                                modifier = Modifier.weight(1f),
                            )
                            MoreShortcut(
                                icon = Icons.Rounded.Business,
                                title = "Empresas",
                                onClick = {
                                    onCompanySelect(selectedCompanyIndex)
                                    onWorkSpaceChange(WorkSpace.Company)
                                },
                                modifier = Modifier.weight(1f),
                            )
                            MoreShortcut(
                                icon = Icons.Rounded.Shield,
                                title = "Permissões",
                                onClick = { openWebPage("/permissoes") },
                                modifier = Modifier.weight(1f),
                            )
                        }
                    }

                    HorizontalDivider(
                        color = PopMuted.copy(alpha = .16f),
                        modifier = Modifier.padding(vertical = 8.dp),
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        GoogleProfileAvatar(
                            photoUrl = googleAccount?.photoUrl,
                            modifier = Modifier.size(48.dp),
                            fallbackIcon = Icons.Rounded.PersonOutline,
                        )
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text(
                                when {
                                    isGuest -> "Modo sem conta"
                                    !googleAccount?.name.isNullOrBlank() -> googleAccount?.name.orEmpty()
                                    else -> "Conta conectada"
                                },
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                            Text(
                                when {
                                    isGuest -> "Seus dados ficam neste celular"
                                    !googleAccount?.email.isNullOrBlank() -> googleAccount?.email.orEmpty()
                                    else -> "Conta conectada"
                                },
                                color = PopMuted,
                                fontSize = 10.sp,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                        }
                        if (isGuest) {
                            TextButton(onClick = onRequireLogin) {
                                Text("Entrar", color = PopBlue, fontWeight = FontWeight.Bold)
                            }
                        } else {
                            IconButton(onClick = { showThemeDialog = true }) {
                                Icon(Icons.Rounded.Settings, "Configurações", tint = PopMuted)
                            }
                        }
                    }

                    if (isGuest) {
                        MoreAccountAction(
                            icon = Icons.Rounded.Settings,
                            label = if (lightTheme) "Tema claro" else "Tema escuro",
                            onClick = { showThemeDialog = true },
                        )
                    } else {
                        MoreAccountAction(
                            icon = Icons.Rounded.Logout,
                            label = "Sair",
                            accent = Color(0xFFE5484D),
                            onClick = onSignOut,
                        )
                    }
                    }
                }
            }
        }
    }

    if (showEmployeeForm) {
        val validInvite =
            memberName.trim().length >= 2 &&
                android.util.Patterns.EMAIL_ADDRESS.matcher(memberEmail.trim()).matches() &&
                memberRole.trim().length >= 2 &&
                memberSectorId.isNotBlank()
        AlertDialog(
            onDismissRequest = {
                if (savingManagementAction == null) showEmployeeForm = false
            },
            title = { Text("Cadastrar funcionário", fontWeight = FontWeight.ExtraBold) },
            text = {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 560.dp)
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    Text(
                        "A pessoa receberá um convite por e-mail para entrar na empresa.",
                        color = PopMuted,
                        fontSize = 11.sp,
                    )
                    ManagementField(memberName, { memberName = it }, "Nome")
                    ManagementField(memberEmail, { memberEmail = it }, "E-mail")
                    ManagementChoiceField(
                        label = "Função",
                        value = memberRole,
                        options = listOf(
                            "Colaborador" to "Colaborador",
                            "Funcionário" to "Funcionário",
                            "Gestor" to "Gestor",
                        ),
                        onSelect = { memberRole = it },
                    )
                    ManagementChoiceField(
                        label = "Setor",
                        value = companySectors.firstOrNull { it.id == memberSectorId }?.name.orEmpty(),
                        options = companySectors.map { it.id to it.name },
                        onSelect = { memberSectorId = it },
                    )
                    if (companyGroups.isNotEmpty()) {
                        Text("Grupos", color = PopMuted, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                            items(companyGroups, key = { it.id }) { group ->
                                ChoicePill(group.name, group.id in memberGroupIds) {
                                    memberGroupIds =
                                        if (group.id in memberGroupIds) {
                                            memberGroupIds - group.id
                                        } else {
                                            memberGroupIds + group.id
                                        }
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(
                    enabled = validInvite && savingManagementAction == null,
                    onClick = {
                        submitManagementAction(
                            action = "inviteEmployee",
                            payload = JSONObject()
                                .put("action", "inviteEmployee")
                                .put("name", memberName.trim())
                                .put("email", memberEmail.trim())
                                .put("role", memberRole.trim())
                                .put("departmentId", memberSectorId)
                                .put("groupIds", JSONArray(memberGroupIds.toList())),
                            successMessage = "Convite enviado por e-mail.",
                        ) {
                            memberName = ""
                            memberEmail = ""
                            memberRole = "Colaborador"
                            memberGroupIds = emptySet()
                            showEmployeeForm = false
                        }
                    },
                ) {
                    if (savingManagementAction == "inviteEmployee") {
                        CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                        Spacer(Modifier.width(7.dp))
                    }
                    Text("Enviar convite", color = PopBlue, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(
                    enabled = savingManagementAction == null,
                    onClick = { showEmployeeForm = false },
                ) {
                    Text("Cancelar", color = PopMuted)
                }
            },
            shape = RoundedCornerShape(26.dp),
            containerColor = PopSurface,
        )
    }

    selectedMember?.let { member ->
        AlertDialog(
            onDismissRequest = {
                if (savingManagementAction == null) selectedMember = null
            },
            title = {
                Column {
                    Text(member.name, fontWeight = FontWeight.ExtraBold)
                    Text(
                        if (member.pending) "Convite pendente" else member.email,
                        color = if (member.pending) Color(0xFFE27B00) else PopMuted,
                        fontSize = 11.sp,
                    )
                }
            },
            text = {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 520.dp)
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    GoogleProfileAvatar(
                        photoUrl = member.photoUrl.ifBlank {
                            googleAccount?.photoUrl
                                ?.takeIf { member.email.equals(googleAccount.email, ignoreCase = true) }
                                .orEmpty()
                        },
                        modifier = Modifier.size(64.dp).align(Alignment.CenterHorizontally),
                        fallbackIcon = Icons.Rounded.PersonOutline,
                    )
                    ManagementChoiceField(
                        label = "Função",
                        value = editingMemberRole,
                        options = listOf(
                            "Colaborador" to "Colaborador",
                            "Funcionário" to "Funcionário",
                            "Gestor" to "Gestor",
                        ).let { options ->
                            if (options.any { it.first == editingMemberRole }) {
                                options
                            } else {
                                listOf(editingMemberRole to editingMemberRole) + options
                            }
                        },
                        onSelect = { editingMemberRole = it },
                    )
                    ManagementChoiceField(
                        label = "Setor",
                        value = companySectors
                            .firstOrNull { it.id == editingMemberSectorId }
                            ?.name
                            .orEmpty(),
                        options = companySectors.map { it.id to it.name },
                        onSelect = { editingMemberSectorId = it },
                    )
                    if (companyGroups.isNotEmpty()) {
                        Text("Grupos", color = PopMuted, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        companyGroups.forEach { group ->
                            ChoicePill(group.name, group.id in editingMemberGroupIds) {
                                editingMemberGroupIds =
                                    if (group.id in editingMemberGroupIds) {
                                        editingMemberGroupIds - group.id
                                    } else {
                                        editingMemberGroupIds + group.id
                                    }
                            }
                        }
                    }
                    if (member.pending) {
                        Surface(
                            color = Color(0xFFFFA726).copy(alpha = .14f),
                            shape = RoundedCornerShape(14.dp),
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Text(
                                "Esta pessoa ainda não aceitou o convite.",
                                color = Color(0xFFE27B00),
                                fontSize = 11.sp,
                                modifier = Modifier.padding(12.dp),
                            )
                        }
                    }
                }
            },
            confirmButton = {
                Row {
                    TextButton(
                        enabled = savingManagementAction == null,
                        onClick = { selectedMember = null },
                    ) {
                        Text("Fechar", color = PopMuted)
                    }
                    if (member.pending) {
                        TextButton(
                            enabled = savingManagementAction == null,
                            onClick = {
                                submitManagementAction(
                                    action = "resendInvitation",
                                    payload = JSONObject()
                                        .put("action", "resendInvitation")
                                        .put("invitationId", member.id),
                                    successMessage = "Convite reenviado por e-mail.",
                                ) {
                                    selectedMember = null
                                }
                            },
                        ) {
                            Text("Reenviar", color = Color(0xFFE27B00), fontWeight = FontWeight.Bold)
                        }
                    }
                    TextButton(
                        enabled = editingMemberSectorId.isNotBlank() && savingManagementAction == null,
                        onClick = {
                            submitManagementAction(
                                action = "updateEmployee",
                                payload = JSONObject()
                                    .put("action", "updateEmployee")
                                    .put("employeeId", member.id)
                                    .put("departmentId", editingMemberSectorId)
                                    .put("role", editingMemberRole)
                                    .put("groupIds", JSONArray(editingMemberGroupIds.toList())),
                                successMessage = "Funcionário atualizado.",
                            ) {
                                selectedMember = null
                            }
                        },
                    ) {
                        Text("Salvar", color = PopBlue, fontWeight = FontWeight.Bold)
                    }
                }
            },
            dismissButton = {
                if (!member.email.equals(googleAccount?.email, ignoreCase = true)) {
                    TextButton(
                        enabled = savingManagementAction == null,
                        onClick = {
                            memberPendingRemoval = member
                            selectedMember = null
                        },
                    ) {
                        Text(
                            if (member.pending) "Cancelar convite" else "Desvincular",
                            color = Color(0xFFE5484D),
                            fontWeight = FontWeight.Bold,
                        )
                    }
                }
            },
            shape = RoundedCornerShape(26.dp),
            containerColor = PopSurface,
        )
    }

    memberPendingRemoval?.let { member ->
        AlertDialog(
            onDismissRequest = {
                if (savingManagementAction == null) memberPendingRemoval = null
            },
            title = {
                Text(
                    if (member.pending) "Cancelar convite?" else "Desvincular colaborador?",
                    fontWeight = FontWeight.ExtraBold,
                )
            },
            text = {
                Text(
                    if (member.pending) {
                        "O convite de ${member.name} será cancelado."
                    } else {
                        "${member.name} perderá o acesso à empresa. As tarefas existentes serão mantidas."
                    },
                    color = PopMuted,
                )
            },
            confirmButton = {
                TextButton(
                    enabled = savingManagementAction == null,
                    onClick = {
                        submitManagementAction(
                            action = "removeEmployee",
                            payload = JSONObject()
                                .put("action", "removeEmployee")
                                .put("employeeId", member.id),
                            successMessage =
                                if (member.pending) "Convite cancelado." else "Colaborador desvinculado.",
                        ) {
                            memberPendingRemoval = null
                        }
                    },
                ) {
                    if (savingManagementAction == "removeEmployee") {
                        CircularProgressIndicator(
                            modifier = Modifier.size(16.dp),
                            strokeWidth = 2.dp,
                            color = Color(0xFFE5484D),
                        )
                        Spacer(Modifier.width(7.dp))
                    }
                    Text(
                        if (member.pending) "Cancelar convite" else "Desvincular",
                        color = Color(0xFFE5484D),
                        fontWeight = FontWeight.Bold,
                    )
                }
            },
            dismissButton = {
                TextButton(
                    enabled = savingManagementAction == null,
                    onClick = {
                        memberPendingRemoval = null
                        selectedMember = member
                    },
                ) {
                    Text("Voltar", color = PopMuted)
                }
            },
            shape = RoundedCornerShape(26.dp),
            containerColor = PopSurface,
        )
    }

    if (showThemeDialog) {
        AlertDialog(
            onDismissRequest = { showThemeDialog = false },
            title = { Text("Aparência", fontWeight = FontWeight.ExtraBold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    ThemeChoice(
                        title = "Tema claro",
                        subtitle = "Fundo branco e superfícies claras",
                        icon = Icons.Rounded.LightMode,
                        selected = lightTheme,
                        onClick = {
                            onLightThemeChange(true)
                            showThemeDialog = false
                        },
                    )
                    ThemeChoice(
                        title = "Tema escuro",
                        subtitle = "Visual atual com fundo escuro",
                        icon = Icons.Rounded.DarkMode,
                        selected = !lightTheme,
                        onClick = {
                            onLightThemeChange(false)
                            showThemeDialog = false
                        },
                    )
                }
            },
            confirmButton = {},
            dismissButton = {
                TextButton(onClick = { showThemeDialog = false }) { Text("Cancelar") }
            },
            shape = RoundedCornerShape(26.dp),
            containerColor = PopSurface,
        )
    }

    if (showSectorsDialog && workSpace == WorkSpace.Company) {
        AlertDialog(
            onDismissRequest = { showSectorsDialog = false },
            title = { Text("Cadastrar setor", fontWeight = FontWeight.ExtraBold) },
            text = {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    Text(
                        "Organize os colaboradores e as tarefas por área da empresa.",
                        color = PopMuted,
                        fontSize = 11.sp,
                    )
                    ManagementField(sectorName, { sectorName = it }, "Nome")
                    ManagementField(sectorDescription, { sectorDescription = it }, "Descrição")
                }
            },
            confirmButton = {
                TextButton(
                    enabled =
                        savingManagementAction == null &&
                            sectorName.trim().length >= 2 &&
                            sectorDescription.trim().length >= 3,
                    onClick = {
                        submitManagementAction(
                            action = "createDepartment",
                            payload = JSONObject()
                                .put("action", "createDepartment")
                                .put("name", sectorName.trim())
                                .put("description", sectorDescription.trim()),
                            successMessage = "Setor cadastrado.",
                        ) {
                            sectorName = ""
                            sectorDescription = ""
                            showSectorsDialog = false
                        }
                    },
                ) {
                    if (savingManagementAction == "createDepartment") {
                        CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                        Spacer(Modifier.width(8.dp))
                    }
                    Text("Cadastrar", color = PopBlue, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showSectorsDialog = false }) {
                    Text("Cancelar", color = PopMuted)
                }
            },
            shape = RoundedCornerShape(26.dp),
            containerColor = PopSurface,
        )
    }

    if (showGroupsDialog && workSpace == WorkSpace.Company) {
        AlertDialog(
            onDismissRequest = { showGroupsDialog = false },
            title = { Text("Cadastrar grupo", fontWeight = FontWeight.ExtraBold) },
            text = {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    Text(
                        "Crie uma equipe que pode reunir pessoas de diferentes setores.",
                        color = PopMuted,
                        fontSize = 11.sp,
                    )
                    ManagementField(groupName, { groupName = it }, "Nome")
                    ManagementField(groupDescription, { groupDescription = it }, "Descrição")
                }
            },
            confirmButton = {
                TextButton(
                    enabled =
                        savingManagementAction == null &&
                            groupName.trim().length >= 2 &&
                            groupDescription.trim().length >= 3,
                    onClick = {
                        submitManagementAction(
                            action = "createGroup",
                            payload = JSONObject()
                                .put("action", "createGroup")
                                .put("name", groupName.trim())
                                .put("description", groupDescription.trim()),
                            successMessage = "Grupo cadastrado.",
                        ) {
                            groupName = ""
                            groupDescription = ""
                            showGroupsDialog = false
                        }
                    },
                ) {
                    if (savingManagementAction == "createGroup") {
                        CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                        Spacer(Modifier.width(8.dp))
                    }
                    Text("Cadastrar", color = PopBlue, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showGroupsDialog = false }) {
                    Text("Cancelar", color = PopMuted)
                }
            },
            shape = RoundedCornerShape(26.dp),
            containerColor = PopSurface,
        )
    }
}

private data class UserReportStats(
    val member: CompanyMember,
    val total: Int,
    val completed: Int,
    val pending: Int,
    val overdue: Int,
    val dueToday: Int,
)

private data class TargetReportStats(
    val id: String,
    val name: String,
    val total: Int,
    val completed: Int,
    val unassigned: Int,
)

private fun PopTask.hasResponsible(): Boolean =
    assignees.any { it.isNotBlank() && !it.equals("Sem responsável", ignoreCase = true) } ||
        assignee
            .split(",")
            .any { it.trim().isNotBlank() && !it.trim().equals("Sem responsável", ignoreCase = true) }

private fun PopTask.isAssignedTo(memberName: String): Boolean =
    assignees.any { it.equals(memberName, ignoreCase = true) } ||
        assignee.split(",").any { it.trim().equals(memberName, ignoreCase = true) }

@Composable
private fun MobileReportsPage(
    companyName: String,
    tasks: List<PopTask>,
    companyMembers: List<CompanyMember>,
    companySectors: List<CompanySector>,
    companyGroups: List<CompanyGroup>,
    currentUserEmail: String,
    currentUserPhotoUrl: String,
    onBack: () -> Unit,
    onOpenTask: (PopTask) -> Unit,
) {
    val today = LocalDate.now()
    val reportTasks = tasks.filterNot { isFutureRecurrence(it, today) }
    var taskListOpen by remember { mutableStateOf(false) }
    var selectedTaskFilter by remember { mutableStateOf("Todas") }
    var selectedReportMember by remember { mutableStateOf<CompanyMember?>(null) }
    val completed = reportTasks.count { it.completed }
    val pending = reportTasks.count { !it.completed }
    val overdue = reportTasks.count { task ->
        !task.completed && runCatching { LocalDate.parse(task.dueDate) }.getOrNull()?.isBefore(today) == true
    }
    val dueToday = reportTasks.count { task ->
        !task.completed && runCatching { LocalDate.parse(task.dueDate) }.getOrNull() == today
    }
    val assigned = reportTasks.count { it.hasResponsible() }
    val unassigned = reportTasks.size - assigned
    val sectorStats = companySectors.map { sector ->
        val sectorTasks = reportTasks.filter {
            it.assignmentType == "department" &&
                (it.assignmentTargetId == sector.id || it.assignmentTargetLabel == sector.name)
        }
        TargetReportStats(
            id = sector.id,
            name = sector.name,
            total = sectorTasks.size,
            completed = sectorTasks.count { it.completed },
            unassigned = sectorTasks.count { !it.hasResponsible() },
        )
    }.sortedByDescending { it.total }
    val groupStats = companyGroups.map { group ->
        val groupTasks = reportTasks.filter {
            it.assignmentType == "group" &&
                (it.assignmentTargetId == group.id || it.assignmentTargetLabel == group.name)
        }
        TargetReportStats(
            id = group.id,
            name = group.name,
            total = groupTasks.size,
            completed = groupTasks.count { it.completed },
            unassigned = groupTasks.count { !it.hasResponsible() },
        )
    }.sortedByDescending { it.total }
    val userStats = companyMembers
        .filterNot { it.pending }
        .map { member ->
            val memberTasks = reportTasks.filter { it.isAssignedTo(member.name) }
            UserReportStats(
                member = member,
                total = memberTasks.size,
                completed = memberTasks.count { it.completed },
                pending = memberTasks.count { !it.completed },
                overdue = memberTasks.count { task ->
                    !task.completed &&
                        runCatching { LocalDate.parse(task.dueDate) }
                            .getOrNull()
                            ?.isBefore(today) == true
                },
                dueToday = memberTasks.count { task ->
                    !task.completed &&
                        runCatching { LocalDate.parse(task.dueDate) }.getOrNull() == today
                },
            )
        }
        .sortedWith(compareByDescending<UserReportStats> { it.total }.thenBy { it.member.name })

    fun openTaskList(filter: String, member: CompanyMember? = null) {
        selectedTaskFilter = filter
        selectedReportMember = member
        taskListOpen = true
    }

    if (taskListOpen) {
        ReportTasksPage(
            companyName = companyName,
            tasks = reportTasks,
            member = selectedReportMember,
            selectedFilter = selectedTaskFilter,
            onFilterChange = { selectedTaskFilter = it },
            onBack = { taskListOpen = false },
            onOpenTask = onOpenTask,
        )
        return
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 20.dp, end = 20.dp, bottom = 36.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth().padding(top = 12.dp, bottom = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                IconButton(onClick = onBack, modifier = Modifier.size(42.dp)) {
                    Icon(Icons.Rounded.ArrowBack, "Voltar", tint = PopText)
                }
                Spacer(Modifier.width(6.dp))
                Column(Modifier.weight(1f)) {
                    Text("Relatórios", fontSize = 22.sp, fontWeight = FontWeight.ExtraBold)
                    Text(
                        "$companyName • visão da equipe",
                        color = PopMuted,
                        fontSize = 11.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
        }

        item {
            Text("Geral", color = PopText, fontSize = 17.sp, fontWeight = FontWeight.ExtraBold)
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth().height(126.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                MetricCard(
                    label = "Total",
                    value = reportTasks.size,
                    total = reportTasks.size,
                    tint = PopBlue,
                    showProgress = false,
                    modifier = Modifier.weight(1f).clickable { openTaskList("Todas") },
                )
                MetricCard(
                    label = "Concluídas",
                    value = completed,
                    total = reportTasks.size,
                    tint = Color(0xFF2EAF6D),
                    showProgress = true,
                    modifier = Modifier.weight(1f).clickable { openTaskList("Concluídas") },
                )
            }
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth().height(126.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                MetricCard(
                    label = "Pendentes",
                    value = pending,
                    total = reportTasks.size,
                    tint = Color(0xFFE49A28),
                    showProgress = true,
                    modifier = Modifier.weight(1f).clickable { openTaskList("Pendentes") },
                )
                MetricCard(
                    label = "Atrasadas",
                    value = overdue,
                    total = reportTasks.size,
                    tint = Color(0xFFE5484D),
                    showProgress = true,
                    modifier = Modifier.weight(1f).clickable { openTaskList("Atrasadas") },
                )
            }
        }

        item {
            Surface(
                color = PopSurface,
                shape = RoundedCornerShape(20.dp),
                modifier = Modifier.fillMaxWidth().clickable { openTaskList("Hoje") },
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(
                        modifier = Modifier
                            .size(44.dp)
                            .background(PopBlueSoft, RoundedCornerShape(14.dp)),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(Icons.Rounded.AccessTime, null, tint = PopBlue)
                    }
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text("Para hoje", color = PopMuted, fontSize = 11.sp)
                        Text(
                            "$dueToday ${if (dueToday == 1) "tarefa" else "tarefas"}",
                            color = PopText,
                            fontSize = 18.sp,
                            fontWeight = FontWeight.ExtraBold,
                        )
                    }
                    val completionRate =
                        if (reportTasks.isEmpty()) 0 else completed * 100 / reportTasks.size
                    Column(horizontalAlignment = Alignment.End) {
                        Text("Conclusão", color = PopMuted, fontSize = 10.sp)
                        Text(
                            "$completionRate%",
                            color = Color(0xFF2EAF6D),
                            fontSize = 18.sp,
                            fontWeight = FontWeight.ExtraBold,
                        )
                    }
                }
            }
        }

        item {
            CompactTargetReportSection(
                title = "Por setor",
                subtitle = "Atividades organizadas por setor",
                stats = sectorStats,
                icon = Icons.Rounded.AccountTree,
                emptyMessage = "Nenhum setor cadastrado nesta empresa.",
            )
        }

        item {
            CompactTargetReportSection(
                title = "Por grupo",
                subtitle = "Atividades organizadas por grupo",
                stats = groupStats,
                icon = Icons.Rounded.Groups,
                emptyMessage = "Nenhum grupo cadastrado nesta empresa.",
            )
        }

        item {
            Column(Modifier.padding(top = 10.dp, bottom = 2.dp)) {
                Text("Responsabilidade", color = PopText, fontSize = 17.sp, fontWeight = FontWeight.ExtraBold)
                Text("Quem está responsável e o que ainda está sem responsável", color = PopMuted, fontSize = 11.sp)
            }
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth().height(126.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                MetricCard(
                    label = "Com responsável",
                    value = assigned,
                    total = reportTasks.size,
                    tint = Color(0xFF2EAF6D),
                    showProgress = true,
                    modifier = Modifier.weight(1f),
                )
                MetricCard(
                    label = "Sem responsável",
                    value = unassigned,
                    total = reportTasks.size,
                    tint = Color(0xFFE49A28),
                    showProgress = true,
                    modifier = Modifier.weight(1f),
                )
            }
        }

        item {
            Column(Modifier.padding(top = 10.dp, bottom = 2.dp)) {
                Text(
                    "Por usuário",
                    color = PopText,
                    fontSize = 17.sp,
                    fontWeight = FontWeight.ExtraBold,
                )
                Text(
                    "Totais e situação das tarefas de cada pessoa",
                    color = PopMuted,
                    fontSize = 11.sp,
                )
            }
        }

        if (userStats.isEmpty()) {
            item {
                Surface(
                    color = PopSurfaceAlt,
                    shape = RoundedCornerShape(18.dp),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(
                        "Nenhum usuário ativo nesta empresa.",
                        color = PopMuted,
                        fontSize = 12.sp,
                        modifier = Modifier.padding(16.dp),
                    )
                }
            }
        } else {
            items(userStats, key = { it.member.id }) { stats ->
                UserReportCard(
                    stats = stats,
                    currentUserEmail = currentUserEmail,
                    currentUserPhotoUrl = currentUserPhotoUrl,
                    onClick = { openTaskList("Todas", stats.member) },
                )
            }
        }
    }
}

@Composable
private fun CompactTargetReportSection(
    title: String,
    subtitle: String,
    stats: List<TargetReportStats>,
    icon: ImageVector,
    emptyMessage: String,
) {
    Surface(
        color = PopSurface,
        shape = RoundedCornerShape(20.dp),
        border = BorderStroke(1.dp, PopBorder.copy(alpha = .7f)),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(horizontal = 15.dp, vertical = 14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(bottom = 8.dp)) {
                Box(
                    modifier = Modifier.size(36.dp).background(PopBlueSoft, RoundedCornerShape(12.dp)),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(icon, null, tint = PopBlue, modifier = Modifier.size(18.dp))
                }
                Spacer(Modifier.width(10.dp))
                Column(Modifier.weight(1f)) {
                    Text(title, color = PopText, fontSize = 15.sp, fontWeight = FontWeight.ExtraBold)
                    Text(subtitle, color = PopMuted, fontSize = 10.sp)
                }
            }
            if (stats.isEmpty()) {
                Text(emptyMessage, color = PopMuted, fontSize = 11.sp, modifier = Modifier.padding(vertical = 10.dp))
            } else {
                stats.forEachIndexed { index, item ->
                    if (index > 0) HorizontalDivider(color = PopBorder.copy(alpha = .55f))
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 9.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(Modifier.weight(1f)) {
                            Text(
                                item.name,
                                color = PopText,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                            Text(
                                "${item.completed} concluídas • ${item.unassigned} sem responsável",
                                color = PopMuted,
                                fontSize = 9.sp,
                            )
                        }
                        Text(
                            item.total.toString(),
                            color = PopBlue,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.ExtraBold,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun UserReportCard(
    stats: UserReportStats,
    currentUserEmail: String,
    currentUserPhotoUrl: String,
    onClick: () -> Unit,
) {
    val rate = if (stats.total == 0) 0f else stats.completed.toFloat() / stats.total
    Surface(
        color = PopSurface,
        shape = RoundedCornerShape(20.dp),
        border = BorderStroke(1.dp, PopBorder.copy(alpha = .7f)),
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
    ) {
        Column(Modifier.padding(15.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                GoogleProfileAvatar(
                    photoUrl = stats.member.photoUrl.ifBlank {
                        currentUserPhotoUrl.takeIf {
                            stats.member.email.equals(currentUserEmail, ignoreCase = true)
                        }.orEmpty()
                    },
                    modifier = Modifier.size(44.dp),
                    fallbackIcon = Icons.Rounded.PersonOutline,
                )
                Spacer(Modifier.width(11.dp))
                Column(Modifier.weight(1f)) {
                    Text(
                        stats.member.name,
                        color = PopText,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        listOf(stats.member.role, stats.member.sector)
                            .filter(String::isNotBlank)
                            .joinToString(" • "),
                        color = PopMuted,
                        fontSize = 10.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                Text(
                    "${stats.total} total",
                    color = PopBlue,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.ExtraBold,
                )
            }

            Spacer(Modifier.height(14.dp))
            LinearProgressIndicator(
                progress = { rate },
                modifier = Modifier.fillMaxWidth().height(6.dp).clip(CircleShape),
                color = Color(0xFF2EAF6D),
                trackColor = PopBorder.copy(alpha = .45f),
                drawStopIndicator = {},
            )
            Spacer(Modifier.height(12.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                UserReportValue("Concluídas", stats.completed, Color(0xFF2EAF6D))
                UserReportValue("Pendentes", stats.pending, Color(0xFFE49A28))
                UserReportValue("Atrasadas", stats.overdue, Color(0xFFE5484D))
                UserReportValue("Hoje", stats.dueToday, PopBlue)
            }
        }
    }
}

@Composable
private fun UserReportValue(label: String, value: Int, color: Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value.toString(), color = color, fontSize = 17.sp, fontWeight = FontWeight.ExtraBold)
        Text(label, color = PopMuted, fontSize = 9.sp)
    }
}

private fun reportTaskMatchesFilter(task: PopTask, filter: String, today: LocalDate): Boolean {
    val dueDate = runCatching { LocalDate.parse(task.dueDate) }.getOrNull()
    return when (filter) {
        "Concluídas" -> task.completed
        "Pendentes" -> !task.completed
        "Atrasadas" -> !task.completed && dueDate?.isBefore(today) == true
        "Hoje" -> !task.completed && dueDate == today
        else -> true
    }
}

@Composable
private fun ReportTasksPage(
    companyName: String,
    tasks: List<PopTask>,
    member: CompanyMember?,
    selectedFilter: String,
    onFilterChange: (String) -> Unit,
    onBack: () -> Unit,
    onOpenTask: (PopTask) -> Unit,
) {
    val today = LocalDate.now()
    val scopedTasks = if (member == null) {
        tasks
    } else {
        tasks.filter { it.isAssignedTo(member.name) }
    }
    val filters = listOf("Todas", "Concluídas", "Pendentes", "Atrasadas", "Hoje")
    val filteredTasks = scopedTasks
        .filter { reportTaskMatchesFilter(it, selectedFilter, today) }
        .sortedWith(
            compareBy<PopTask> { it.completed }
                .thenBy { runCatching { LocalDate.parse(it.dueDate) }.getOrNull() },
        )

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(bottom = 36.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(start = 12.dp, end = 20.dp, top = 12.dp, bottom = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                IconButton(onClick = onBack, modifier = Modifier.size(42.dp)) {
                    Icon(Icons.Rounded.ArrowBack, "Voltar", tint = PopText)
                }
                Spacer(Modifier.width(6.dp))
                Column(Modifier.weight(1f)) {
                    Text(
                        member?.name ?: "Todas as tarefas",
                        color = PopText,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.ExtraBold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        if (member == null) companyName else "$companyName • ${member.role}",
                        color = PopMuted,
                        fontSize = 11.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
        }

        item {
            LazyRow(
                contentPadding = PaddingValues(horizontal = 20.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                items(filters) { filter ->
                    val count = scopedTasks.count { reportTaskMatchesFilter(it, filter, today) }
                    ReportFilterChip(
                        label = filter,
                        count = count,
                        selected = selectedFilter == filter,
                        onClick = { onFilterChange(filter) },
                    )
                }
            }
        }

        item {
            Text(
                "${filteredTasks.size} ${if (filteredTasks.size == 1) "tarefa" else "tarefas"}",
                color = PopMuted,
                fontSize = 11.sp,
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 4.dp),
            )
        }

        if (filteredTasks.isEmpty()) {
            item {
                Surface(
                    color = PopSurfaceAlt,
                    shape = RoundedCornerShape(18.dp),
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
                ) {
                    Column(
                        modifier = Modifier.padding(22.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Icon(
                            Icons.Rounded.TaskAlt,
                            null,
                            tint = PopMuted,
                            modifier = Modifier.size(30.dp),
                        )
                        Spacer(Modifier.height(8.dp))
                        Text(
                            "Nenhuma tarefa neste filtro.",
                            color = PopMuted,
                            fontSize = 12.sp,
                        )
                    }
                }
            }
        } else {
            items(
                items = filteredTasks,
                key = { "${it.serverId}:${it.id}" },
            ) { task ->
                ReportTaskCard(
                    task = task,
                    showAssignee = member == null,
                    onClick = { onOpenTask(task) },
                    modifier = Modifier.padding(horizontal = 20.dp),
                )
            }
        }
    }
}

@Composable
private fun ReportFilterChip(
    label: String,
    count: Int,
    selected: Boolean,
    onClick: () -> Unit,
) {
    Surface(
        onClick = onClick,
        color = if (selected) PopBlue else PopSurfaceAlt,
        contentColor = if (selected) Color.White else PopText,
        shape = RoundedCornerShape(14.dp),
    ) {
        Text(
            "$label  $count",
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(horizontal = 13.dp, vertical = 9.dp),
        )
    }
}

@Composable
private fun ReportTaskCard(
    task: PopTask,
    showAssignee: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val today = LocalDate.now()
    val dueDate = runCatching { LocalDate.parse(task.dueDate) }.getOrNull()
    val isOverdue = !task.completed && dueDate?.isBefore(today) == true
    val isToday = !task.completed && dueDate == today
    val statusLabel = when {
        task.completed -> "Concluída"
        isOverdue -> "Atrasada"
        isToday -> "Hoje"
        else -> "Pendente"
    }
    val statusColor = when {
        task.completed -> Color(0xFF2EAF6D)
        isOverdue -> Color(0xFFE5484D)
        isToday -> PopBlue
        else -> Color(0xFFE49A28)
    }

    Surface(
        onClick = onClick,
        color = PopSurface,
        shape = RoundedCornerShape(19.dp),
        border = BorderStroke(1.dp, PopBorder.copy(alpha = .65f)),
        modifier = modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(14.dp)) {
            Row(verticalAlignment = Alignment.Top) {
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .background(statusColor.copy(alpha = .14f), RoundedCornerShape(12.dp)),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        if (task.completed) Icons.Rounded.CheckCircle else Icons.Rounded.PendingActions,
                        null,
                        tint = statusColor,
                        modifier = Modifier.size(20.dp),
                    )
                }
                Spacer(Modifier.width(11.dp))
                Column(Modifier.weight(1f)) {
                    Text(
                        task.title,
                        color = PopText,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        task.department.ifBlank { "Sem setor" },
                        color = PopMuted,
                        fontSize = 10.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    if (showAssignee) {
                        Text(
                            "Responsável: ${task.assignee.ifBlank { "Sem responsável" }}",
                            color = PopMuted,
                            fontSize = 10.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                }
                Surface(
                    color = statusColor.copy(alpha = .14f),
                    shape = RoundedCornerShape(9.dp),
                ) {
                    Text(
                        statusLabel,
                        color = statusColor,
                        fontSize = 9.sp,
                        fontWeight = FontWeight.ExtraBold,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 5.dp),
                    )
                }
            }
            if (task.description.isNotBlank()) {
                Spacer(Modifier.height(9.dp))
                Text(
                    task.description,
                    color = PopMuted,
                    fontSize = 10.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            Spacer(Modifier.height(11.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Rounded.CalendarMonth,
                    null,
                    tint = PopMuted,
                    modifier = Modifier.size(14.dp),
                )
                Spacer(Modifier.width(5.dp))
                Text(displayDueLabel(task), color = PopMuted, fontSize = 10.sp)
                Spacer(Modifier.weight(1f))
                PriorityPill(task.priority)
            }
            HorizontalDivider(
                color = PopBorder.copy(alpha = .55f),
                modifier = Modifier.padding(top = 12.dp, bottom = 9.dp),
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    "Ver detalhes e ações",
                    color = PopBlue,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.weight(1f),
                )
                Icon(
                    Icons.Rounded.ArrowForward,
                    null,
                    tint = PopBlue,
                    modifier = Modifier.size(16.dp),
                )
            }
        }
    }
}

private data class ManagementOverviewEntry(
    val id: String,
    val title: String,
    val description: String,
    val detail: String,
)

@Composable
private fun ManagementOverviewPage(
    title: String,
    subtitle: String,
    emptyMessage: String,
    items: List<ManagementOverviewEntry>,
    icon: ImageVector,
    canAdd: Boolean,
    addDescription: String,
    onAdd: () -> Unit,
    onBack: () -> Unit,
) {
    Box(Modifier.fillMaxSize()) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 20.dp, end = 20.dp, bottom = 110.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            item {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(top = 12.dp, bottom = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    IconButton(onClick = onBack, modifier = Modifier.size(42.dp)) {
                        Icon(Icons.Rounded.ArrowBack, "Voltar", tint = PopText)
                    }
                    Spacer(Modifier.width(6.dp))
                    Column(Modifier.weight(1f)) {
                        Text(title, fontSize = 22.sp, fontWeight = FontWeight.ExtraBold)
                        Text(
                            subtitle,
                            color = PopMuted,
                            fontSize = 11.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                }
            }

            if (items.isEmpty()) {
                item {
                    Surface(
                        color = PopSurfaceAlt,
                        shape = RoundedCornerShape(18.dp),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text(
                            emptyMessage,
                            color = PopMuted,
                            fontSize = 12.sp,
                            modifier = Modifier.padding(16.dp),
                        )
                    }
                }
            } else {
                items(items, key = { it.id }) { item ->
                    Surface(
                        color = PopSurfaceAlt,
                        shape = RoundedCornerShape(18.dp),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Row(
                            modifier = Modifier.padding(14.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(46.dp)
                                    .background(PopBlueSoft, RoundedCornerShape(14.dp)),
                                contentAlignment = Alignment.Center,
                            ) {
                                Icon(icon, null, tint = PopBlue, modifier = Modifier.size(23.dp))
                            }
                            Spacer(Modifier.width(12.dp))
                            Column(Modifier.weight(1f)) {
                                Text(
                                    item.title,
                                    color = PopText,
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                )
                                if (item.description.isNotBlank()) {
                                    Text(
                                        item.description,
                                        color = PopMuted,
                                        fontSize = 10.sp,
                                        maxLines = 2,
                                        overflow = TextOverflow.Ellipsis,
                                    )
                                }
                            }
                            Text(
                                item.detail,
                                color = PopMuted,
                                fontSize = 9.sp,
                                fontWeight = FontWeight.SemiBold,
                            )
                        }
                    }
                }
            }

            if (!canAdd) {
                item {
                    Text(
                        "Seu grupo de permissão pode visualizar, mas não cadastrar.",
                        color = PopMuted,
                        fontSize = 11.sp,
                        modifier = Modifier.padding(vertical = 8.dp),
                    )
                }
            }
        }

        if (canAdd) {
            FloatingActionButton(
                onClick = onAdd,
                containerColor = PopBlue,
                contentColor = Color.White,
                shape = CircleShape,
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(end = 24.dp, bottom = 28.dp)
                    .size(66.dp),
            ) {
                Icon(Icons.Rounded.Add, addDescription, modifier = Modifier.size(30.dp))
            }
        }
    }
}

@Composable
private fun EmployeesManagementPage(
    companyName: String,
    companyMembers: List<CompanyMember>,
    companySectors: List<CompanySector>,
    companyGroups: List<CompanyGroup>,
    currentUserEmail: String,
    currentUserPhotoUrl: String,
    canManageEmployees: Boolean,
    onAdd: () -> Unit,
    onMemberClick: (CompanyMember) -> Unit,
    onBack: () -> Unit,
) {
    Box(Modifier.fillMaxSize()) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 20.dp, end = 20.dp, bottom = 110.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            item {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(top = 12.dp, bottom = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    IconButton(onClick = onBack, modifier = Modifier.size(42.dp)) {
                        Icon(Icons.Rounded.ArrowBack, "Voltar", tint = PopText)
                    }
                    Spacer(Modifier.width(6.dp))
                    Column(Modifier.weight(1f)) {
                        Text("Funcionários", fontSize = 22.sp, fontWeight = FontWeight.ExtraBold)
                        Text(
                            "$companyName • ${companyMembers.size} cadastrados",
                            color = PopMuted,
                            fontSize = 11.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                }
            }

            if (companyMembers.isEmpty()) {
                item {
                    Surface(
                        color = PopSurfaceAlt,
                        shape = RoundedCornerShape(18.dp),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text(
                            "Nenhum funcionário cadastrado nesta empresa.",
                            color = PopMuted,
                            fontSize = 12.sp,
                            modifier = Modifier.padding(16.dp),
                        )
                    }
                }
            } else {
                items(companyMembers, key = { "${it.id}:${it.email}" }) { member ->
                    val memberGroups = companyGroups
                        .filter { it.id in member.groupIds }
                        .joinToString(", ") { it.name }
                    val pendingColor = Color(0xFFFFA726)
                    Surface(
                        onClick = { onMemberClick(member) },
                        enabled = canManageEmployees &&
                            !member.isOwner &&
                            !member.email.equals(currentUserEmail, ignoreCase = true),
                        color = if (member.pending) {
                            pendingColor.copy(alpha = .16f)
                        } else {
                            PopSurfaceAlt
                        },
                        shape = RoundedCornerShape(18.dp),
                        border = if (member.pending) {
                            BorderStroke(1.dp, pendingColor.copy(alpha = .48f))
                        } else {
                            null
                        },
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Row(
                            Modifier.padding(13.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            GoogleProfileAvatar(
                                photoUrl = member.photoUrl.ifBlank {
                                    currentUserPhotoUrl.takeIf {
                                        member.email.equals(currentUserEmail, ignoreCase = true)
                                    }.orEmpty()
                                },
                                modifier = Modifier.size(46.dp),
                                fallbackIcon = Icons.Rounded.PersonOutline,
                            )
                            Spacer(Modifier.width(12.dp))
                            Column(Modifier.weight(1f)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(
                                        member.name,
                                        color = PopText,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 13.sp,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                        modifier = Modifier.weight(1f),
                                    )
                                    if (member.pending) {
                                        Text(
                                            "Pendente",
                                            color = Color(0xFFE27B00),
                                            fontSize = 9.sp,
                                            fontWeight = FontWeight.ExtraBold,
                                            modifier = Modifier
                                                .background(
                                                    pendingColor.copy(alpha = .2f),
                                                    RoundedCornerShape(8.dp),
                                                )
                                                .padding(horizontal = 7.dp, vertical = 3.dp),
                                        )
                                    } else if (member.isOwner) {
                                        Text(
                                            "Proprietário",
                                            color = PopBlue,
                                            fontSize = 9.sp,
                                            fontWeight = FontWeight.ExtraBold,
                                            modifier = Modifier
                                                .background(PopBlueSoft, RoundedCornerShape(8.dp))
                                                .padding(horizontal = 7.dp, vertical = 3.dp),
                                        )
                                    }
                                }
                                Text(
                                    listOf(member.role, member.sector)
                                        .filter(String::isNotBlank)
                                        .joinToString(" • "),
                                    color = PopMuted,
                                    fontSize = 10.sp,
                                )
                                if (memberGroups.isNotBlank()) {
                                    Text(
                                        "Grupos: $memberGroups",
                                        color = PopMuted,
                                        fontSize = 10.sp,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                    )
                                }
                                if (member.email.isNotBlank()) {
                                    Text(
                                        member.email,
                                        color = PopMuted,
                                        fontSize = 10.sp,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                    )
                                }
                            }
                        }
                    }
                }
            }

            if (!canManageEmployees) {
                item {
                    Text(
                        "Seu grupo de permissão pode visualizar a equipe, mas não alterá-la.",
                        color = PopMuted,
                        fontSize = 11.sp,
                        modifier = Modifier.padding(vertical = 8.dp),
                    )
                }
            }
        }

        if (canManageEmployees) {
            FloatingActionButton(
                onClick = onAdd,
                containerColor = PopBlue,
                contentColor = Color.White,
                shape = CircleShape,
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(end = 24.dp, bottom = 28.dp)
                    .size(66.dp),
            ) {
                Icon(Icons.Rounded.Add, "Cadastrar funcionário", modifier = Modifier.size(30.dp))
            }
        }
    }
}

@Composable
private fun EmployeesManagementPageLegacy(
    companyName: String,
    companyMembers: List<CompanyMember>,
    companySectors: List<CompanySector>,
    canManageEmployees: Boolean,
    memberName: String,
    onMemberNameChange: (String) -> Unit,
    memberEmail: String,
    onMemberEmailChange: (String) -> Unit,
    memberRole: String,
    onMemberRoleChange: (String) -> Unit,
    memberSectorId: String,
    onMemberSectorChange: (String) -> Unit,
    saving: Boolean,
    onInvite: () -> Unit,
    onBack: () -> Unit,
    onDismiss: () -> Unit,
) {
    val validInvite =
        memberName.trim().length >= 2 &&
            android.util.Patterns.EMAIL_ADDRESS.matcher(memberEmail.trim()).matches() &&
            memberRole.trim().length >= 2 &&
            memberSectorId.isNotBlank()

    LazyColumn(
        modifier = Modifier
            .fillMaxSize(),
        contentPadding = PaddingValues(start = 20.dp, end = 20.dp, bottom = 28.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth().padding(top = 12.dp, bottom = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                IconButton(onClick = onBack, modifier = Modifier.size(38.dp)) {
                    Icon(Icons.Rounded.ArrowBack, "Voltar", tint = PopText)
                }
                Spacer(Modifier.width(4.dp))
                Column(Modifier.weight(1f)) {
                    Text("Funcionários", fontSize = 22.sp, fontWeight = FontWeight.ExtraBold)
                    Text(
                        "$companyName • ${companyMembers.size} cadastrados",
                        color = PopMuted,
                        fontSize = 11.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                IconButton(onClick = onDismiss, modifier = Modifier.size(38.dp)) {
                    Icon(Icons.Rounded.Close, "Fechar", tint = PopMuted)
                }
            }
        }

        if (companyMembers.isEmpty()) {
            item {
                Surface(
                    color = PopSurfaceAlt,
                    shape = RoundedCornerShape(18.dp),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(
                        "Nenhum funcionário cadastrado nesta empresa.",
                        color = PopMuted,
                        fontSize = 12.sp,
                        modifier = Modifier.padding(16.dp),
                    )
                }
            }
        } else {
            items(companyMembers, key = { "${it.id}:${it.email}" }) { member ->
                Surface(
                    color = PopSurfaceAlt,
                    shape = RoundedCornerShape(18.dp),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Row(
                        Modifier.padding(13.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Box(
                            Modifier.size(42.dp).clip(CircleShape).background(PopBlueSoft),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                member.name.trim().take(1).uppercase().ifBlank { "?" },
                                color = PopBlue,
                                fontWeight = FontWeight.Black,
                            )
                        }
                        Spacer(Modifier.width(11.dp))
                        Column(Modifier.weight(1f)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    member.name,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 13.sp,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                    modifier = Modifier.weight(1f, fill = false),
                                )
                                if (member.pending) {
                                    Spacer(Modifier.width(7.dp))
                                    Text(
                                        "Pendente",
                                        color = Color(0xFFE28A00),
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.Bold,
                                        modifier = Modifier
                                            .background(
                                                Color(0xFFFFB020).copy(alpha = .14f),
                                                RoundedCornerShape(8.dp),
                                            )
                                            .padding(horizontal = 7.dp, vertical = 3.dp),
                                    )
                                }
                            }
                            Text(
                                listOf(member.role, member.sector)
                                    .filter(String::isNotBlank)
                                    .joinToString(" • "),
                                color = PopMuted,
                                fontSize = 10.sp,
                            )
                            if (member.email.isNotBlank()) {
                                Text(
                                    member.email,
                                    color = PopMuted,
                                    fontSize = 10.sp,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                )
                            }
                        }
                    }
                }
            }
        }

        if (canManageEmployees) {
            item {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    HorizontalDivider(
                        color = PopMuted.copy(alpha = .16f),
                        modifier = Modifier.padding(vertical = 5.dp),
                    )
                    Text(
                        "Cadastrar funcionário",
                        color = PopBlue,
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 13.sp,
                    )
                    Text(
                        "A pessoa receberá um convite por e-mail para entrar na empresa.",
                        color = PopMuted,
                        fontSize = 10.sp,
                    )
                    if (companySectors.isEmpty()) {
                        Surface(
                            color = Color(0xFFFFB020).copy(alpha = .1f),
                            shape = RoundedCornerShape(14.dp),
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Text(
                                "Cadastre um setor antes de adicionar funcionários.",
                                color = Color(0xFFB66A00),
                                fontSize = 11.sp,
                                modifier = Modifier.padding(13.dp),
                            )
                        }
                    } else {
                        ManagementField(memberName, onMemberNameChange, "Nome")
                        ManagementField(memberEmail, onMemberEmailChange, "E-mail")
                        ManagementField(memberRole, onMemberRoleChange, "Cargo")
                        ManagementChoiceField(
                            label = "Setor",
                            value = companySectors
                                .firstOrNull { it.id == memberSectorId }
                                ?.name
                                .orEmpty(),
                            options = companySectors.map { it.id to it.name },
                            onSelect = onMemberSectorChange,
                        )
                        Surface(
                            onClick = onInvite,
                            enabled = validInvite && !saving,
                            color = if (validInvite && !saving) PopBlue else PopMuted.copy(alpha = .18f),
                            contentColor = Color.White,
                            shape = RoundedCornerShape(15.dp),
                            modifier = Modifier.fillMaxWidth().height(48.dp),
                        ) {
                            Row(
                                modifier = Modifier.fillMaxSize(),
                                horizontalArrangement = Arrangement.Center,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                if (saving) {
                                    CircularProgressIndicator(
                                        modifier = Modifier.size(17.dp),
                                        strokeWidth = 2.dp,
                                        color = Color.White,
                                    )
                                    Spacer(Modifier.width(8.dp))
                                }
                                Text(
                                    if (saving) "Enviando convite..." else "Cadastrar e enviar convite",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 12.sp,
                                )
                            }
                        }
                    }
                }
            }
        } else {
            item {
                Text(
                    "Seu grupo de permissão pode visualizar a equipe, mas não cadastrar funcionários.",
                    color = PopMuted,
                    fontSize = 11.sp,
                    modifier = Modifier.padding(vertical = 8.dp),
                )
            }
        }
    }
}

@Composable
private fun ManagementField(value: String, onValueChange: (String) -> Unit, placeholder: String) {
    TextField(
        value = value,
        onValueChange = onValueChange,
        placeholder = { Text(placeholder) },
        singleLine = true,
        shape = RoundedCornerShape(14.dp),
        colors = TextFieldDefaults.colors(
            focusedContainerColor = PopBlueSoft,
            unfocusedContainerColor = PopSurfaceAlt,
            focusedIndicatorColor = Color.Transparent,
            unfocusedIndicatorColor = Color.Transparent,
        ),
        modifier = Modifier.fillMaxWidth(),
    )
}

@Composable
private fun ManagementChoiceField(
    label: String,
    value: String,
    options: List<Pair<String, String>>,
    onSelect: (String) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    val arrowRotation by animateFloatAsState(
        targetValue = if (expanded) 180f else 0f,
        animationSpec = tween(durationMillis = 220, easing = FastOutSlowInEasing),
        label = "management-choice-arrow",
    )
    val fieldColor by animateColorAsState(
        targetValue = if (expanded) PopBlueSoft else PopSurfaceAlt,
        animationSpec = tween(durationMillis = 200),
        label = "management-choice-color",
    )

    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Surface(
            onClick = { expanded = !expanded },
            color = fieldColor,
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 15.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(Modifier.weight(1f)) {
                    Text(label, color = PopMuted, fontSize = 9.sp)
                    Text(
                        value.ifBlank { "Selecionar" },
                        color = MaterialTheme.colorScheme.onSurface,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                    )
                }
                Spacer(Modifier.width(8.dp))
                Icon(
                    Icons.Rounded.KeyboardArrowDown,
                    if (expanded) "Fechar lista" else "Abrir lista",
                    tint = if (expanded) PopBlue else PopMuted,
                    modifier = Modifier.rotate(arrowRotation),
                )
            }
        }

        AnimatedVisibility(
            visible = expanded,
            enter = fadeIn(tween(190, easing = FastOutSlowInEasing)) +
                expandVertically(
                    expandFrom = Alignment.Top,
                    animationSpec = tween(280, easing = FastOutSlowInEasing),
                ),
            exit = fadeOut(tween(80, easing = FastOutSlowInEasing)) +
                shrinkVertically(
                    shrinkTowards = Alignment.Top,
                    animationSpec = tween(130, easing = FastOutSlowInEasing),
                ),
        ) {
            Surface(
                color = PopSurfaceAlt,
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(Modifier.padding(6.dp)) {
                    options.forEach { (id, name) ->
                        val selected = value == name || value == id
                        Surface(
                            onClick = {
                                onSelect(id)
                                expanded = false
                            },
                            color = if (selected) PopBlueSoft else Color.Transparent,
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 11.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text(
                                    name,
                                    color = if (selected) PopBlue else MaterialTheme.colorScheme.onSurface,
                                    fontSize = 13.sp,
                                    fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
                                    modifier = Modifier.weight(1f),
                                )
                                if (selected) {
                                    Icon(
                                        Icons.Rounded.Check,
                                        "Selecionado",
                                        tint = PopBlue,
                                        modifier = Modifier.size(18.dp),
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ManagementListItem(kind: String, name: String, description: String = "") {
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(PopSurfaceAlt).padding(11.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(Icons.Rounded.AccountTree, null, tint = PopBlue, modifier = Modifier.size(18.dp))
        Spacer(Modifier.width(9.dp))
        Column(Modifier.weight(1f)) {
            Text(name, fontWeight = FontWeight.Bold, fontSize = 12.sp)
            Text(description.ifBlank { kind }, color = PopMuted, fontSize = 9.sp)
        }
    }
}

@Composable
private fun ThemeChoice(
    title: String,
    subtitle: String,
    icon: ImageVector,
    selected: Boolean,
    onClick: () -> Unit,
) {
    Surface(
        onClick = onClick,
        color = if (selected) PopBlueSoft else PopSurfaceAlt,
        shape = RoundedCornerShape(18.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, null, tint = if (selected) PopBlue else PopMuted)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(title, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                Text(subtitle, color = PopMuted, fontSize = 11.sp)
            }
            if (selected) Icon(Icons.Rounded.Check, "Selecionado", tint = PopBlue)
        }
    }
}

@Composable
private fun MoreShortcut(
    icon: ImageVector,
    title: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val shape = RoundedCornerShape(17.dp)
    Surface(
        onClick = onClick,
        color = PopSurfaceAlt,
        shape = shape,
        modifier = modifier
            .height(72.dp),
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 5.dp, vertical = 9.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Icon(icon, null, tint = PopMuted, modifier = Modifier.size(20.dp))
            Spacer(Modifier.height(5.dp))
            Text(
                title,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

@Composable
private fun MoreAccountAction(
    icon: ImageVector,
    label: String,
    onClick: () -> Unit,
    accent: Color = PopBlue,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 8.dp, vertical = 9.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, null, tint = accent, modifier = Modifier.size(19.dp))
        Spacer(Modifier.width(10.dp))
        Text(label, color = accent, fontSize = 13.sp, fontWeight = FontWeight.Bold)
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
            modifier = Modifier.fillMaxWidth(),
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

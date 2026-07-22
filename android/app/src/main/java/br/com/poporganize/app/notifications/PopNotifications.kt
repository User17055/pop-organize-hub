package br.com.poporganize.app.notifications

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.Worker
import androidx.work.WorkerParameters
import br.com.poporganize.app.MainActivity
import br.com.poporganize.app.R
import org.json.JSONArray
import org.json.JSONObject
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.net.URL
import java.util.concurrent.TimeUnit

private const val CHANNEL_ID = "pop_organize_alertas_v1"
private const val PERIODIC_WORK = "pop_organize_pending_task_notifications"
private const val PREFERENCES = "pop_organize_local"
private const val TASK_SNAPSHOT = "pop_organize_notification_tasks"
private const val ACCOUNT_NAME = "pop_organize_google_account_name"
private const val SESSION_MODE = "pop_organize_session_mode"
private const val LAST_GREETING = "pop_organize_last_greeting"
private const val LAST_ACTIVE = "pop_organize_last_active"
private const val ACCOUNT_ID = "pop_organize_google_account_id"
private const val API_SESSION_TOKEN = "pop_organize_api_session_token"
private const val ASSIGNED_TASKS_SEEN_PREFIX = "pop_organize_assigned_tasks_seen_"
private const val MOBILE_API_BASE_URL = "https://app.poporganize.com.br/api/mobile"
const val EXTRA_OPEN_TASK_ID = "pop_organize_open_task_id"

data class NotificationTaskSnapshot(
    val title: String,
    val dueDate: String,
    val dueTime: String,
    val completed: Boolean,
)

private data class AssignedTaskSnapshot(
    val id: Int,
    val serverId: String,
    val title: String,
    val assignedBy: String,
)

fun createPopNotificationChannel(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val sound = Uri.parse("android.resource://${context.packageName}/${R.raw.pop_notification}")
    val audio = AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_NOTIFICATION)
        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
        .build()
    val channel = NotificationChannel(
        CHANNEL_ID,
        "Tarefas e lembretes",
        NotificationManager.IMPORTANCE_HIGH,
    ).apply {
        description = "Novas tarefas, prazos, atrasos e resumos do dia"
        setSound(sound, audio)
        enableVibration(true)
        setShowBadge(true)
    }
    context.getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
}

fun schedulePopNotifications(context: Context) {
    createPopNotificationChannel(context)
    val work = PeriodicWorkRequestBuilder<PopReminderWorker>(15, TimeUnit.MINUTES).build()
    WorkManager.getInstance(context).enqueueUniquePeriodicWork(
        PERIODIC_WORK,
        ExistingPeriodicWorkPolicy.UPDATE,
        work,
    )
}

fun saveNotificationTaskSnapshot(context: Context, tasks: List<NotificationTaskSnapshot>) {
    val json = JSONArray()
    tasks.forEach { task ->
        json.put(
            JSONObject()
                .put("title", task.title)
                .put("dueDate", task.dueDate)
                .put("dueTime", task.dueTime)
                .put("completed", task.completed),
        )
    }
    context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
        .edit()
        .putString(TASK_SNAPSHOT, json.toString())
        .apply()
}

fun clearPopNotifications(context: Context) {
    NotificationManagerCompat.from(context).cancelAll()
    context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
        .edit()
        .putLong(LAST_ACTIVE, System.currentTimeMillis())
        .apply()
}

fun showAssignedTaskNotification(
    context: Context,
    title: String,
    assignedBy: String?,
    taskId: Int,
) {
    val body = assignedBy?.takeIf { it.isNotBlank() }
        ?.let { "$it colocou uma tarefa para você. Clique aqui para ver: $title" }
        ?: "Uma nova tarefa foi colocada para você. Clique aqui para ver: $title"
    postNotification(context, "Nova tarefa para você", body, 1, 7_200 + taskId.mod(100_000), taskId)
}

class PopReminderWorker(
    appContext: Context,
    workerParams: WorkerParameters,
) : Worker(appContext, workerParams) {
    override fun doWork(): Result {
        val preferences = applicationContext.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
        if (preferences.getString(SESSION_MODE, null).isNullOrBlank()) return Result.success()
        runCatching { checkForAssignedTasks(applicationContext) }
        if (System.currentTimeMillis() - preferences.getLong(LAST_ACTIVE, 0L) < TimeUnit.MINUTES.toMillis(5)) {
            return Result.success()
        }
        val hour = LocalTime.now().hour
        val period = when (hour) {
            in 5..11 -> "morning"
            in 12..17 -> "afternoon"
            in 18..22 -> "evening"
            else -> return Result.success()
        }
        val today = LocalDate.now()
        val greetingKey = "$today-$period"
        if (preferences.getString(LAST_GREETING, null) == greetingKey) return Result.success()

        val tasks = readTasks(preferences.getString(TASK_SNAPSHOT, null))
        val pending = tasks.filterNot { it.completed }
        val todayCount = pending.count { it.dueDate == today.toString() }
        val now = LocalDateTime.now()
        val overdue = pending.count { task ->
            val date = runCatching { LocalDate.parse(task.dueDate) }.getOrNull() ?: return@count false
            val time = runCatching { LocalTime.parse(task.dueTime) }.getOrNull()
            date < today || (date == today && time != null && LocalDateTime.of(date, time) < now)
        }
        val firstName = preferences.getString(ACCOUNT_NAME, null)
            ?.trim()?.substringBefore(" ")?.takeIf { it.isNotBlank() } ?: "você"
        val greeting = when (period) {
            "morning" -> "Bom dia, $firstName"
            "afternoon" -> "Boa tarde, $firstName"
            else -> "Boa noite, $firstName"
        }
        val body = when {
            period == "morning" && todayCount == 1 -> "Hoje temos 1 tarefa. Vamos organizar o dia?"
            period == "morning" && todayCount > 1 -> "Hoje temos $todayCount tarefas. Vamos organizar o dia?"
            overdue == 1 -> "Você ainda tem 1 tarefa atrasada."
            overdue > 1 -> "Você ainda tem $overdue tarefas atrasadas."
            pending.size == 1 -> "Ainda existe 1 tarefa pendente."
            pending.isNotEmpty() -> "Ainda existem ${pending.size} tarefas pendentes."
            else -> "Tudo em dia por aqui."
        }
        postNotification(applicationContext, greeting, body, pending.size, 7101)
        preferences.edit().putString(LAST_GREETING, greetingKey).apply()
        return Result.success()
    }

    private fun readTasks(raw: String?): List<NotificationTaskSnapshot> = runCatching {
        val array = JSONArray(raw ?: "[]")
        List(array.length()) { index ->
            val item = array.getJSONObject(index)
            NotificationTaskSnapshot(
                title = item.optString("title"),
                dueDate = item.optString("dueDate"),
                dueTime = item.optString("dueTime"),
                completed = item.optBoolean("completed"),
            )
        }
    }.getOrDefault(emptyList())
}

private fun checkForAssignedTasks(context: Context) {
    val preferences = context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
    val accountId = preferences.getString(ACCOUNT_ID, null)?.takeIf { it.isNotBlank() } ?: return
    val apiToken = preferences.getString(API_SESSION_TOKEN, null)?.takeIf { it.isNotBlank() } ?: return
    val workspacesResponse = readMobileApi("$MOBILE_API_BASE_URL/workspaces", apiToken) ?: return
    val workspaces = workspacesResponse.optJSONArray("workspaces") ?: return
    val assignments = buildList {
        repeat(workspaces.length()) { index ->
            val workspace = workspaces.optJSONObject(index) ?: return@repeat
            if (workspace.optString("kind") != "company") return@repeat
            val workspaceId = workspace.optString("id").takeIf { it.isNotBlank() } ?: return@repeat
            val tasksResponse = readMobileApi("$MOBILE_API_BASE_URL/tasks", apiToken, workspaceId)
                ?: return@repeat
            val tasks = tasksResponse.optJSONArray("tasks") ?: return@repeat
            repeat(tasks.length()) taskLoop@{ taskIndex ->
                val task = tasks.optJSONObject(taskIndex) ?: return@taskLoop
                val assignedBy = task.optString("assignedBy").takeIf { it.isNotBlank() }
                    ?: return@taskLoop
                add(
                    AssignedTaskSnapshot(
                        id = task.optInt("id"),
                        serverId = task.optString("serverId").ifBlank { task.optInt("id").toString() },
                        title = task.optString("title"),
                        assignedBy = assignedBy,
                    ),
                )
            }
        }
    }
    val seenKey = "$ASSIGNED_TASKS_SEEN_PREFIX$accountId"
    val hasBaseline = preferences.contains(seenKey)
    val seen = runCatching {
        val stored = JSONArray(preferences.getString(seenKey, "[]") ?: "[]")
        buildSet { repeat(stored.length()) { index -> add(stored.optString(index)) } }
    }.getOrDefault(emptySet())
    val fresh = assignments.filter { it.serverId !in seen }
    preferences.edit()
        .putString(seenKey, JSONArray((seen + assignments.map { it.serverId }).toList()).toString())
        .apply()
    if (hasBaseline) {
        fresh.forEach { task ->
            showAssignedTaskNotification(context, task.title, task.assignedBy, task.id)
        }
    }
}

private fun readMobileApi(url: String, apiToken: String, workspaceId: String = ""): JSONObject? {
    val connection = (URL(url).openConnection() as java.net.HttpURLConnection).apply {
        requestMethod = "GET"
        connectTimeout = 15_000
        readTimeout = 20_000
        setRequestProperty("Authorization", "Bearer $apiToken")
        if (workspaceId.isNotBlank()) setRequestProperty("X-Workspace-Id", workspaceId)
        setRequestProperty("Accept", "application/json")
    }
    return try {
        if (connection.responseCode !in 200..299) return null
        val response = connection.inputStream.bufferedReader(Charsets.UTF_8).use { it.readText() }
        runCatching { JSONObject(response) }.getOrNull()
    } finally {
        connection.disconnect()
    }
}

private fun postNotification(
    context: Context,
    title: String,
    body: String,
    count: Int,
    id: Int,
    openTaskId: Int? = null,
) {
    if (
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
        ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
    ) return
    createPopNotificationChannel(context)
    val intent = Intent(context, MainActivity::class.java).apply {
        flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
        openTaskId?.let { putExtra(EXTRA_OPEN_TASK_ID, it) }
    }
    val pendingIntent = PendingIntent.getActivity(
        context,
        openTaskId ?: 0,
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    val notification = NotificationCompat.Builder(context, CHANNEL_ID)
        .setSmallIcon(R.drawable.ic_pop_notification)
        .setColor(ContextCompat.getColor(context, R.color.pop_blue))
        .setContentTitle(title)
        .setContentText(body)
        .setStyle(NotificationCompat.BigTextStyle().bigText(body))
        .setContentIntent(pendingIntent)
        .setAutoCancel(true)
        .setNumber(count.coerceAtLeast(1))
        .setBadgeIconType(NotificationCompat.BADGE_ICON_SMALL)
        .setPriority(NotificationCompat.PRIORITY_HIGH)
        .build()
    NotificationManagerCompat.from(context).notify(id, notification)
}

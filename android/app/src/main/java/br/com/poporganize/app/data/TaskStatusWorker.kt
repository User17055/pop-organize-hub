package br.com.poporganize.app.data

import android.content.Context
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import br.com.poporganize.app.BuildConfig
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.TimeUnit

internal fun scheduleTaskStatusSync(context: Context) {
    val network = Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()
    val manager = WorkManager.getInstance(context.applicationContext)
    // Replacement is safe: every immutable queue item keeps its mutation ID, and the
    // server persists each receipt atomically. An old HTTP request cannot replay an action.
    manager.enqueueUniqueWork("pop_task_status_send_v1", ExistingWorkPolicy.REPLACE,
        OneTimeWorkRequestBuilder<TaskStatusWorker>().setConstraints(network)
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 10, TimeUnit.SECONDS).build())
}

internal fun scheduleTaskStatusRecovery(context: Context) {
    WorkManager.getInstance(context.applicationContext).enqueueUniquePeriodicWork(
        "pop_task_status_recovery_v1", ExistingPeriodicWorkPolicy.KEEP,
        PeriodicWorkRequestBuilder<TaskStatusWorker>(15, TimeUnit.MINUTES)
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()).build())
    scheduleTaskStatusSync(context)
}

class TaskStatusWorker(context: Context, parameters: WorkerParameters) : CoroutineWorker(context, parameters) {
    override suspend fun doWork(): Result {
        val preferences = applicationContext.getSharedPreferences(TaskStatusOutbox.PREFERENCES, Context.MODE_PRIVATE)
        val account = preferences.getString("pop_organize_google_account_id", null) ?: return Result.success()
        val token = preferences.getString("pop_organize_api_session_token", null)?.takeIf { it.isNotBlank() } ?: return Result.success()
        val result = try {
            TaskStatusOutbox.migrateSavedAccount(applicationContext, account)
            deliverTaskStatuses(account, TaskStatusOutbox.deliveryStore(applicationContext),
            sessionIsCurrent = { preferences.getString("pop_organize_google_account_id", null) == account &&
                preferences.getString("pop_organize_api_session_token", null) == token },
            send = { intent -> withContext(Dispatchers.IO) { sendStatus(token, intent) } })
        } catch (error: CancellationException) { throw error }
        catch (_: Exception) { return Result.retry() }
        return if (result == TaskStatusDeliveryResult.RETRY) Result.retry() else Result.success()
    }

    private fun sendStatus(token: String, intent: TaskStatusIntent): TaskStatusAcknowledgement {
        val connection = (URL("${BuildConfig.POP_API_BASE_URL.trimEnd('/')}/tasks").openConnection() as HttpURLConnection).apply {
            requestMethod = "PUT"
            connectTimeout = 15_000
            readTimeout = 20_000
            doOutput = true
            setRequestProperty("Authorization", "Bearer $token")
            if (intent.workspaceId.isBlank()) setRequestProperty("X-Workspace-Kind", "personal")
            else setRequestProperty("X-Workspace-Id", intent.workspaceId)
            setRequestProperty("Content-Type", "application/json; charset=utf-8")
            setRequestProperty("Accept", "application/json")
            setRequestProperty("User-Agent", "PopOrganize/${BuildConfig.VERSION_NAME} (build ${BuildConfig.VERSION_CODE}; Android; status-worker)")
        }
        try {
            val command = JSONObject().put("serverId", intent.serverId).put("completed", intent.completed).put("mutationId", intent.mutationId)
            val payload = JSONObject().put("tasks", JSONArray()).put("baseTasks", JSONArray())
                .put("deletedServerIds", JSONArray()).put("statusChanges", JSONArray().put(command))
            connection.outputStream.bufferedWriter(Charsets.UTF_8).use { it.write(payload.toString()) }
            val code = connection.responseCode
            val text = (if (code in 200..299) connection.inputStream else connection.errorStream)?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()
            if (code !in 200..299) {
                val message = runCatching { JSONObject(text).optString("error") }.getOrDefault("")
                throw TaskStatusHttpFailure(code, message.ifBlank { "O servidor não confirmou esta alteração ($code)." })
            }
            val response = JSONObject(text)
            check(response.getBoolean("ok")) { "A conclusão ainda não foi confirmada pelo servidor." }
            val results = response.getJSONArray("statusResults")
            check(results.length() == 1) { "A confirmação da conclusão está incompleta." }
            val receipt = results.getJSONObject(0)
            val task = receipt.getJSONObject("task")
            task.getBoolean("completed") // reject malformed successful responses
            return TaskStatusAcknowledgement(receipt.getString("mutationId"), task.getString("serverId"), task.toString())
        } finally { connection.disconnect() }
    }
}

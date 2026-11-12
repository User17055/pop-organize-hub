package br.com.poporganize.app.data

import android.content.Context
import android.content.SharedPreferences
import br.com.poporganize.app.BuildConfig
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject

internal class TaskSyncHttpFailure(val code: Int, message: String) : Exception(message)

/** Immutable persisted HTTP envelopes. Lost responses are replayed with the same identity. */
internal object TaskSyncRequests {
    const val REVISION = "task_content_sync_revision_v3"
    const val SIGNAL = "task_content_sync_signal_v3"
    @Volatile var foreground = false
    private fun key(account: String, workspace: String, channel: String = "tasks") = TaskStatusOutbox.baselineKey(account, workspace) + "_${channel}_request_v3"
    fun hasPending(context: Context, account: String, workspace: String, channel: String = "tasks") =
        context.getSharedPreferences(TaskStatusOutbox.PREFERENCES, 0).contains(key(account, workspace, channel))

    suspend fun send(context: Context, account: String, token: String, workspace: String, proposed: JSONObject, channel: String = "tasks",
        openConnection: (URL) -> HttpURLConnection = { it.openConnection() as HttpURLConnection }): JSONObject = withContext(Dispatchers.IO) {
        val prefs = context.getSharedPreferences(TaskStatusOutbox.PREFERENCES, 0)
        val requestKey = key(account, workspace, channel)
        val stored = prefs.getString(requestKey, null)
        val body = stored?.let(::JSONObject) ?: proposed.put("syncRequest", JSONObject()
            .put("mutationId", UUID.randomUUID().toString()).put("policy", "arrival"))
        if (stored == null) check(TaskStatusOutbox.durableCommit(prefs, prefs.edit().putString(requestKey, body.toString()), listOf(requestKey))) {
            "Não foi possível salvar o envio no aparelho."
        }
        val identity = body.getJSONObject("syncRequest").getString("mutationId")
        val connection = openConnection(URL("${BuildConfig.POP_API_BASE_URL.trimEnd('/')}/$channel"))
        try {
            connection.requestMethod = "PUT"
            connection.connectTimeout = 10_000
            connection.readTimeout = 20_000
            connection.doOutput = true
            connection.setRequestProperty("Authorization", "Bearer $token")
            connection.setRequestProperty("User-Agent", "PopOrganize/${BuildConfig.VERSION_NAME} (build ${BuildConfig.VERSION_CODE}; Android; durable-sync)")
            connection.setRequestProperty(if (workspace.isBlank()) "X-Workspace-Kind" else "X-Workspace-Id", workspace.ifBlank { "personal" })
            connection.setRequestProperty("Content-Type", "application/json; charset=utf-8")
            connection.outputStream.bufferedWriter(Charsets.UTF_8).use { it.write(body.toString()) }
            val code = connection.responseCode
            val text = (if (code in 200..299) connection.inputStream else connection.errorStream)
                ?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()
            if (code !in 200..299) {
                val message = runCatching { JSONObject(text).optString("error") }.getOrDefault("")
                // A definitive refusal did not write the batch. Archive it for diagnostics and
                // let the refreshed permissions remove impossible edits from the next attempt.
                if (code in listOf(400, 403, 404, 422)) {
                    check(TaskStatusOutbox.durableCommit(prefs, prefs.edit().putString(requestKey + "_rejected", JSONObject()
                        .put("request", body).put("error", message).put("code", code).toString())
                        .remove(requestKey), listOf(requestKey, requestKey + "_rejected"))) { "Não foi possível preservar o envio recusado." }
                }
                throw TaskSyncHttpFailure(code, message.ifBlank { "O servidor ainda não confirmou o envio ($code)." })
            }
            val receipt = JSONObject(text)
            check(receipt.getBoolean("ok") && receipt.getString("mutationId") == identity) {
                "A confirmação do envio não corresponde à alteração."
            }
            body
        } finally { connection.disconnect() }
    }

    /** Used in the SAME disk commit as the new cache and baseline, under the scope mutex. */
    fun finish(context: Context, account: String, workspace: String, body: JSONObject?, editor: SharedPreferences.Editor, channel: String = "tasks") {
        val prefs = context.getSharedPreferences(TaskStatusOutbox.PREFERENCES, 0)
        if (body != null) {
            val pending = prefs.getString(key(account, workspace, channel), null)?.let(::JSONObject)
            if (pending?.getJSONObject("syncRequest")?.getString("mutationId") == body.getJSONObject("syncRequest").getString("mutationId")) {
                editor.remove(key(account, workspace, channel)).remove(key(account, workspace, channel) + "_rejected")
            }
        }
        if (!foreground) editor.putLong(REVISION, prefs.getLong(REVISION, 0) + 1)
    }

    fun commit(context: Context, account: String, workspace: String, editor: SharedPreferences.Editor, outputKeys: List<String>, channel: String = "tasks"): Boolean {
        val prefs = context.getSharedPreferences(TaskStatusOutbox.PREFERENCES, 0)
        val requestKey = key(account, workspace, channel)
        return TaskStatusOutbox.durableCommit(prefs, editor, outputKeys + listOf(requestKey, requestKey + "_rejected", REVISION))
    }
}

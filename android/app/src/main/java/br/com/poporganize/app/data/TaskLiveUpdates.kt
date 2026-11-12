package br.com.poporganize.app.data

import br.com.poporganize.app.BuildConfig
import java.net.HttpURLConnection
import java.net.URL
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive

/** A foreground long poll is woken by committed VPS changes; cancellation closes its socket. */
internal suspend fun observeTaskLiveUpdates(token: String, workspace: String,
    openConnection: (URL) -> HttpURLConnection = { it.openConnection() as HttpURLConnection },
    onChanged: suspend () -> Unit) {
    var etag: String? = null
    var backoff = 1_000L
    while (currentCoroutineContext().isActive) {
        val connection = openConnection(URL("${BuildConfig.POP_API_BASE_URL.trimEnd('/')}/tasks"))
        try {
            connection.connectTimeout = 10_000
            connection.readTimeout = 35_000
            connection.setRequestProperty("Authorization", "Bearer $token")
            connection.setRequestProperty(if (workspace.isBlank()) "X-Workspace-Kind" else "X-Workspace-Id", workspace.ifBlank { "personal" })
            connection.setRequestProperty("User-Agent", "PopOrganize/${BuildConfig.VERSION_NAME} (build ${BuildConfig.VERSION_CODE}; Android; live-sync)")
            etag?.let { connection.setRequestProperty("If-None-Match", it); connection.setRequestProperty("Prefer", "wait=25") }
            val reply = coroutineScope {
                val request = async(Dispatchers.IO) {
                    val code = connection.responseCode
                    if (code == 200) connection.inputStream.use { stream ->
                        val buffer = ByteArray(8_192)
                        while (stream.read(buffer) >= 0) { /* Consume without keeping a second task cache. */ }
                    }
                    Triple(code, connection.getHeaderField("ETag"), connection.getHeaderField("X-Pop-Live-Sync") == "wait-v1")
                }
                try { request.await() } finally { connection.disconnect(); request.cancel() }
            }
            check(reply.first == 200 || reply.first == 304) { "Canal de atualização indisponível (${reply.first})." }
            if (reply.first == 200) { etag = reply.second; onChanged() }
            backoff = 1_000L
            // Avoid a busy loop when talking to an older server or an intermediary without ETags.
            if (!reply.third || etag.isNullOrBlank()) delay(10_000)
        } catch (error: CancellationException) { throw error }
        catch (_: Exception) { delay(backoff); backoff = (backoff * 2).coerceAtMost(30_000) }
        finally { connection.disconnect() }
    }
}

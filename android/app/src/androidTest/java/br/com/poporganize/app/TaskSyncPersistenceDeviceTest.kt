package br.com.poporganize.app

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import br.com.poporganize.app.data.TaskStatusOutbox
import br.com.poporganize.app.data.TaskSyncRequests
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.net.HttpURLConnection
import java.net.SocketTimeoutException
import java.net.URL
import java.util.UUID
import kotlinx.coroutines.runBlocking
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith

/** Real on-device preference writes, isolated account keys and simulated transport only. */
@RunWith(AndroidJUnit4::class)
class TaskSyncPersistenceDeviceTest {
    @Test fun disconnectedEditsRetryTheirImmutableEnvelopeAndNewerEditsKeepTheirOwnIdentity() = runBlocking {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val prefs = context.getSharedPreferences(TaskStatusOutbox.PREFERENCES, 0)
        val account = "sync-device-audit-" + UUID.randomUUID()
        val workspace = "isolated"
        val prefix = TaskStatusOutbox.baselineKey(account, workspace)
        val requestKey = prefix + "_tasks_request_v3"
        val seen = mutableListOf<JSONObject>()
        fun payload(title: String) = JSONObject().put("tasks", JSONArray().put(JSONObject().put("title",title)))
            .put("baseTasks",JSONArray()).put("deletedServerIds",JSONArray())
        fun connection(url: URL, offline: Boolean) = object : HttpURLConnection(url) {
            val output = ByteArrayOutputStream()
            override fun connect() {}
            override fun disconnect() {}
            override fun usingProxy() = false
            override fun getOutputStream() = output
            override fun getResponseCode(): Int {
                seen.add(JSONObject(output.toString("UTF-8")))
                if (offline) throw SocketTimeoutException("Simulated lost connection")
                return 200
            }
            override fun getInputStream() = ByteArrayInputStream(JSONObject().put("ok",true)
                .put("mutationId",JSONObject(output.toString("UTF-8")).getJSONObject("syncRequest").getString("mutationId"))
                .toString().toByteArray())
        }
        try {
            try {
                TaskSyncRequests.send(context,account,"test-only",workspace,payload("Primeira edição"),openConnection={connection(it,true)})
                fail("A disconnected request must remain unconfirmed")
            } catch (_: SocketTimeoutException) {}
            assertTrue(prefs.contains(requestKey))
            val firstId = seen.single().getJSONObject("syncRequest").getString("mutationId")
            val first = TaskSyncRequests.send(context,account,"test-only",workspace,payload("Edição mais nova"),openConnection={connection(it,false)})
            assertEquals(firstId, first.getJSONObject("syncRequest").getString("mutationId"))
            assertEquals("Primeira edição",first.getJSONArray("tasks").getJSONObject(0).getString("title"))
            assertTrue("HTTP acknowledgement alone must not remove the durable envelope",prefs.contains(requestKey))
            val editor = prefs.edit().putString(prefix + "_test_cache",first.toString())
            TaskSyncRequests.finish(context,account,workspace,first,editor)
            assertTrue(TaskSyncRequests.commit(context,account,workspace,editor,listOf(prefix + "_test_cache")))
            assertFalse(prefs.contains(requestKey))
            val next = TaskSyncRequests.send(context,account,"test-only",workspace,payload("Edição mais nova"),openConnection={connection(it,false)})
            assertNotEquals(firstId,next.getJSONObject("syncRequest").getString("mutationId"))
            assertEquals("Edição mais nova",next.getJSONArray("tasks").getJSONObject(0).getString("title"))
            val failingEditor = prefs.edit().putString(prefix + "_test_cache","unconfirmed")
            val diskFailure = object : android.content.SharedPreferences.Editor by failingEditor {
                override fun commit(): Boolean { failingEditor.apply(); return false }
            }
            diskFailure.remove(requestKey)
            assertFalse(TaskStatusOutbox.durableCommit(prefs,diskFailure,listOf(requestKey,prefix + "_test_cache")))
            assertTrue("A disk failure must restore the pending request",prefs.contains(requestKey))
            assertEquals(first.toString(),prefs.getString(prefix + "_test_cache",null))
        } finally {
            val cleanup = prefs.edit()
            prefs.all.keys.filter { it.startsWith(prefix) }.forEach { cleanup.remove(it) }
            cleanup.commit()
        }
    }
}

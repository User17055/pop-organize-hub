package br.com.poporganize.app

import androidx.test.ext.junit.runners.AndroidJUnit4
import br.com.poporganize.app.data.observeTaskLiveUpdates
import java.io.ByteArrayInputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger
import kotlinx.coroutines.*
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class TaskLiveUpdatesDeviceTest {
    @Test fun serverChangesRefreshAutomaticallyAndLeavingClosesTheWaitingConnection() = runBlocking {
        val changed = AtomicInteger()
        val waiting = CountDownLatch(1)
        val released = CountDownLatch(1)
        val requests = CopyOnWriteArrayList<HttpURLConnection>()
        val disconnected = AtomicInteger()
        val observer = launch(Dispatchers.Default) {
            observeTaskLiveUpdates("isolated-test-token", "isolated-test-workspace", openConnection = { url: URL ->
                val index = requests.size
                object : HttpURLConnection(url) {
                    override fun connect() {}
                    override fun usingProxy() = false
                    override fun disconnect() { disconnected.incrementAndGet(); if (index == 2) released.countDown() }
                    override fun getResponseCode(): Int {
                        if (index == 2) { waiting.countDown(); check(released.await(5, TimeUnit.SECONDS)); return 304 }
                        return 200
                    }
                    override fun getInputStream() = ByteArrayInputStream("{\"tasks\":[]}".toByteArray())
                    override fun getHeaderField(name: String?) = when (name?.lowercase()) {
                        "etag" -> "version-${index + 1}"
                        "x-pop-live-sync" -> "wait-v1"
                        else -> null
                    }
                }.also { requests.add(it) }
            }) { changed.incrementAndGet() }
        }
        try {
            assertTrue(withContext(Dispatchers.IO) { waiting.await(5, TimeUnit.SECONDS) })
            assertEquals(2, changed.get())
            assertEquals(3, requests.size)
            assertNull(requests[0].getRequestProperty("If-None-Match"))
            assertEquals("version-1", requests[1].getRequestProperty("If-None-Match"))
            assertEquals("version-2", requests[2].getRequestProperty("If-None-Match"))
            assertEquals("wait=25", requests[2].getRequestProperty("Prefer"))
            withTimeout(3_000) { observer.cancelAndJoin() }
            assertEquals(0L, released.count)
            assertTrue(disconnected.get() >= 3)
        } finally { observer.cancel(); released.countDown() }
    }
}

package br.com.poporganize.app.data

import kotlin.coroutines.cancellation.CancellationException
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test

class TaskRefreshTest {
    @Test
    fun rejectedCreationStillDownloadsNewAssignments() = runBlocking {
        val denied = IllegalStateException("Seu grupo de permissão não pode criar tarefas.")
        val calls = mutableListOf<String>()

        val result = downloadTasksAfterUpload(
            upload = { calls.add("upload"); throw denied },
            download = { calls.add("download"); listOf("antiga", "teste") },
        )

        assertEquals(listOf("upload", "download"), calls)
        assertEquals(listOf("antiga", "teste"), result.tasks)
        assertSame(denied, result.uploadError)
    }

    @Test
    fun successfulUploadDownloadsAfterSaving() = runBlocking {
        val calls = mutableListOf<String>()
        val result = downloadTasksAfterUpload(
            upload = { calls.add("upload"); Unit },
            download = { calls.add("download"); listOf("teste") },
        )
        assertEquals(listOf("upload", "download"), calls)
        assertNull(result.uploadError)
    }

    @Test
    fun unchangedTasksNeedOnlyDownload() = runBlocking {
        val result = downloadTasksAfterUpload(null) { listOf("teste") }
        assertEquals(listOf("teste"), result.tasks)
        assertNull(result.uploadError)
    }

    @Test
    fun failedDownloadRemainsAnError() = runBlocking {
        val offline = IllegalStateException("offline")
        try {
            downloadTasksAfterUpload<String>(null) { throw offline }
            throw AssertionError("Download failure must be reported")
        } catch (error: IllegalStateException) {
            assertSame(offline, error)
        }
    }

    @Test
    fun cancelledUploadDoesNotStartAnotherRequest() = runBlocking {
        var downloaded = false
        try {
            downloadTasksAfterUpload(
                upload = { throw CancellationException("left workspace") },
                download = { downloaded = true; emptyList<String>() },
            )
            throw AssertionError("Cancellation must propagate")
        } catch (_: CancellationException) {
            assertTrue(!downloaded)
        }
    }
}

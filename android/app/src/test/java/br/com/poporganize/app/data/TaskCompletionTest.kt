package br.com.poporganize.app.data

import kotlinx.coroutines.*
import org.junit.Assert.*
import org.junit.Test

class TaskCompletionTest {
    @Test fun leavingScreenCannotCancelCommittedCompletionOrItsUpload() = runBlocking {
        val screenJob = Job()
        val screenScope = CoroutineScope(screenJob + Dispatchers.Unconfined)
        val applicationScope = CoroutineScope(Job() + Dispatchers.Unconfined)
        val allowUpload = CompletableDeferred<Unit>()
        val otherEmployee = CompletableDeferred<Boolean>()
        var persistedCompleted = false
        commitTaskBeforeAnimation(screenScope,
            commit = {
                persistedCompleted = true
                applicationScope.launch { allowUpload.await(); otherEmployee.complete(persistedCompleted) }
            },
            animate = { awaitCancellation() })
        screenJob.cancel()
        assertTrue("Completion must already be persisted before leaving the screen", persistedCompleted)
        allowUpload.complete(Unit)
        assertTrue("Independent upload must still deliver the completion", otherEmployee.await())
        applicationScope.cancel()
    }
    @Test fun anAlreadyCancelledScreenStillCommitsBeforeAttemptingAnimation() {
        val screenJob = Job().apply { cancel() }
        var committed = false
        var animated = false
        commitTaskBeforeAnimation(CoroutineScope(screenJob + Dispatchers.Unconfined),
            commit = { committed = true }, animate = { animated = true })
        assertTrue(committed)
        assertFalse(animated)
    }
    @Test fun failedCommitDoesNotShowACompletionAnimation() {
        val scope = CoroutineScope(Job() + Dispatchers.Unconfined)
        var animated = false
        try {
            commitTaskBeforeAnimation(scope, commit = { error("persistence failed") }, animate = { animated = true })
            fail("Commit error must propagate")
        } catch (expected: IllegalStateException) {
            assertEquals("persistence failed", expected.message)
        } finally { scope.cancel() }
        assertFalse(animated)
    }
}

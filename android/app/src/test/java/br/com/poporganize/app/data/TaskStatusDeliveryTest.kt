package br.com.poporganize.app.data

import java.io.IOException
import java.util.UUID
import kotlinx.coroutines.*
import org.junit.Assert.*
import org.junit.Test

class TaskStatusDeliveryTest {
    private fun intent(task: String = "t2458", completed: Boolean = true, account: String = "u24", wasNew: Boolean = false) =
        TaskStatusIntent(UUID.randomUUID().toString(), account, "c4", task, 1, completed, wasNew)
    private class Store(events: List<TaskStatusIntent>) : TaskStatusDeliveryStore {
        val events = events.toMutableList()
        val receipts = mutableListOf<Pair<TaskStatusIntent, TaskStatusAcknowledgement>>()
        override fun pending(accountId: String) = events.filter { it.accountId == accountId && !it.blocked }
        override suspend fun acknowledge(intent: TaskStatusIntent, acknowledgement: TaskStatusAcknowledgement) {
            events.removeAll { it.mutationId == intent.mutationId }
            receipts.add(intent to acknowledgement)
        }
        override suspend fun block(intent: TaskStatusIntent, error: String, code: Int) {
            val index = events.indexOfFirst { it.mutationId == intent.mutationId }
            if (index >= 0) events[index] = intent.copy(blocked = true, error = error, errorCode = code)
        }
    }
    private fun ack(intent: TaskStatusIntent, completed: Boolean = intent.completed) =
        TaskStatusAcknowledgement(intent.mutationId, intent.serverId, completed.toString())

    @Test fun offlineCompletionSurvivesProcessRestartAndReachesOtherEmployee() = runBlocking {
        val event = intent()
        val firstProcess = Store(listOf(event))
        assertEquals(TaskStatusDeliveryResult.RETRY, deliverTaskStatuses("u24", firstProcess, { true }) { throw IOException("offline") })
        val restartedProcess = Store(firstProcess.events.map { it.copy() })
        var sharedServerCompleted = false
        val result = deliverTaskStatuses("u24", restartedProcess, { true }) { command -> sharedServerCompleted = command.completed; ack(command) }
        assertEquals(TaskStatusDeliveryResult.DONE, result)
        assertTrue(sharedServerCompleted)
        assertTrue(restartedProcess.events.isEmpty())
    }
    @Test fun lostResponseKeepsSameMutationAndCannotReplayOverLaterReopening() = runBlocking {
        val event = intent(); val store = Store(listOf(event))
        val processed = mutableSetOf<String>(); var serverCompleted = false; var applications = 0
        val first = deliverTaskStatuses("u24", store, { true }) { command ->
            processed.add(command.mutationId); serverCompleted = true; applications++; throw IOException("response lost")
        }
        assertEquals(TaskStatusDeliveryResult.RETRY, first)
        serverCompleted = false // another authorized device reopened it after the original commit
        val restarted = Store(store.events.map { it.copy() })
        deliverTaskStatuses("u24", restarted, { true }) { command ->
            if (processed.add(command.mutationId)) { serverCompleted = command.completed; applications++ }
            ack(command, serverCompleted)
        }
        assertEquals(1, applications)
        assertFalse(serverCompleted)
        assertEquals("false", restarted.receipts.single().second.taskJson)
        assertTrue(restarted.events.isEmpty())
    }
    @Test fun unrelatedRejectedTaskDoesNotBlockSharedCompletion() = runBlocking {
        val forbidden = intent("forbidden"); val shared = intent(); val store = Store(listOf(forbidden, shared))
        var otherEmployeeSeesCompleted = false
        val result = deliverTaskStatuses("u24", store, { true }) { command ->
            if (command.serverId == "forbidden") throw TaskStatusHttpFailure(403, "permission changed")
            otherEmployeeSeesCompleted = command.completed; ack(command)
        }
        assertEquals(TaskStatusDeliveryResult.DONE, result)
        assertTrue(otherEmployeeSeesCompleted)
        assertEquals(forbidden.mutationId, store.events.single().mutationId)
        assertTrue(store.events.single().blocked)
    }
    @Test fun invalidAcknowledgementNeverRemovesThePendingCompletion() = runBlocking {
        val event = intent(); val store = Store(listOf(event))
        val result = deliverTaskStatuses("u24", store, { true }) { TaskStatusAcknowledgement("wrong-mutation", event.serverId, "true") }
        assertEquals(TaskStatusDeliveryResult.RETRY, result)
        assertEquals(listOf(event), store.events)
        assertTrue(store.receipts.isEmpty())
    }
    @Test fun acknowledgementForAnotherTaskIsRejected() = runBlocking {
        val event = intent(); val store = Store(listOf(event))
        assertEquals(TaskStatusDeliveryResult.RETRY, deliverTaskStatuses("u24", store, { true }) { TaskStatusAcknowledgement(event.mutationId, "another-task", "true") })
        assertEquals(listOf(event), store.events)
    }
    @Test fun aNewActionAddedDuringUploadIsNotAcknowledgedByTheOldResponse() = runBlocking {
        val completed = intent(); val reopened = intent(completed = false); val store = Store(listOf(completed))
        assertEquals(TaskStatusDeliveryResult.RETRY, deliverTaskStatuses("u24", store, { true }) { command -> store.events.add(reopened); ack(command) })
        assertEquals(listOf(reopened), store.events)
        var serverCompleted = true
        deliverTaskStatuses("u24", store, { true }) { command -> serverCompleted = command.completed; ack(command) }
        assertFalse(serverCompleted)
        assertTrue(store.events.isEmpty())
    }
    @Test fun accountSwitchStopsSubsequentRequestsAndKeepsTheirOwner() = runBlocking {
        val store = Store(listOf(intent(), intent("second"), intent("other-user", account = "u27")))
        var currentSession = true
        val sent = mutableListOf<TaskStatusIntent>()
        val result = deliverTaskStatuses("u24", store, { currentSession }) { command -> sent.add(command); currentSession = false; ack(command) }
        assertEquals(TaskStatusDeliveryResult.PAUSED, result)
        assertEquals(1, sent.size)
        assertEquals("u24", sent.single().accountId)
        assertEquals(2, store.events.size)
        assertTrue(store.receipts.all { it.first.accountId == "u24" })
    }
    @Test fun expiredAuthenticationPausesWithoutDroppingTheIntent() = runBlocking {
        val event = intent(); val store = Store(listOf(event))
        assertEquals(TaskStatusDeliveryResult.PAUSED, deliverTaskStatuses("u24", store, { true }) { throw TaskStatusHttpFailure(401, "login required") })
        assertEquals(event.mutationId, store.events.single().mutationId)
        assertEquals(401, store.events.single().errorCode)
        assertTrue(store.receipts.isEmpty())
    }
    @Test fun waitingDraftDoesNotBlockAnExistingTaskOrSpinOnMissingCreation() = runBlocking {
        val draft = intent("not-created", wasNew = true); val known = intent(); val store = Store(listOf(draft, known))
        var knownCompleted = false
        val result = deliverTaskStatuses("u24", store, { true }) { command ->
            if (command.wasNew) throw TaskStatusHttpFailure(404, "not created yet")
            knownCompleted = true; ack(command)
        }
        assertEquals(TaskStatusDeliveryResult.DONE, result)
        assertTrue(knownCompleted)
        assertEquals(listOf(draft), store.events)
        assertFalse(store.events.single().blocked)
    }
    @Test fun serverFailureRetainsTheIntentForAutomaticRetry() = runBlocking {
        val event = intent(); val store = Store(listOf(event))
        assertEquals(TaskStatusDeliveryResult.RETRY, deliverTaskStatuses("u24", store, { true }) { throw TaskStatusHttpFailure(503, "unavailable") })
        assertEquals(listOf(event), store.events)
    }
    @Test fun cancellationNeverConfirmsAnUnacknowledgedRequest() = runBlocking {
        val event = intent(); val store = Store(listOf(event))
        try {
            deliverTaskStatuses("u24", store, { true }) { throw CancellationException("worker stopped") }
            fail("cancellation must propagate")
        } catch (_: CancellationException) { }
        assertEquals(listOf(event), store.events)
        assertTrue(store.receipts.isEmpty())
    }
    @Test fun acknowledgementPersistenceFailureKeepsTheCommandForRetry() = runBlocking {
        val event = intent(); val durable = Store(listOf(event))
        val failingDisk = object : TaskStatusDeliveryStore by durable {
            override suspend fun acknowledge(intent: TaskStatusIntent, acknowledgement: TaskStatusAcknowledgement) { throw IOException("disk unavailable") }
        }
        assertEquals(TaskStatusDeliveryResult.RETRY, deliverTaskStatuses("u24", failingDisk, { true }) { ack(it) })
        assertEquals(listOf(event), durable.events)
        assertTrue(durable.receipts.isEmpty())
    }
}

package br.com.poporganize.app.data

import kotlinx.coroutines.CancellationException

internal data class TaskStatusIntent(
    val mutationId: String,
    val accountId: String,
    val workspaceId: String,
    val serverId: String,
    val localId: Int,
    val completed: Boolean,
    val wasNew: Boolean = false,
    val blocked: Boolean = false,
    val error: String = "",
    val errorCode: Int = 0,
)

internal data class TaskStatusAcknowledgement(
    val mutationId: String,
    val serverId: String,
    val taskJson: String,
)

internal class TaskStatusHttpFailure(val status: Int, message: String) : Exception(message)
internal enum class TaskStatusDeliveryResult { DONE, RETRY, PAUSED }

internal interface TaskStatusDeliveryStore {
    fun pending(accountId: String): List<TaskStatusIntent>
    suspend fun acknowledge(intent: TaskStatusIntent, acknowledgement: TaskStatusAcknowledgement)
    suspend fun block(intent: TaskStatusIntent, error: String, code: Int)
}

/** A durable store, not the screen's coroutine, owns outstanding status commands. */
internal suspend fun deliverTaskStatuses(
    accountId: String,
    store: TaskStatusDeliveryStore,
    sessionIsCurrent: () -> Boolean,
    send: suspend (TaskStatusIntent) -> TaskStatusAcknowledgement,
): TaskStatusDeliveryResult {
    val awaitingCreation = mutableSetOf<String>()
    for (intent in store.pending(accountId).take(50)) {
        if (!sessionIsCurrent()) return TaskStatusDeliveryResult.PAUSED
        try {
            val acknowledgement = send(intent)
            check(acknowledgement.mutationId == intent.mutationId && acknowledgement.serverId == intent.serverId) {
                "O servidor não confirmou esta conclusão."
            }
            store.acknowledge(intent, acknowledgement)
        } catch (error: CancellationException) {
            throw error
        } catch (error: TaskStatusHttpFailure) {
            if (error.status == 404 && intent.wasNew) {
                awaitingCreation.add(intent.mutationId)
                continue // creation completion will explicitly wake the worker
            }
            if (error.status in listOf(400, 401, 403, 404, 409, 422)) {
                store.block(intent, error.message ?: "Não foi possível enviar esta alteração.", error.status)
                if (error.status == 401) return TaskStatusDeliveryResult.PAUSED
                // One rejected task cannot block the other users' valid completions.
            } else return TaskStatusDeliveryResult.RETRY
        } catch (_: Exception) {
            // A lost response is not an acknowledgement. Replaying the same mutation is safe.
            return TaskStatusDeliveryResult.RETRY
        }
    }
    return if (store.pending(accountId).all { it.wasNew && it.mutationId in awaitingCreation }) TaskStatusDeliveryResult.DONE else TaskStatusDeliveryResult.RETRY
}

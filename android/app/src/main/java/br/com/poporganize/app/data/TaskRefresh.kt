package br.com.poporganize.app.data

import kotlin.coroutines.cancellation.CancellationException

internal data class TaskRefreshResult<T>(
    val tasks: List<T>,
    val uploadError: Exception?,
)

/** Reading assigned tasks must not depend on permission to upload local changes. */
internal suspend fun <T> downloadTasksAfterUpload(
    upload: (suspend () -> Unit)?,
    download: suspend () -> List<T>,
): TaskRefreshResult<T> {
    val uploadError = try {
        upload?.invoke()
        null
    } catch (error: CancellationException) {
        throw error
    } catch (error: Exception) {
        error
    }
    return TaskRefreshResult(download(), uploadError)
}

/** A denied local deletion cannot hide a server task that the employee must still see. */
internal fun <T> tasksVisibleAfterRefresh(
    tasks: List<T>,
    pendingDeletionIds: Set<String>,
    id: (T) -> String,
    canDelete: (T) -> Boolean,
): List<T> = tasks.filterNot { id(it) in pendingDeletionIds && canDelete(it) }

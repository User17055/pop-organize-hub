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

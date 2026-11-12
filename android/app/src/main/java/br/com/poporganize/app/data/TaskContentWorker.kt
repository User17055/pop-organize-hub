package br.com.poporganize.app.data

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import androidx.work.*
import br.com.poporganize.app.ui.synchronizeSavedTaskChanges
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.CancellationException
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.ConcurrentHashMap

private val connectivityRegistered = AtomicBoolean(false)
internal fun observeTaskSyncConnectivity(context: Context) {
    if (!connectivityRegistered.compareAndSet(false, true)) return
    val appContext = context.applicationContext
    val validated = ConcurrentHashMap<Network, Boolean>()
    try {
        appContext.getSystemService(ConnectivityManager::class.java).registerDefaultNetworkCallback(object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                // A new connection starts a fresh attempt instead of inheriting an old backoff.
                scheduleTaskContentSync(appContext)
                scheduleTaskStatusSync(appContext)
            }
            override fun onCapabilitiesChanged(network: Network, capabilities: NetworkCapabilities) {
                val online = capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
                    capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
                if (validated.put(network, online) != true && online) {
                    scheduleTaskContentSync(appContext)
                    scheduleTaskStatusSync(appContext)
                }
            }
            override fun onLost(network: Network) { validated.remove(network) }
        })
    } catch (_: Exception) { connectivityRegistered.set(false) }
}

internal fun scheduleTaskContentSync(context: Context) {
    WorkManager.getInstance(context.applicationContext).enqueueUniqueWork("pop_task_content_send_v3", ExistingWorkPolicy.REPLACE,
        OneTimeWorkRequestBuilder<TaskContentWorker>()
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 10, TimeUnit.SECONDS).build())
}

internal fun scheduleTaskContentRecovery(context: Context) {
    WorkManager.getInstance(context.applicationContext).enqueueUniquePeriodicWork("pop_task_content_recovery_v3", ExistingPeriodicWorkPolicy.KEEP,
        PeriodicWorkRequestBuilder<TaskContentWorker>(15, TimeUnit.MINUTES)
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()).build())
    scheduleTaskContentSync(context)
}

class TaskContentWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        // The foreground coordinator owns the live Compose lists. Wake it instead of
        // reconciling a second in-memory copy against an active editor.
        if (TaskSyncRequests.foreground) {
            val prefs = applicationContext.getSharedPreferences(TaskStatusOutbox.PREFERENCES, 0)
            prefs.edit().putLong(TaskSyncRequests.SIGNAL, prefs.getLong(TaskSyncRequests.SIGNAL, 0) + 1).apply()
            return Result.success()
        }
        return try {
            if (synchronizeSavedTaskChanges(applicationContext)) Result.retry() else Result.success()
        } catch (error: CancellationException) { throw error }
        catch (_: Exception) { Result.retry() }
    }
}

package br.com.poporganize.app.data

import android.content.Context
import android.content.SharedPreferences
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

internal object TaskStatusOutbox {
    const val PREFERENCES = "pop_organize_local"
    const val VERSION = "task_status_outbox_version"
    private const val QUEUE = "task_status_outbox_v1"
    private const val RECEIPTS = "task_status_receipts_v1"
    val scopeLocks = mutableMapOf<String, Mutex>()
    private val storageLock = Any()
    private val statusFields = listOf("completed", "awaitingReview", "canComplete", "canCompleteAnytime", "isReviewer", "requiresReview")

    fun baselineKey(account: String, workspace: String) = "task_sync_base_v2_${account}_${workspace.ifBlank { "personal" }}"
    private fun cacheKey(account: String, workspace: String) = if (workspace.isBlank()) "pop_organize_account_tasks_$account" else "pop_organize_company_tasks_${account}_$workspace"
    private fun dirtyKey(account: String, workspace: String) = if (workspace.isBlank()) "pop_organize_account_tasks_dirty_$account" else "pop_organize_company_tasks_dirty_${account}_$workspace"
    private fun prefs(context: Context) = context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
    private fun durableCommit(p: SharedPreferences, editor: SharedPreferences.Editor, keys: List<String>): Boolean {
        val previous = p.all.filterKeys { it in keys }
        if (editor.commit()) return true
        // SharedPreferences changes its in-memory values even if the disk write fails.
        // Roll those back before a worker can mistake an unsaved command for a durable one.
        val restore = p.edit()
        keys.forEach { key -> when (val value = previous[key]) {
            is String -> restore.putString(key, value)
            is Boolean -> restore.putBoolean(key, value)
            is Long -> restore.putLong(key, value)
            else -> restore.remove(key)
        } }
        restore.apply()
        return false
    }
    private fun decode(raw: String?): List<TaskStatusIntent> {
        val array = JSONArray(raw ?: "[]")
        return List(array.length()) { i -> array.getJSONObject(i).let { item -> TaskStatusIntent(
            mutationId = item.getString("mutationId"), accountId = item.getString("accountId"), workspaceId = item.getString("workspaceId"),
            serverId = item.getString("serverId"), localId = item.getInt("localId"), completed = item.getBoolean("completed"),
            wasNew = item.optBoolean("wasNew"), blocked = item.optBoolean("blocked"), error = item.optString("error"), errorCode = item.optInt("errorCode"),
        ) } }
    }
    private fun encode(items: List<TaskStatusIntent>) = JSONArray().apply { items.forEach { item -> put(JSONObject()
        .put("mutationId", item.mutationId).put("accountId", item.accountId).put("workspaceId", item.workspaceId)
        .put("serverId", item.serverId).put("localId", item.localId).put("completed", item.completed)
        .put("wasNew", item.wasNew).put("blocked", item.blocked).put("error", item.error).put("errorCode", item.errorCode)) } }.toString()
    private fun identity(task: JSONObject, account: String) = task.optString("serverId").ifBlank {
        "native-$account-${task.optString("clientId").ifBlank { task.getInt("id").toString() }}"
    }
    private fun receipts(raw: String?) = JSONArray(raw ?: "[]")
    private fun copyStatus(target: JSONObject, source: JSONObject) {
        statusFields.forEach { if (source.has(it)) target.put(it, source.get(it)) }
    }
    private fun overlay(raw: JSONArray, account: String, workspace: String, pending: List<TaskStatusIntent>, acknowledgements: JSONArray): JSONArray {
        val latest = pending.filter { it.accountId == account && it.workspaceId == workspace && !it.blocked }.associateBy { it.serverId }
        val confirmed = (0 until acknowledgements.length()).map { acknowledgements.getJSONObject(it) }
            .filter { it.getString("accountId") == account && it.getString("workspaceId") == workspace }.associateBy { it.getString("serverId") }
        val result = JSONArray(raw.toString())
        repeat(result.length()) { i ->
            val task = result.getJSONObject(i)
            val id = identity(task, account)
            confirmed[id]?.getJSONObject("task")?.let { copyStatus(task, it) }
            latest[id]?.let { task.put("completed", it.completed).put("awaitingReview", false) }
        }
        return result
    }
    fun all(context: Context, account: String, workspace: String? = null): List<TaskStatusIntent> = synchronized(storageLock) {
        decode(prefs(context).getString(QUEUE, null)).filter { it.accountId == account && (workspace == null || it.workspaceId == workspace) }
    }
    fun protect(context: Context, account: String, workspace: String, tasks: JSONArray): JSONArray = synchronized(storageLock) {
        val p = prefs(context)
        overlay(tasks, account, workspace, decode(p.getString(QUEUE, null)), receipts(p.getString(RECEIPTS, null)))
    }
    fun confirmed(context: Context, account: String, workspace: String, tasks: JSONArray): JSONArray = synchronized(storageLock) {
        overlay(tasks, account, workspace, emptyList(), receipts(prefs(context).getString(RECEIPTS, null)))
    }
    fun saveCache(context: Context, account: String, workspace: String, tasks: JSONArray) = synchronized(storageLock) {
        prefs(context).edit().putString(cacheKey(account, workspace), protect(context, account, workspace, tasks).toString()).apply()
    }
    fun enqueue(context: Context, account: String, workspace: String, task: JSONObject, localTasks: JSONArray) {
        synchronized(storageLock) {
            val p = prefs(context)
            val id = identity(task, account)
            val pending = decode(p.getString(QUEUE, null)).filterNot { it.accountId == account && it.workspaceId == workspace && it.serverId == id && it.blocked } +
                TaskStatusIntent(UUID.randomUUID().toString(), account, workspace, id, task.getInt("id"), task.getBoolean("completed"), task.optString("serverId").isBlank())
            val cache = overlay(localTasks, account, workspace, pending, receipts(p.getString(RECEIPTS, null)))
            check(durableCommit(p, p.edit().putString(QUEUE, encode(pending)).putString(cacheKey(account, workspace), cache.toString())
                .putBoolean(dirtyKey(account, workspace), true).putLong(VERSION, p.getLong(VERSION, 0) + 1),
                listOf(QUEUE, cacheKey(account, workspace), dirtyKey(account, workspace), VERSION))) {
                "Não foi possível salvar a conclusão no aparelho. Tente novamente."
            }
        }
        scheduleTaskStatusSync(context)
    }
    fun migrate(context: Context, account: String, workspace: String) = synchronized(storageLock) {
        val p = prefs(context)
        val marker = "${baselineKey(account, workspace)}_status_queue_migrated"
        if (p.getBoolean(marker, false)) return@synchronized
        val cache = runCatching { JSONArray(p.getString(cacheKey(account, workspace), "[]")) }.getOrNull() ?: return@synchronized
        val base = runCatching { JSONArray(p.getString(baselineKey(account, workspace), "[]")) }.getOrNull() ?: return@synchronized
        val bases = (0 until base.length()).map { base.getJSONObject(it) }.associateBy { it.optString("serverId") }
        val pending = decode(p.getString(QUEUE, null)).toMutableList()
        repeat(cache.length()) { i ->
            val task = cache.getJSONObject(i)
            val id = identity(task, account)
            val original = bases[task.optString("serverId")]
            val changed = if (task.optString("serverId").isBlank()) task.optBoolean("completed") else
                original != null && !original.optBoolean("awaitingReview") && original.optBoolean("completed") != task.optBoolean("completed")
            if (changed && pending.none { it.accountId == account && it.workspaceId == workspace && it.serverId == id }) {
                pending.add(TaskStatusIntent(UUID.randomUUID().toString(), account, workspace, id, task.getInt("id"), task.optBoolean("completed"), task.optString("serverId").isBlank()))
            }
        }
        check(durableCommit(p, p.edit().putString(QUEUE, encode(pending)).putBoolean(marker, true).putLong(VERSION, p.getLong(VERSION, 0) + 1), listOf(QUEUE, marker, VERSION)))
    }
    fun migrateSavedAccount(context: Context, account: String) {
        migrate(context, account, "")
        val prefix = "pop_organize_company_tasks_${account}_"
        prefs(context).all.keys.filter { it.startsWith(prefix) }.forEach { migrate(context, account, it.removePrefix(prefix)) }
    }
    fun resumeAuthentication(context: Context, account: String) = synchronized(storageLock) {
        val p = prefs(context)
        val items = decode(p.getString(QUEUE, null)).map { if (it.accountId == account && it.errorCode == 401) it.copy(blocked = false, error = "", errorCode = 0) else it }
        p.edit().putString(QUEUE, encode(items)).putLong(VERSION, p.getLong(VERSION, 0) + 1).apply()
    }
    fun markCreated(context: Context, account: String, workspace: String, serverIds: Set<String>): Boolean = synchronized(storageLock) {
        val p = prefs(context)
        val old = decode(p.getString(QUEUE, null))
        val next = old.map { if (it.accountId == account && it.workspaceId == workspace && it.wasNew && it.serverId in serverIds) it.copy(wasNew = false) else it }
        if (old == next) return@synchronized false
        check(durableCommit(p, p.edit().putString(QUEUE, encode(next)).putLong(VERSION, p.getLong(VERSION, 0) + 1), listOf(QUEUE, VERSION)))
        true
    }
    fun cancel(context: Context, account: String, workspace: String, serverId: String) = synchronized(storageLock) {
        val p = prefs(context)
        val items = decode(p.getString(QUEUE, null)).filterNot { it.accountId == account && it.workspaceId == workspace && it.serverId == serverId }
        p.edit().putString(QUEUE, encode(items)).putLong(VERSION, p.getLong(VERSION, 0) + 1).commit()
    }
    /** Called while the scope lock is held, after a fresh GET. Old receipts must not override later remote edits. */
    fun consumeReceipts(context: Context, account: String, workspace: String) = synchronized(storageLock) {
        val p = prefs(context)
        val current = receipts(p.getString(RECEIPTS, null))
        val kept = JSONArray()
        repeat(current.length()) { i -> current.getJSONObject(i).let { if (it.getString("accountId") != account || it.getString("workspaceId") != workspace) kept.put(it) } }
        p.edit().putString(RECEIPTS, kept.toString()).apply()
    }
    fun deliveryStore(context: Context): TaskStatusDeliveryStore = object : TaskStatusDeliveryStore {
        override fun pending(accountId: String) = all(context, accountId).filterNot { it.blocked }
        override suspend fun acknowledge(intent: TaskStatusIntent, acknowledgement: TaskStatusAcknowledgement) {
            saveOutcome(context, intent, JSONObject(acknowledgement.taskJson), null, 0)
        }
        override suspend fun block(intent: TaskStatusIntent, error: String, code: Int) {
            saveOutcome(context, intent, null, error, code)
        }
    }
    private suspend fun saveOutcome(context: Context, intent: TaskStatusIntent, canonical: JSONObject?, error: String?, code: Int) {
        val key = baselineKey(intent.accountId, intent.workspaceId)
        val mutex = synchronized(scopeLocks) { scopeLocks.getOrPut(key) { Mutex() } }
        mutex.withLock {
            synchronized(storageLock) {
                val p = prefs(context)
                val current = decode(p.getString(QUEUE, null))
                if (current.none { it.mutationId == intent.mutationId }) return@synchronized
                val next = if (error == null) current.filterNot { it.mutationId == intent.mutationId ||
                    it.blocked && it.accountId == intent.accountId && it.workspaceId == intent.workspaceId && it.serverId == intent.serverId } else current.map {
                    if (it.mutationId == intent.mutationId) it.copy(blocked = true, error = error, errorCode = code) else it
                }
                val baseline = runCatching { JSONArray(p.getString(key, "[]")) }.getOrNull()
                val original = baseline?.let { array -> (0 until array.length()).map { array.getJSONObject(it) }.firstOrNull { it.optString("serverId") == intent.serverId } }
                val status = canonical ?: original ?: JSONObject().put("completed", false).put("awaitingReview", false)
                val prior = receipts(p.getString(RECEIPTS, null))
                val confirmed = JSONArray()
                repeat(prior.length()) { i -> prior.getJSONObject(i).let {
                    if (it.getString("accountId") != intent.accountId || it.getString("workspaceId") != intent.workspaceId || it.getString("serverId") != intent.serverId) confirmed.put(it)
                } }
                confirmed.put(JSONObject().put("accountId", intent.accountId).put("workspaceId", intent.workspaceId)
                    .put("serverId", intent.serverId).put("task", status))
                val editor = p.edit().putString(QUEUE, encode(next)).putString(RECEIPTS, confirmed.toString()).putLong(VERSION, p.getLong(VERSION, 0) + 1)
                if (canonical != null && original != null) { copyStatus(original, canonical); editor.putString(key, baseline.toString()) }
                runCatching { JSONArray(p.getString(cacheKey(intent.accountId, intent.workspaceId), "[]")) }.getOrNull()?.let { cache ->
                    editor.putString(cacheKey(intent.accountId, intent.workspaceId), overlay(cache, intent.accountId, intent.workspaceId, next, confirmed).toString())
                }
                check(durableCommit(p, editor, listOf(QUEUE, RECEIPTS, VERSION, key, cacheKey(intent.accountId, intent.workspaceId)))) {
                    "A confirmação do servidor ainda não foi salva no aparelho."
                }
            }
        }
    }
}

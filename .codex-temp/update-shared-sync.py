from pathlib import Path
p=Path('android/composeApp/src/commonMain/kotlin/br/com/poporganize/shared/PopStore.kt');s=p.read_text(encoding='utf-8')
s=s.replace('import kotlinx.coroutines.launch', 'import kotlinx.coroutines.launch\nimport kotlinx.coroutines.sync.Mutex\nimport kotlinx.coroutines.sync.withLock\nimport br.com.poporganize.shared.sync.*')
s=s.replace('    private var syncJob: Job? = null','    private var syncJob: Job? = null\n    private val taskSyncMutex = Mutex()\n    private val taskWire = TaskSyncWire(json) { it.toPopTask(WorkspaceKind.Personal, null).toApiTask() }')
s=s.replace('copy(currentUser = user, guestMode = false, apiToken = token)', '''val cached = offlineAccounts[user.id]
            copy(currentUser = user, guestMode = false, apiToken = token,
                tasks = cached?.tasks.orEmpty(), taskSyncBaselines = cached?.baselines.orEmpty(),
                pendingTaskDeletionsByWorkspace = cached?.deletions.orEmpty(),
                syncRecoveryTasks = cached?.recovery.orEmpty(), pendingDeletedServerIds = emptyList())''')
s=s.replace('''                currentUser = null,
                guestMode = false,''','''                offlineAccounts = currentUser?.id?.let { id -> offlineAccounts + (id to OfflineTaskChanges(
                    tasks, taskSyncBaselines, pendingTaskDeletionsByWorkspace, syncRecoveryTasks)) } ?: offlineAccounts,
                taskSyncBaselines = emptyMap(), pendingTaskDeletionsByWorkspace = emptyMap(), syncRecoveryTasks = emptyList(),
                currentUser = null,
                guestMode = false,''',1)
s=s.replace('''pendingDeletedServerIds = removed?.serverId
                    ?.let { (pendingDeletedServerIds + it).distinct() }
                    ?: pendingDeletedServerIds,''','''pendingTaskDeletionsByWorkspace = removed?.serverId?.let { id ->
                    val workspaceId = if (removed.workspace == WorkspaceKind.Company) removed.companyId else personalWorkspaceId
                    if (workspaceId == null) pendingTaskDeletionsByWorkspace else pendingTaskDeletionsByWorkspace +
                        (workspaceId to (pendingTaskDeletionsByWorkspace[workspaceId].orEmpty() + id).distinct())
                } ?: pendingTaskDeletionsByWorkspace,''')
s=s.replace('''if (serie == null) listOf(alvo) else tasks.filter { it.recurrenceSeriesId == serie }''','''if (serie == null) listOf(alvo) else tasks.filter { it.recurrenceSeriesId == serie && it.workspace == alvo.workspace && it.companyId == alvo.companyId }''')
s=s.replace('''pendingDeletedServerIds =
                    (pendingDeletedServerIds + removidas.mapNotNull { it.serverId }).distinct(),''','''pendingTaskDeletionsByWorkspace = (if (alvo.workspace == WorkspaceKind.Company) alvo.companyId else personalWorkspaceId)?.let { workspaceId ->
                    pendingTaskDeletionsByWorkspace + (workspaceId to (pendingTaskDeletionsByWorkspace[workspaceId].orEmpty() + removidas.mapNotNull { it.serverId }).distinct())
                } ?: pendingTaskDeletionsByWorkspace,''')
s=s.replace('''if (sync && !state.apiToken.isNullOrBlank()) syncJob = scope.launch { syncTasks() }''','''if (sync && !state.apiToken.isNullOrBlank()) {
            val token = state.apiToken!!
            val kind = state.workspace
            val companyId = state.selectedCompanyId.takeIf { kind == WorkspaceKind.Company }
            val workspaceId = if (kind == WorkspaceKind.Company) companyId else state.personalWorkspaceId
            if (workspaceId != null) syncJob = scope.launch { syncTasks(token, kind, companyId, workspaceId) }
        }''')
s=s.replace('''runCatching { json.decodeFromString<PopState>(saved) }.getOrNull()?.let { return it }''','''runCatching { json.decodeFromString<PopState>(saved) }.getOrNull()?.let { restored ->
                // Older queues had no workspace ownership. Do not send them to whichever space
                // happens to be selected after a restart; preserve the tasks for review instead.
                return if (restored.pendingDeletedServerIds.isEmpty()) restored else restored.copy(
                    pendingDeletedServerIds = emptyList(), syncRecoveryTasks = (restored.syncRecoveryTasks + restored.tasks).distinctBy { it.id })
            }''')
a=s.index('    private suspend fun refreshTasks()');b=s.index('    /**',s.index('    private suspend fun syncTasks()',a))
# The old sync function contains a long comment but no /** until its following helper documentation.
s=s[:a]+Path('.codex-temp/shared-sync-functions.txt').read_text(encoding='utf-8')+s[b:]
p.write_text(s,encoding='utf-8')

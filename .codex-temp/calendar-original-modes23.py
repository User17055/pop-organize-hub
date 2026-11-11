from pathlib import Path
import subprocess
p=Path('android/app/src/main/java/br/com/poporganize/app/ui/PopOrganizeApp.kt')
s=p.read_text(encoding='utf-8')
def replace(a,b):
    global s
    assert a in s,a[:100]
    s=s.replace(a,b,1)
replace('import br.com.poporganize.app.data.downloadTasksAfterUpload','import br.com.poporganize.app.data.tasksVisibleAfterRefresh\nimport br.com.poporganize.app.data.downloadTasksAfterUpload')
replace('private const val CALENDAR_FILTER_PENDING_PREFIX', 'private const val CALENDAR_HOURLY_VIEW_PREFIX = "pop_organize_calendar_hourly_view_"\nprivate const val CALENDAR_FILTER_PENDING_PREFIX')
replace('''            refresh.tasks.filterNot { it.serverId in pendingDeletions }''','''            tasksVisibleAfterRefresh(refresh.tasks, pendingDeletions.toSet(), PopTask::serverId, PopTask::canDelete)''')
replace('''    fun applyRemoteTasks(remoteTasks: List<PopTask>) {''','''    fun applyRemoteTasks(remoteTasks: List<PopTask>, preserveLocalEdits: Boolean = false) {''')
replace('''        val mergedTasks = mergeRemoteTaskRouting(remoteTasks, localTasks)
        val remoteJson''','''        val mergedTasks = mergeRemoteTaskRouting(remoteTasks, localTasks, preserveLocalEdits)
        val remoteJson''')
a=s.index('        runCatching {\n            if (hadLocalChanges)',s.index('    suspend fun refreshRemoteTasks('))
b=s.index('        }.onFailure { error ->',a)
s=s[:a]+'''        runCatching {
            downloadTasksAfterUpload(
                upload = if (hadLocalChanges) {
                    { syncTasksWithPendingDeletions(account, localSnapshot) }
                } else null,
                download = { loadRemoteTasks(account.apiToken) },
            )
        }.onSuccess { refresh ->
            // Ignore a response from an account that was left while requests were running.
            if (googleAccount?.id == account.id && tasksToJson(personalTasks).toString() == localTasksJson) {
                val pendingEdits = hadLocalChanges &&
                    (refresh.uploadError != null || !remoteTasksConfirmLocalEdits(refresh.tasks, localSnapshot))
                if (!pendingEdits) setAccountTasksDirty(context, account.id, false)
                // Always apply incoming assignments, including when old local edits are still pending.
                applyRemoteTasks(refresh.tasks, preserveLocalEdits = pendingEdits)
                if (pendingEdits) setAccountTasksDirty(context, account.id, true)
            }
'''+s[b:]
replace('''    var agendaExpanded by rememberSaveable { mutableStateOf(false) }''','''    var hourlyView by remember(filterStorageKey) {
        mutableStateOf(context.getSharedPreferences(LOCAL_PREFERENCES, Context.MODE_PRIVATE)
            .getBoolean("$CALENDAR_HOURLY_VIEW_PREFIX$filterStorageKey", false))
    }''')
a=s.index('                SectionTitle(selectedDateLabel, selectedCountLabel)',s.index('private fun CalendarScreen('))
b=s.index('\n            }\n        }\n    }\n\n    if (showFilters',a)
s=s[:a]+'''                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf(false to "Padrão", true to "Agenda de horas").forEach { (hours, label) ->
                        Surface(
                            onClick = {
                                hourlyView = hours
                                context.getSharedPreferences(LOCAL_PREFERENCES, Context.MODE_PRIVATE).edit()
                                    .putBoolean("$CALENDAR_HOURLY_VIEW_PREFIX$filterStorageKey", hours).apply()
                            },
                            color = if (hourlyView == hours) PopBlueSoft else PopSurface,
                            contentColor = if (hourlyView == hours) PopBlue else PopMuted,
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.weight(1f),
                        ) {
                            Row(Modifier.padding(horizontal = 10.dp, vertical = 11.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.Center) {
                                Icon(if (hours) Icons.Rounded.AccessTime else Icons.Rounded.CalendarMonth, null, modifier = Modifier.size(17.dp))
                                Spacer(Modifier.width(6.dp))
                                Text(label, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                            }
                        }
                    }
                }
                Spacer(Modifier.height(16.dp))
                SectionTitle(selectedDateLabel, selectedCountLabel)
                if (hourlyView) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(selectedDate.format(DateTimeFormatter.ofPattern("EEEE, d 'de' MMMM", locale)).replaceFirstChar { it.uppercase() }, color = PopMuted, fontSize = 11.sp, modifier = Modifier.weight(1f))
                        IconButton(onClick = { showDayTimeline = true }, modifier = Modifier.size(36.dp)) {
                            Icon(Icons.Rounded.Fullscreen, "Ampliar agenda de horas", tint = PopBlue, modifier = Modifier.size(20.dp))
                        }
                    }
                    CalendarTimelineContent(selectedDate, selectedDayTasks, onOpenTask, Modifier.height(420.dp))
                } else if (selectedDayTasks.isEmpty()) {
                    Text("Nenhuma tarefa para este dia.", color = PopMuted, fontSize = 13.sp, modifier = Modifier.padding(vertical = 18.dp))
                } else {
                    Spacer(Modifier.height(10.dp))
                    CalendarDayAgenda(selectedDayTasks, today, onOpenTask, onToggleTaskComplete)
                }'''+s[b:]
# Restore the standard day view verbatim from the original committed calendar.
original=subprocess.run(['git','show','HEAD:android/app/src/main/java/br/com/poporganize/app/ui/PopOrganizeApp.kt'],capture_output=True,check=True).stdout.decode('utf-8')
oa=original.index('@Composable\nprivate fun CalendarDayAgenda(')
ob=original.index('@Composable\nprivate fun CalendarTaskDetails(',oa)
a=s.index('@Composable\nprivate fun CalendarDayAgenda(')
b=s.index('@OptIn(ExperimentalMaterial3Api::class)',a)
s=s[:a]+original[oa:ob]+s[b:]
if 'rememberSaveable {' not in s:
    s=s.replace('import androidx.compose.runtime.saveable.rememberSaveable\n','')
p.write_text(s,encoding='utf-8')

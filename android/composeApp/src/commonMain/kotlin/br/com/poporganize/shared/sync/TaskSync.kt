package br.com.poporganize.shared.sync

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonPrimitive

/** Permission and identity fields are deliberately absent: the server owns them. */
val taskSyncFieldGroups = listOf(
    listOf("title"), listOf("description"), listOf("priority"), listOf("completed"), listOf("reminder"),
    listOf("dueDate", "dueLabel"), listOf("dueTime"), listOf("duration"), listOf("checklist"),
    listOf("department", "assignee", "assignmentType", "assignmentTargetId", "assignmentTargetLabel", "assignees"),
    listOf("recurrence", "recurrenceRule", "recurrenceDetail", "recurrenceInterval", "recurrenceEndMode", "recurrenceEndValue", "recurrenceTimes"),
    listOf("attachmentName", "attachmentUri", "attachmentMimeType", "attachmentData"),
)

fun parseSyncTaskDuration(value: String): Int? {
    val text = value.trim().lowercase()
    if (!Regex("^(?:\\d+\\s*(?:horas?|h)(?:\\s*\\d+\\s*(?:minutos?|min|m))?|\\d+\\s*(?:minutos?|min|m)?)$").matches(text)) return null
    val hours = Regex("(\\d+)\\s*(?:horas?|h)").find(text)
    val minutes = Regex("(\\d+)\\s*(?:minutos?|min|m)(?![a-z])").find(text)
    val h = hours?.groupValues?.get(1)?.toLongOrNull() ?: if (hours == null) 0 else return null
    val m = minutes?.groupValues?.get(1)?.toLongOrNull() ?: if (minutes != null) return null else if (hours == null) text.toLongOrNull() ?: return null else 0
    if (h !in 0..24 || m !in 0..1440) return null
    return (h * 60 + m).takeIf { it in 1..1440 }?.toInt()
}

private fun comparableTaskField(key: String, value: String?): String? {
    if (key !in listOf("title", "description", "duration", "reminder")) return value
    val text = value?.let { runCatching { (Json.parseToJsonElement(it) as? JsonPrimitive)?.content ?: it }.getOrDefault(it) }.orEmpty()
    return when (key) {
        "title", "description" -> text.trim()
        "duration" -> parseSyncTaskDuration(text)?.toString().orEmpty()
        "reminder" -> if (text in listOf("Sem lembrete", "Sem notificação")) "" else text
        else -> text
    }
}

fun sameTaskFields(a: Map<String, String>, b: Map<String, String>, group: List<String>) =
    group.filter { it != "dueLabel" }.all { comparableTaskField(it, a[it]) == comparableTaskField(it, b[it]) }

fun taskHasChanges(base: Map<String, String>, local: Map<String, String>) =
    taskSyncFieldGroups.any { !sameTaskFields(base, local, it) }

data class ReconciledTaskFields(val task: Map<String, String>, val baseline: Map<String, String>)

/** Keep only actual unsent fields. Unrelated remote edits and permission revocations win. */
fun reconcileTaskFields(
    base: Map<String, String>,
    local: Map<String, String>,
    remote: Map<String, String>,
    submitted: Map<String, String>? = null,
    canEdit: Boolean = true,
    canComplete: Boolean = true,
): ReconciledTaskFields {
    val task = remote.toMutableMap()
    val baseline = remote.toMutableMap()
    for (group in taskSyncFieldGroups) {
        val allowed = when (group.first()) {
            "reminder" -> true
            "completed" -> canComplete
            else -> canEdit
        }
        // A successful submission may have become the base while the user edited again.
        val effectiveBase = if (submitted != null && sameTaskFields(submitted, remote, group)) remote else base
        if (allowed && !sameTaskFields(effectiveBase, local, group) && !sameTaskFields(local, remote, group)) {
            for (key in group) {
                local[key]?.let { task[key] = it }
                effectiveBase[key]?.let { baseline[key] = it }
            }
        }
    }
    return ReconciledTaskFields(task, baseline)
}

fun remainingTaskDeletions(pending: List<String>, acknowledged: Collection<String>): List<String> =
    pending.filterNot { it in acknowledged }

/** Retain group objects by stable ID, never by their position in the workspace list. */
fun <T> remapWorkspaceTasks(
    oldIds: List<String>, oldGroups: List<T>, newIds: List<String>, create: (String) -> T,
): List<T> {
    val groups = oldIds.zip(oldGroups).toMap()
    return newIds.map { groups[it] ?: create(it) }
}

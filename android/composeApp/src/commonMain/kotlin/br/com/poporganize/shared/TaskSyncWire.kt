package br.com.poporganize.shared

import br.com.poporganize.shared.sync.*
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.*

internal class TaskSyncWire(private val json: Json, private val normalize: (ApiTask) -> ApiTask) {
    fun raw(task: ApiTask): Map<String, String> = json.parseToJsonElement(json.encodeToString(task)).jsonObject.mapValues { it.value.toString() }
    fun fields(task: ApiTask) = raw(normalize(task))
    fun decode(fields: Map<String, String>): ApiTask = json.decodeFromString(JsonObject(fields.mapValues { json.parseToJsonElement(it.value) }).toString())
    private fun overlay(target: MutableMap<String, String>, source: Map<String, String>, group: List<String>) {
        group.forEach { key -> source[key]?.let { target[key] = it } ?: target.remove(key) }
    }
    fun mutation(base: ApiTask, local: ApiTask): ApiTask? {
        val old = fields(base); val now = raw(local)
        val changed = taskSyncFieldGroups.filter { !sameTaskFields(old, now, it) }
        if (changed.isEmpty()) return null
        val result = raw(base).toMutableMap()
        changed.forEach { overlay(result, now, it) }
        listOf("dateMoveFrom", "dateMoveScope").forEach { key -> now[key]?.let { result[key] = it } }
        return decode(result)
    }
    fun reconcile(base: ApiTask, local: ApiTask, remote: ApiTask, submitted: ApiTask? = null): Pair<ApiTask, ApiTask> {
        val incoming = fields(remote)
        val result = reconcileTaskFields(fields(base), raw(local), incoming,
            submitted?.let(::fields), remote.canEdit, remote.canComplete)
        val task = raw(remote).toMutableMap()
        val baseline = raw(remote).toMutableMap()
        taskSyncFieldGroups.forEach { group ->
            if (!sameTaskFields(result.task, incoming, group)) overlay(task, result.task, group)
            if (!sameTaskFields(result.baseline, incoming, group)) overlay(baseline, raw(base), group)
        }
        return decode(task) to decode(baseline)
    }
}

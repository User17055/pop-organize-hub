package br.com.poporganize.app.data

internal fun agendaMinute(value: String): Int? {
    if (!Regex("^([01]\\d|2[0-3]):[0-5]\\d$").matches(value)) return null
    return value.take(2).toInt() * 60 + value.takeLast(2).toInt()
}

internal fun taskDurationMinutes(value: String): Int? {
    val normalized = value.trim().lowercase()
    if (normalized.isBlank() || normalized == "sem duração") return null
    if (!Regex("^(?:\\d+\\s*(?:horas?|h)(?:\\s*\\d+\\s*(?:minutos?|min|m))?|\\d+\\s*(?:minutos?|min|m)?)$").matches(normalized)) return null
    val hoursMatch = Regex("(\\d+)\\s*(?:horas?|h)").find(normalized)
    val minutesMatch = Regex("(\\d+)\\s*(?:minutos?|min|m)(?![a-z])").find(normalized)
    val hours = hoursMatch?.groupValues?.get(1)?.let { it.toLongOrNull() ?: return null } ?: 0
    val minutes = minutesMatch?.groupValues?.get(1)?.let { it.toLongOrNull() ?: return null }
        ?: if (hoursMatch == null) normalized.toLongOrNull() ?: return null else 0
    if (hours !in 0..24 || minutes !in 0..1440) return null
    return (hours * 60 + minutes).takeIf { it in 1..1440 }?.toInt()
}

internal fun taskDurationLabel(minutes: Int?): String = when {
    minutes == null || minutes <= 0 -> "Sem duração"
    minutes < 60 -> "$minutes min"
    minutes % 60 == 0 -> "${minutes / 60} h"
    else -> "${minutes / 60} h ${minutes % 60} min"
}

internal fun agendaTimeLabel(minute: Int): String =
    "%02d:%02d".format(Math.floorMod(minute, 1440) / 60, Math.floorMod(minute, 1440) % 60)

internal fun taskEndTime(start: String, duration: String): String? {
    val minute = agendaMinute(start) ?: return null
    val minutes = taskDurationMinutes(duration) ?: return null
    val end = minute + minutes
    return agendaTimeLabel(end) + if (end >= 1440) " +1" else ""
}

internal data class AgendaInterval<T>(val key: String, val task: T, val startMinute: Int, val durationMinutes: Int)
internal data class AgendaPlacement<T>(val interval: AgendaInterval<T>, val column: Int, val columns: Int)

/** Overlapping tasks share the available width; adjacent tasks use the same column. */
internal fun <T> layoutAgendaIntervals(intervals: List<AgendaInterval<T>>, minimumDurationMinutes: Int = 30): List<AgendaPlacement<T>> {
    val sorted = intervals.sortedWith(compareBy({ it.startMinute }, { it.key }))
    val result = mutableListOf<AgendaPlacement<T>>()
    var group = mutableListOf<Pair<AgendaInterval<T>, Int>>()
    val columnEnds = mutableListOf<Int>()
    var groupEnd = Int.MIN_VALUE
    fun flush() {
        val count = columnEnds.size
        result.addAll(group.map { (interval, column) -> AgendaPlacement(interval, column, count) })
        group = mutableListOf()
        columnEnds.clear()
    }
    for (interval in sorted) {
        if (interval.startMinute >= groupEnd && group.isNotEmpty()) flush()
        val column = columnEnds.indexOfFirst { it <= interval.startMinute }.let { if (it < 0) columnEnds.size else it }
        val end = interval.startMinute + interval.durationMinutes.coerceAtLeast(minimumDurationMinutes.coerceAtLeast(30))
        if (column == columnEnds.size) columnEnds.add(end) else columnEnds[column] = end
        group.add(interval to column)
        groupEnd = columnEnds.maxOrNull() ?: end
    }
    if (group.isNotEmpty()) flush()
    return result
}

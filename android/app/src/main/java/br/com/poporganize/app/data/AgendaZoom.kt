package br.com.poporganize.app.data

import kotlin.math.roundToInt
import kotlin.math.ceil
import kotlin.math.max
import kotlin.math.abs

internal fun normalizedAgendaZoom(value: Float): Float =
    if (value.isFinite()) value.coerceIn(40f, 220f) else 100f

internal fun agendaHourHeight(zoom: Float): Float = 96f * normalizedAgendaZoom(zoom) / 100f

internal fun agendaTimeOffset(minute: Int, hourHeight: Float): Float = minute * hourHeight / 60f

internal fun agendaReferenceTimeVisible(marker: Int, current: Int?, hourHeight: Float, labelHeight: Float): Boolean =
    current == null || abs(agendaTimeOffset(marker, hourHeight) - agendaTimeOffset(current, hourHeight)) >= labelHeight + 2f

internal fun agendaMinimumCardHeight(fontScale: Float): Float = max(40f, 28f * fontScale.coerceAtLeast(1f) + 12f)

internal fun agendaMinimumDuration(zoom: Float, fontScale: Float): Int =
    ceil((agendaMinimumCardHeight(fontScale) + 4f) * 60f / agendaHourHeight(zoom)).toInt().coerceAtLeast(30)

/** Exact time span; missing duration is a point in time, never a default half hour. */
internal fun agendaDurationHeight(start: Int, duration: Int, zoom: Float): Float =
    duration.coerceAtLeast(0).coerceAtMost((1440 - start).coerceAtLeast(0)) * agendaHourHeight(zoom) / 60f

/** Readable label bounds are separate from the time span drawn on the calendar. */
internal fun agendaCardHeight(start: Int, duration: Int, zoom: Float, fontScale: Float): Float =
    max(agendaMinimumCardHeight(fontScale), agendaDurationHeight(start, duration, zoom) - 4f)

internal fun changedAgendaZoom(current: Float, factor: Float): Float =
    if (factor.isFinite() && factor > 0f) normalizedAgendaZoom(normalizedAgendaZoom(current) * factor)
    else normalizedAgendaZoom(current)

internal fun agendaMinuteAt(contentY: Float, zoom: Float, density: Float): Float =
    (contentY * 60f / (agendaHourHeight(zoom) * density)).coerceIn(0f, 1440f)

/** Negative offsets are intentional when the timeline starts below the top of the viewport. */
internal fun agendaAnchorScrollOffset(minute: Float, zoom: Float, density: Float, fingerY: Float): Int =
    (minute * agendaHourHeight(zoom) * density / 60f - fingerY).roundToInt()

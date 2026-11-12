package br.com.poporganize.app.ui

import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.gestures.calculateCentroid
import androidx.compose.foundation.gestures.calculateZoom
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.runtime.MutableFloatState
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.pointer.PointerEventPass
import androidx.compose.ui.input.pointer.pointerInput
import br.com.poporganize.app.data.agendaAnchorScrollOffset
import br.com.poporganize.app.data.agendaHourHeight
import br.com.poporganize.app.data.agendaMinuteAt
import br.com.poporganize.app.data.changedAgendaZoom

internal const val AGENDA_TIMELINE_KEY = "calendar-hour-timeline"

/** Two fingers own zoom; a single finger is left entirely to the existing calendar scroll. */
internal fun Modifier.agendaPinchZoom(
    enabled: Boolean,
    scopeKey: String,
    listState: LazyListState,
    zoom: MutableFloatState,
    onCommit: (Float) -> Unit,
): Modifier = pointerInput(enabled, scopeKey, zoom, listState) {
    if (!enabled) return@pointerInput
    awaitEachGesture {
        awaitFirstDown(requireUnconsumed = false, pass = PointerEventPass.Initial)
        var active = false
        var gestureZoom = zoom.floatValue
        var anchorMinute = 0f
        var ids = emptySet<Long>()
        try {
            do {
                val event = awaitPointerEvent(PointerEventPass.Initial)
                val pressed = event.changes.filter { it.pressed }
                if (pressed.size >= 2) {
                    val timeline = listState.layoutInfo.visibleItemsInfo.firstOrNull { it.key == AGENDA_TIMELINE_KEY }
                    val currentIds = pressed.map { it.id.value }.toSet()
                    val centerY = pressed.map { it.position.y }.average().toFloat()
                    if (timeline != null && (!active || ids != currentIds)) {
                        val localY = centerY - timeline.offset
                        if (active || localY in 0f..(24f * agendaHourHeight(gestureZoom) * density)) {
                            gestureZoom = zoom.floatValue
                            anchorMinute = agendaMinuteAt(localY, gestureZoom, density)
                            active = true
                            ids = currentIds
                        }
                    } else if (timeline != null && active) {
                        gestureZoom = changedAgendaZoom(gestureZoom, event.calculateZoom())
                        zoom.floatValue = gestureZoom
                        val fingerY = event.calculateCentroid().y
                        // Scale and anchor are applied in the same remeasure, without launching
                        // a scroll animation per pointer event or feeding back stale layout bounds.
                        listState.requestScrollToItem(timeline.index,
                            agendaAnchorScrollOffset(anchorMinute, gestureZoom, density, fingerY))
                    }
                }
                // Initial pass cancels child taps and parent drag once a pinch starts. Keep
                // ownership until both fingers lift, preventing a release from opening a task.
                if (active) event.changes.forEach { it.consume() }
            } while (event.changes.any { it.pressed })
        } finally {
            if (active) onCommit(gestureZoom)
        }
    }
}

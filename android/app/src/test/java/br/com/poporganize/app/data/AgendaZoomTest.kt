package br.com.poporganize.app.data

import org.junit.Assert.*
import org.junit.Test

class AgendaZoomTest {
    @Test fun currentTimeStaysBeforeTheNextHourAtEveryZoom() {
        for (zoom in listOf(40f, 100f, 220f)) {
            val height = agendaHourHeight(zoom)
            assertTrue(agendaTimeOffset(10 * 60 + 58, height) < agendaTimeOffset(11 * 60, height))
            assertFalse(agendaReferenceTimeVisible(11 * 60, 10 * 60 + 58, height, 14f))
            assertTrue(agendaReferenceTimeVisible(12 * 60, 10 * 60 + 58, height, 14f))
            assertTrue(agendaReferenceTimeVisible(11 * 60, null, height, 14f))
        }
    }
    @Test fun absentDurationDoesNotReserveHalfAnHour() {
        assertEquals(0f, agendaDurationHeight(540, 0, 100f), .001f)
        assertNull(taskEndTime("09:00", "Sem duração"))
    }
    @Test fun shortDurationsKeepTheirActualSpanEvenWhenTheLabelNeedsMoreRoom() {
        assertEquals(8f, agendaDurationHeight(540, 5, 100f), .001f)
        assertEquals(3.2f, agendaDurationHeight(540, 5, 40f), .001f)
        assertTrue(agendaCardHeight(540, 5, 40f, 1f) > agendaDurationHeight(540, 5, 40f))
        assertEquals("09:05", taskEndTime("09:00", "5 min"))
    }
    @Test fun minimumZoomKeepsShortTaskTitlesReadableWithLargeFonts() {
        for (fontScale in listOf(1f, 1.5f, 2f)) {
            val height = agendaCardHeight(540, 15, 40f, fontScale)
            assertTrue(height >= 16f * fontScale + 8f)
        }
    }
    @Test fun readableFootprintsDoNotOverlapOrChangeTheRealDuration() {
        val tasks = listOf(AgendaInterval("a", "a", 540, 15), AgendaInterval("b", "b", 570, 15))
        val compact = layoutAgendaIntervals(tasks, agendaMinimumDuration(40f, 1f))
        assertNotEquals(compact[0].column, compact[1].column)
        assertEquals(15, compact[0].interval.durationMinutes)
        val expanded = layoutAgendaIntervals(tasks, agendaMinimumDuration(220f, 1f))
        assertEquals(expanded[0].column, expanded[1].column)
    }
    @Test fun LastMinuteOfTheDayStillHasRoomForItsTitle() {
        assertTrue(agendaCardHeight(1439, 1, 40f, 1f) >= 28f)
    }
    @Test fun pinchKeepsTheSameMinuteUnderTheFingers() {
        val minute = agendaMinuteAt(864f, 100f, 1f) // 09:00
        val offset = agendaAnchorScrollOffset(minute, 175f, 1f, 300f)
        assertEquals(540f, minute, .001f)
        assertEquals(300f, minute * agendaHourHeight(175f) / 60f - offset, 1f)
    }
    @Test fun anchoringSupportsHeadersAndDifferentDisplayDensities() {
        val minute = agendaMinuteAt(240f, 100f, 2.5f)
        val offset = agendaAnchorScrollOffset(minute, 50f, 2.5f, 500f)
        assertEquals(-380, offset)
        assertEquals(500f, minute * agendaHourHeight(50f) * 2.5f / 60f - offset, 1f)
    }
    @Test fun reversingThePinchRestoresTheOriginalScaleAndPosition() {
        val enlarged = changedAgendaZoom(100f, 1.6f)
        val restored = changedAgendaZoom(enlarged, .625f)
        assertEquals(100f, restored, .001f)
        assertEquals(420, agendaAnchorScrollOffset(450f, restored, 1f, 300f))
    }
    @Test fun continuousZoomIsBoundedWithoutDiscreteSteps() {
        assertEquals(101.25f, changedAgendaZoom(100f, 1.0125f), .001f)
        assertEquals(40f, changedAgendaZoom(100f, .01f), .001f)
        assertEquals(220f, changedAgendaZoom(100f, 100f), .001f)
        assertEquals(100f, changedAgendaZoom(100f, Float.NaN), .001f)
        assertEquals(100f, changedAgendaZoom(100f, -1f), .001f)
        assertEquals(100f, normalizedAgendaZoom(Float.POSITIVE_INFINITY), .001f)
    }
}

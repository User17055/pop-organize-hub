package br.com.poporganize.app.data

import org.junit.Assert.*
import org.junit.Test

class CalendarAgendaTest {
    @Test fun durationLabelsRoundTrip() {
        for (minutes in listOf(1, 15, 45, 60, 90, 120, 1440)) {
            assertEquals(minutes, taskDurationMinutes(taskDurationLabel(minutes)))
        }
        assertNull(taskDurationMinutes("Sem duração"))
        assertNull(taskDurationMinutes("0 min"))
        assertNull(taskDurationMinutes("25 h"))
    }
    @Test fun clockValidatesAndWrapsAtMidnight() {
        assertEquals(570, agendaMinute("09:30"))
        assertNull(agendaMinute("24:00"))
        assertNull(agendaMinute("09:75"))
        assertEquals("01:30", agendaTimeLabel(1530))
    }
    @Test fun overlappingTasksHaveDifferentColumns() {
        val result = layoutAgendaIntervals(listOf(
            AgendaInterval("a", "a", 540, 90),
            AgendaInterval("b", "b", 570, 60),
            AgendaInterval("c", "c", 630, 60),
        ))
        assertEquals(2, result[0].columns)
        assertEquals(2, result[1].columns)
        assertNotEquals(result[0].column, result[1].column)
        assertEquals(1, result[2].columns)
    }
    @Test fun chainedOverlapsKeepAConsistentWidth() {
        val result = layoutAgendaIntervals(listOf(
            AgendaInterval("a", "a", 540, 60),
            AgendaInterval("b", "b", 570, 60),
            AgendaInterval("c", "c", 600, 60),
        ))
        assertTrue(result.all { it.columns == 2 })
        assertEquals(result[0].column, result[2].column)
    }
    @Test fun simultaneousTasksRemainReachable() {
        val result = layoutAgendaIntervals((1..4).map { AgendaInterval("$it", "$it", 540, 30) })
        assertEquals(4, result.map { it.column }.distinct().size)
        assertTrue(result.all { it.columns == 4 })
    }
}

package br.com.poporganize.app

import android.content.Intent
import android.content.ComponentName
import android.content.pm.PackageManager
import android.graphics.Rect
import android.os.SystemClock
import android.view.InputDevice
import android.view.MotionEvent
import android.view.accessibility.AccessibilityNodeInfo
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import java.io.File
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith

/** Uses only the debug fixture and real two-pointer input; no production tasks are edited. */
@RunWith(AndroidJUnit4::class)
class AgendaPinchZoomDeviceTest {
    private val instrumentation = InstrumentationRegistry.getInstrumentation()
    private val ui = instrumentation.uiAutomation
    private val context = instrumentation.targetContext
    private val zoomKey = "pop_organize_calendar_hour_zoom_pinch_calendar-design-preview-v2"

    private fun nodes(includeDescriptions: Boolean = false): List<Pair<String, Rect>> {
        // The accessibility client caches offscreen coordinates across lazy-list remeasures.
        if (android.os.Build.VERSION.SDK_INT >= 34) ui.clearCache()
        val result = mutableListOf<Pair<String, Rect>>()
        fun visit(node: AccessibilityNodeInfo) {
            val bounds = Rect(); node.getBoundsInScreen(bounds)
            node.text?.toString()?.let { result.add(it to bounds) }
            if (includeDescriptions) node.contentDescription?.toString()?.let { result.add(it to bounds) }
            for (index in 0 until node.childCount) node.getChild(index)?.let(::visit)
        }
        ui.rootInActiveWindow?.let(::visit)
        return result
    }

    private fun hours() = nodes().filter { (text, bounds) ->
        text.matches(Regex("^(?:[01]\\d|2[0-3]):00$")) && bounds.left < 200 && bounds.height() > 20
    }.sortedBy { it.second.top }

    private fun spacing(): Float {
        val entries = hours()
        val gaps = entries.zipWithNext().mapNotNull { (a, b) ->
            if (b.first.take(2).toInt() - a.first.take(2).toInt() == 1)
                (b.second.top - a.second.top).toFloat() else null
        }.sorted()
        assertTrue("At least two consecutive hour markers must remain visible", gaps.isNotEmpty())
        return gaps[gaps.size / 2]
    }

    private fun minuteAt(y: Float): Float {
        val entry = hours().minBy { kotlin.math.abs(it.second.top - y) }
        return entry.first.take(2).toInt() * 60f + (y - entry.second.top) * 60f / spacing()
    }

    private fun event(action: Int, down: Long, points: List<Pair<Float, Float>>) {
        val properties = Array(points.size) { index -> MotionEvent.PointerProperties().apply {
            id = index; toolType = MotionEvent.TOOL_TYPE_FINGER
        } }
        val coordinates = Array(points.size) { index -> MotionEvent.PointerCoords().apply {
            x = points[index].first; y = points[index].second; pressure = 1f; size = .1f
        } }
        val event = MotionEvent.obtain(down, SystemClock.uptimeMillis(), action, points.size,
            properties, coordinates, 0, 0, 1f, 1f, 0, 0, InputDevice.SOURCE_TOUCHSCREEN, 0)
        try { assertTrue("Input injection", ui.injectInputEvent(event, true)) }
        finally { event.recycle() }
    }

    private fun drag(fromY: Float, toY: Float) {
        val down = SystemClock.uptimeMillis()
        event(MotionEvent.ACTION_DOWN, down, listOf(550f to fromY))
        for (step in 1..40) {
            SystemClock.sleep(20)
            event(MotionEvent.ACTION_MOVE, down, listOf(550f to (fromY + (toY - fromY) * step / 40)))
        }
        event(MotionEvent.ACTION_UP, down, listOf(550f to toY))
        SystemClock.sleep(600)
    }

    private fun pinch(centerY: Float, from: Float, to: Float) {
        val down = SystemClock.uptimeMillis()
        fun points(radius: Float) = listOf((540f - radius) to centerY, (540f + radius) to centerY)
        event(MotionEvent.ACTION_DOWN, down, points(from).take(1))
        event(MotionEvent.ACTION_POINTER_DOWN or (1 shl MotionEvent.ACTION_POINTER_INDEX_SHIFT), down, points(from))
        for (step in 1..40) {
            SystemClock.sleep(16)
            event(MotionEvent.ACTION_MOVE, down, points(from + (to - from) * step / 40))
        }
        event(MotionEvent.ACTION_POINTER_UP or (1 shl MotionEvent.ACTION_POINTER_INDEX_SHIFT), down, points(to))
        event(MotionEvent.ACTION_UP, down, points(to).take(1))
        SystemClock.sleep(500)
    }

    private fun screenshot(name: String) {
        val bitmap = ui.takeScreenshot() ?: error("Screenshot unavailable")
        File(context.getExternalFilesDir(null), name).outputStream().use {
            bitmap.compress(android.graphics.Bitmap.CompressFormat.PNG, 100, it)
        }
        bitmap.recycle()
    }

    @Test fun pinchScalesContinuouslyKeepsTimeAnchoredAndLeavesSingleFingerScrollWorking() {
        val prefs = context.getSharedPreferences("pop_organize_local", 0)
        val priorZoom = prefs.all[zoomKey]
        val viewKey = "pop_organize_calendar_hourly_view_calendar-design-preview-v2"
        val priorView = prefs.all[viewKey]
        val fixture = ComponentName(context.packageName, "br.com.poporganize.app.CalendarPreviewActivity")
        val priorComponentState = context.packageManager.getComponentEnabledSetting(fixture)
        context.packageManager.setComponentEnabledSetting(fixture, PackageManager.COMPONENT_ENABLED_STATE_ENABLED, PackageManager.DONT_KILL_APP)
        prefs.edit().putFloat(zoomKey, 100f).putBoolean(viewKey, true).commit()
        try {
            context.startActivity(Intent().setClassName(context.packageName, "br.com.poporganize.app.CalendarPreviewActivity")
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK))
            SystemClock.sleep(1800)
            // Reach the sample task at 09:00, so both fingers start over a clickable task card.
            var hour = hours().firstOrNull { it.first == "09:00" }
            var attempts = 0
            while ((hour == null || hour.second.top !in 350..1700) && attempts++ < 18) {
                drag(1750f, 1150f)
                hour = hours().firstOrNull { it.first == "09:00" }
            }
            assertNotNull("Sample task hour is visible", hour)
            val center = hour!!.second.top + 65f
            val initialSpacing = spacing()
            val minute = minuteAt(center)
            screenshot("agenda-pinch-before.png")
            assertFalse("A task without duration must not acquire a half-hour end time",
                nodes().any { it.first == "09:00–09:30" })
            fun assertStartTimeBelowTitle() {
                val entries = nodes()
                val title = entries.first { it.first == "Alinhamento da equipe" }.second
                assertTrue("Start time is below the compact card title", entries.any {
                    it.first == "09:00" && it.second.left > 200 && it.second.top >= title.bottom
                })
                for (label in listOf("Tarefa recorrente", "Possui anotação", "Possui anexo")) {
                    assertTrue("The compact recurring card keeps its $label icon next to its time", nodes(true).any {
                        it.first.contains(label) && it.second.height() > 0 && it.second.top >= title.bottom - 4 && it.second.top <= title.bottom + 120
                    })
                }
            }
            assertStartTimeBelowTitle()
            pinch(center, 100f, 205f)
            val enlargedSpacing = spacing()
            screenshot("agenda-pinch-in.png")
            assertTrue("Spreading fingers increases hour spacing: before=$initialSpacing after=$enlargedSpacing saved=${prefs.getFloat(zoomKey, 0f)}", enlargedSpacing > initialSpacing * 1.6f)
            assertEquals("The same time stays under the fingers", minute, minuteAt(center), 2f)
            assertEquals(205f, prefs.getFloat(zoomKey, 0f), 3f)
            pinch(center, 205f, 100f)
            assertTrue("Closing fingers shows more hours", spacing() < enlargedSpacing * .7f)
            assertEquals("Reverse pinch preserves time", minute, minuteAt(center), 2f)
            assertEquals(100f, prefs.getFloat(zoomKey, 0f), 3f)
            screenshot("agenda-pinch-out.png")
            pinch(center, 205f, 70f)
            assertEquals("Minimum zoom reached", 40f, prefs.getFloat(zoomKey, 0f), .5f)
            assertTrue("More hours fit at minimum zoom", spacing() < initialSpacing * .5f)
            assertTrue("Short task title remains visible at minimum zoom", nodes().any {
                it.first == "Alinhamento da equipe" && it.second.height() >= 20
            })
            screenshot("agenda-pinch-min.png")
            assertStartTimeBelowTitle()
            val beforeDrag = minuteAt(1000f)
            drag(1500f, 1000f)
            assertTrue("One-finger scrolling still works", minuteAt(1000f) > beforeDrag + 30f)
            assertFalse("Pinch must not open the task", nodes().any { it.first == "Detalhes da tarefa" })
        } finally {
            val restore = prefs.edit()
            if (priorZoom is Float) restore.putFloat(zoomKey, priorZoom) else restore.remove(zoomKey)
            if (priorView is Boolean) restore.putBoolean(viewKey, priorView) else restore.remove(viewKey)
            restore.commit()
            context.packageManager.setComponentEnabledSetting(fixture, priorComponentState, PackageManager.DONT_KILL_APP)
        }
    }
}

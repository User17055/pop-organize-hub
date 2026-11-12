package br.com.poporganize.app

import android.content.ComponentName
import android.content.Intent
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

@RunWith(AndroidJUnit4::class)
class TaskScheduleDeviceTest {
    private val instrumentation = InstrumentationRegistry.getInstrumentation()
    private val ui = instrumentation.uiAutomation
    private val context = instrumentation.targetContext
    private fun nodes(): List<Triple<String, String, Rect>> {
        if (android.os.Build.VERSION.SDK_INT >= 34) ui.clearCache()
        val result = mutableListOf<Triple<String,String,Rect>>()
        fun visit(node: AccessibilityNodeInfo) {
            val bounds = Rect(); node.getBoundsInScreen(bounds)
            result.add(Triple(node.text?.toString().orEmpty(),node.className?.toString().orEmpty(),bounds))
            for (index in 0 until node.childCount) node.getChild(index)?.let(::visit)
        }
        ui.rootInActiveWindow?.let(::visit)
        return result
    }
    private fun requireText(text: String): Rect {
        val deadline = SystemClock.uptimeMillis() + 5000
        do {
            nodes().firstOrNull { it.first == text && it.third.width() > 0 }?.let { return it.third }
            SystemClock.sleep(80)
        } while (SystemClock.uptimeMillis() < deadline)
        error("Visible text not found: $text")
    }
    private fun tap(text: String) {
        val bounds = requireText(text)
        val down = SystemClock.uptimeMillis()
        for (action in listOf(MotionEvent.ACTION_DOWN,MotionEvent.ACTION_UP)) {
            val event = MotionEvent.obtain(down,SystemClock.uptimeMillis(),action,bounds.exactCenterX(),bounds.exactCenterY(),0)
            event.source = InputDevice.SOURCE_TOUCHSCREEN
            try { assertTrue(ui.injectInputEvent(event,true)) } finally { event.recycle() }
        }
        SystemClock.sleep(250)
    }
    private fun screenshot(name: String) {
        val bitmap = ui.takeScreenshot() ?: error("Screenshot unavailable")
        File(context.getExternalFilesDir(null),name).outputStream().use { bitmap.compress(android.graphics.Bitmap.CompressFormat.PNG,100,it) }
        bitmap.recycle()
    }
    @Test fun creationAndEditingUseTheSameRangeAndDateUsesTheCalendar() {
        val fixture = ComponentName(context.packageName,"br.com.poporganize.app.TaskSchedulePreviewActivity")
        val original = context.packageManager.getComponentEnabledSetting(fixture)
        context.packageManager.setComponentEnabledSetting(fixture,PackageManager.COMPONENT_ENABLED_STATE_ENABLED,PackageManager.DONT_KILL_APP)
        try {
            context.startActivity(Intent().setComponent(fixture).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK))
            requireText("LisonTech")
            screenshot("schedule45-brand-dark.png")
            tap("Nova atividade")
            requireText("Início"); tap("Até")
            requireText("10:00"); requireText("Duração calculada: 1 h")
            screenshot("schedule45-time-range.png")
            tap("Confirmar"); requireText("Cadastro: 09:00 até 10:00")
            tap("Atividade cadastrada")
            requireText("01:00"); requireText("Duração calculada: 2 h · dia seguinte")
            tap("Remover término"); tap("Confirmar"); requireText("Edição: 23:00")
            tap("Selecionar data"); requireText("Novembro 2026")
            assertFalse("The date must not require typing",nodes().any { it.second == "android.widget.EditText" })
            tap("15"); screenshot("schedule45-date.png"); tap("Confirmar"); requireText("Data: 15/11/2026")
            tap("Tema claro"); requireText("LisonTech"); screenshot("schedule45-brand-light.png")
        } finally { context.packageManager.setComponentEnabledSetting(fixture,original,PackageManager.DONT_KILL_APP) }
    }
}

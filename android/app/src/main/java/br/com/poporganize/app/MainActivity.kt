package br.com.poporganize.app

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import br.com.poporganize.app.notifications.clearPopNotifications
import br.com.poporganize.app.notifications.EXTRA_OPEN_TASK_ID
import br.com.poporganize.app.notifications.schedulePopNotifications
import br.com.poporganize.app.ui.PopOrganizeApp

class MainActivity : ComponentActivity() {
    private var pendingTaskId by mutableStateOf<Int?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        schedulePopNotifications(this)
        enableEdgeToEdge()
        WindowCompat.getInsetsController(window, window.decorView).apply {
            isAppearanceLightStatusBars = false
            systemBarsBehavior =
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            hide(WindowInsetsCompat.Type.navigationBars())
        }
        pendingTaskId = intent?.taskIdExtra()
        setContent {
            PopOrganizeApp(
                externalTaskId = pendingTaskId,
                onExternalTaskOpened = { pendingTaskId = null },
            )
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        pendingTaskId = intent.taskIdExtra()
    }

    override fun onResume() {
        super.onResume()
        clearPopNotifications(this)
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            WindowCompat.getInsetsController(window, window.decorView).hide(
                WindowInsetsCompat.Type.navigationBars(),
            )
        }
    }

    private fun Intent.taskIdExtra(): Int? =
        getIntExtra(EXTRA_OPEN_TASK_ID, Int.MIN_VALUE).takeIf { it != Int.MIN_VALUE }
}

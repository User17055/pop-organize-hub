package br.com.poporganize.app

import android.content.Intent
import android.content.ActivityNotFoundException
import android.net.Uri
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
import com.google.android.play.core.appupdate.AppUpdateManager
import com.google.android.play.core.appupdate.AppUpdateManagerFactory
import com.google.android.play.core.install.model.UpdateAvailability

class MainActivity : ComponentActivity() {
    private var pendingTaskId by mutableStateOf<Int?>(null)
    private var availableUpdateVersionCode by mutableStateOf<Int?>(null)
    private val appUpdateManager: AppUpdateManager by lazy { AppUpdateManagerFactory.create(this) }

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
                availableUpdateVersionCode = availableUpdateVersionCode,
                onOpenUpdate = ::openPlayStore,
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
        checkForUpdate()
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

    private fun checkForUpdate() {
        appUpdateManager.appUpdateInfo.addOnSuccessListener { info ->
            availableUpdateVersionCode = info.availableVersionCode()
                .takeIf { info.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE }
        }
    }

    private fun openPlayStore() {
        val webUrl = "https://play.google.com/store/apps/details?id=$packageName"
        try {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=$packageName")))
        } catch (_: ActivityNotFoundException) {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(webUrl)))
        }
    }
}

package br.com.poporganize.app.notifications

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class TestNotificationReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        showAssignedTaskNotification(
            context = context,
            title = "Confira o novo ícone azul",
            assignedBy = "Pop Organize",
            taskId = 99_001,
        )
    }
}

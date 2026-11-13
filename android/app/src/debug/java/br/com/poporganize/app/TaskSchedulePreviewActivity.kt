package br.com.poporganize.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import br.com.poporganize.app.data.taskScheduleLabel
import br.com.poporganize.app.ui.*

/** Isolated UI fixture. No account, saved task, network request or production preference. */
class TaskSchedulePreviewActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            var light by remember { mutableStateOf(false) }
            var flow by remember { mutableStateOf("Cadastro") }
            var time by remember { mutableStateOf("09:00") }
            var duration by remember { mutableStateOf("Sem duração") }
            var date by remember { mutableStateOf("12/11/2026") }
            var showTime by remember { mutableStateOf(false) }
            var showDate by remember { mutableStateOf(false) }
            PopTheme(lightTheme = light) {
                Surface(Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
                    Column(Modifier.systemBarsPadding().padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text("PRÉVIA LOCAL · HORÁRIOS")
                        Button(onClick = { flow = "Cadastro"; time = "09:00"; duration = "Sem duração"; showTime = true }) { Text("Nova atividade") }
                        Button(onClick = { flow = "Edição"; time = "23:00"; duration = "2 h"; showTime = true }) { Text("Atividade cadastrada") }
                        Text("$flow: ${taskScheduleLabel(time, duration)}")
                        Button(onClick = { showDate = true }) { Text("Selecionar data") }
                        Text("Data: $date")
                        DeveloperSignature()
                        TextButton(onClick = { light = !light }) { Text(if (light) "Tema escuro" else "Tema claro") }
                    }
                }
                if (showTime) TaskTimeRangeDialog(time, duration,
                    onConfirm = { start, length -> time = start; duration = length; showTime = false },
                    onClear = { time = ""; duration = "Sem duração"; showTime = false },
                    onDismiss = { showTime = false })
                if (showDate) TaskDueDateDialog(date,
                    onSelect = { date = it; showDate = false }, onDismiss = { showDate = false })
            }
        }
    }
}

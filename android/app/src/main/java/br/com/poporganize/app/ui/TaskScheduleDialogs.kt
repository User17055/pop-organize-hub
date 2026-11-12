package br.com.poporganize.app.ui

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.ChevronLeft
import androidx.compose.material.icons.rounded.ChevronRight
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.window.Dialog
import br.com.poporganize.app.BuildConfig
import br.com.poporganize.app.R
import br.com.poporganize.app.data.agendaMinute
import br.com.poporganize.app.data.agendaTimeLabel
import br.com.poporganize.app.data.taskDurationFromEndTime
import br.com.poporganize.app.data.taskDurationLabel
import br.com.poporganize.app.data.taskDurationMinutes
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.util.Locale

@Composable
internal fun TaskDueDateDialog(selectedDate: String, onSelect: (String) -> Unit, onDismiss: () -> Unit) {
    val formatter = remember { DateTimeFormatter.ofPattern("dd/MM/yyyy") }
    var draft by remember(selectedDate) { mutableStateOf(runCatching { LocalDate.parse(selectedDate, formatter) }.getOrDefault(LocalDate.now())) }
    var month by remember(selectedDate) { mutableStateOf(YearMonth.from(draft)) }
    var yearsOpen by remember { mutableStateOf(false) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Data de conclusão", color = PopText, fontWeight = FontWeight.Bold) },
        text = {
            Column(Modifier.fillMaxWidth().heightIn(max = 440.dp).verticalScroll(rememberScrollState())) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = { month = month.minusMonths(1) }) { Icon(Icons.Rounded.ChevronLeft, "Mês anterior", tint = PopMuted) }
                    Box(Modifier.weight(1f), contentAlignment = Alignment.Center) {
                        val name = month.month.getDisplayName(TextStyle.FULL, Locale("pt", "BR")).replaceFirstChar { it.uppercase() }
                        Text("$name ${month.year}", color = PopText, fontWeight = FontWeight.Bold,
                            modifier = Modifier.clickable { yearsOpen = true }.padding(vertical = 12.dp))
                        DropdownMenu(expanded = yearsOpen, onDismissRequest = { yearsOpen = false }, containerColor = PopSurfaceAlt, modifier = Modifier.heightIn(max = 280.dp)) {
                            (minOf(LocalDate.now().year - 2, draft.year)..maxOf(LocalDate.now().year + 15, draft.year)).forEach { year ->
                                DropdownMenuItem(text = { Text(year.toString(), color = PopText) }, onClick = { month = YearMonth.of(year, month.month); yearsOpen = false })
                            }
                        }
                    }
                    IconButton(onClick = { month = month.plusMonths(1) }) { Icon(Icons.Rounded.ChevronRight, "Próximo mês", tint = PopMuted) }
                }
                TaskDatePickerCalendar(month, draft) { draft = it }
            }
        },
        confirmButton = { TextButton(onClick = { onSelect(draft.format(formatter)) }) { Text("Confirmar") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancelar") } },
        containerColor = PopSurface,
        titleContentColor = PopText,
        textContentColor = PopText,
        tonalElevation = 0.dp,
        shape = RoundedCornerShape(24.dp),
    )
}

@Composable
internal fun TaskTimeRangeDialog(
    initialTime: String,
    initialDuration: String,
    onConfirm: (String, String) -> Unit,
    onClear: () -> Unit,
    onDismiss: () -> Unit,
) {
    val initialStart = remember(initialTime) { agendaMinute(initialTime) ?: 540 }
    val initialMinutes = remember(initialDuration) { taskDurationMinutes(initialDuration) }
    var startHour by remember { mutableIntStateOf(initialStart / 60) }
    var startMinute by remember { mutableIntStateOf(initialStart % 60) }
    var endHour by remember { mutableIntStateOf(((initialStart + (initialMinutes ?: 60)) % 1440) / 60) }
    var endMinute by remember { mutableIntStateOf((initialStart + (initialMinutes ?: 60)) % 60) }
    var hasEnd by remember { mutableStateOf(initialMinutes != null) }
    var editingEnd by remember { mutableStateOf(false) }
    var fullDay by remember { mutableStateOf(initialMinutes == 1440) }
    val start = agendaTimeLabel(startHour * 60 + startMinute)
    val end = agendaTimeLabel(endHour * 60 + endMinute)
    val duration = if (hasEnd) taskDurationFromEndTime(start, end, fullDay) else null
    Dialog(onDismissRequest = onDismiss) {
        Surface(color = PopSurface, contentColor = PopText, shape = RoundedCornerShape(24.dp), tonalElevation = 0.dp) {
            Column(Modifier.fillMaxWidth().padding(20.dp)) {
                Text("Horário da atividade", color = PopText, fontSize = 18.sp, lineHeight = 25.sp, fontWeight = FontWeight.ExtraBold)
                Spacer(Modifier.height(16.dp))
                Column(Modifier.fillMaxWidth().heightIn(max = 350.dp).verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(8.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        TimeRangeChoice("Início", start, !editingEnd, Modifier.weight(1f)) { editingEnd = false }
                        TimeRangeChoice("Até", if (hasEnd) end else "Definir", editingEnd, Modifier.weight(1f)) {
                            if (!hasEnd) {
                                val suggested = (startHour * 60 + startMinute + 60) % 1440
                                endHour = suggested / 60; endMinute = suggested % 60; fullDay = false
                            }
                            hasEnd = true; editingEnd = true
                        }
                    }
                    key(editingEnd) {
                        Row(horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
                            WheelNumberPicker(if (editingEnd) endHour else startHour, 0..23) {
                                if (editingEnd) endHour = it else startHour = it
                            }
                            Text(":", color = PopText, fontSize = 30.sp, fontWeight = FontWeight.ExtraBold)
                            WheelNumberPicker(if (editingEnd) endMinute else startMinute, 0..59) {
                                if (editingEnd) endMinute = it else startMinute = it
                            }
                        }
                    }
                    if (hasEnd && start == end) {
                        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                            Text("Termina no dia seguinte", color = PopText, fontSize = 12.sp, modifier = Modifier.weight(1f))
                            Switch(checked = fullDay, onCheckedChange = { fullDay = it }, colors = SwitchDefaults.colors(
                                checkedThumbColor = Color.White, checkedTrackColor = MaterialTheme.colorScheme.primary,
                                uncheckedThumbColor = PopMuted, uncheckedTrackColor = PopSurfaceAlt, uncheckedBorderColor = PopBorder,
                            ))
                        }
                    }
                    if (hasEnd) Text(
                        if (duration == null) "O término precisa ser posterior ao início."
                        else "Duração calculada: ${taskDurationLabel(duration)}" +
                            if (endHour * 60 + endMinute < startHour * 60 + startMinute || fullDay && start == end) " · dia seguinte" else "",
                        color = if (hasEnd && duration == null) MaterialTheme.colorScheme.error else PopMuted,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                    )
                    if (hasEnd) TextButton(onClick = { hasEnd = false; editingEnd = false; fullDay = false }) { Text("Remover término", color = MaterialTheme.colorScheme.error, fontSize = 12.sp, fontWeight = FontWeight.SemiBold) }
                }
                Spacer(Modifier.height(14.dp))
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    TextButton(onClick = onClear, modifier = Modifier.weight(1.15f), contentPadding = PaddingValues(horizontal = 2.dp)) {
                        Text("Sem horário", color = PopMuted, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, softWrap = false)
                    }
                    TextButton(onClick = onDismiss, modifier = Modifier.weight(1f), contentPadding = PaddingValues(horizontal = 2.dp)) {
                        Text("Cancelar", color = PopText, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, softWrap = false)
                    }
                    TextButton(enabled = !hasEnd || duration != null, onClick = { onConfirm(start, taskDurationLabel(duration)) },
                        modifier = Modifier.weight(1.1f), contentPadding = PaddingValues(horizontal = 2.dp)) {
                        Text("Confirmar", fontSize = 12.sp, fontWeight = FontWeight.Bold, maxLines = 1, softWrap = false)
                    }
                }
            }
        }
    }
}

@Composable
private fun TimeRangeChoice(label: String, value: String, selected: Boolean, modifier: Modifier, onClick: () -> Unit) {
    val accent = MaterialTheme.colorScheme.primary
    Surface(onClick = onClick, modifier = modifier, shape = RoundedCornerShape(14.dp), color = if (selected) PopBlueSoft else PopSurfaceAlt, tonalElevation = 0.dp) {
        Column(Modifier.padding(horizontal = 12.dp, vertical = 9.dp), verticalArrangement = Arrangement.spacedBy(3.dp)) {
            Text(label, color = PopMuted, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
            Text(value, color = if (selected) accent else PopText, fontSize = 16.sp, lineHeight = 22.sp,
                fontWeight = FontWeight.Bold, maxLines = 1, softWrap = false, overflow = TextOverflow.Ellipsis)
        }
    }
}

@Composable
internal fun DeveloperSignature() {
    Row(Modifier.fillMaxWidth().padding(top = 20.dp, bottom = 6.dp), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(46.dp).clip(RoundedCornerShape(12.dp)).background(Color(0xFF10171A)).padding(6.dp)) {
            Image(painterResource(R.drawable.lison_tech_mark), "Logo LisonTech", modifier = Modifier.fillMaxSize())
        }
        Column(Modifier.padding(start = 11.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text("Desenvolvido por", color = PopMuted, fontSize = 10.sp)
            Text("LisonTech", color = PopText, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
            Text("Pop Organize ${BuildConfig.VERSION_NAME}", color = PopMuted, fontSize = 10.sp)
        }
    }
}

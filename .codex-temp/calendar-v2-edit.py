from pathlib import Path
p=Path('android/app/src/main/java/br/com/poporganize/app/ui/PopOrganizeApp.kt')
s=p.read_text(encoding='utf-8')
def replace(a,b):
 global s
 assert a in s, a[:100]
 s=s.replace(a,b,1)
# Keep the established monthly calendar; update only the agenda and controls.
a=s.index('@Composable\nprivate fun CalendarFilterIcon(')
b=s.index('@OptIn(ExperimentalMaterial3Api::class)',a)
s=s[:a]+'''@Composable
private fun CalendarFilterIcon(tint: Color, modifier: Modifier = Modifier) {
    Icon(Icons.Rounded.Tune, "Filtrar calendário", tint = tint, modifier = modifier)
}

'''+s[b:]
replace('onSelected = onPerson,','onSelected = onPerson,\n                    people = people,')
a=s.index('private fun CalendarFilterOptions(')
b=s.index('private fun nextTaskOccurrence',a)
part=s[a:b]
part=part.replace('onSelected: (String?) -> Unit,','onSelected: (String?) -> Unit,\n    people: List<CompanyMember> = emptyList(),')
part=part.replace('Text(selectedLabel, modifier', '''people.firstOrNull { it.id == selected }?.let { person ->
                        GoogleProfileAvatar(person.photoUrl, Modifier.size(28.dp), person.name, "Foto de ${person.name}")
                        Spacer(Modifier.width(10.dp))
                    }
                    Text(selectedLabel, modifier''')
start=part.index('                        leadingIcon = {')
end=part.index('                        onClick = {',start)
part=part[:start]+'''                        leadingIcon = {
                            val person = people.firstOrNull { it.id == id }
                            if (person != null) {
                                GoogleProfileAvatar(person.photoUrl, Modifier.size(34.dp), person.name, "Foto de ${person.name}")
                            } else Icon(icon, null, tint = PopMuted, modifier = Modifier.size(22.dp))
                        },
                        trailingIcon = {
                            if (isSelected) Icon(Icons.Rounded.Check, null, tint = PopBlue, modifier = Modifier.size(18.dp))
                        },
'''+part[end:]
s=s[:a]+part+s[b:]
# Duration state, edit persistence and validation.
replace('var showEditTimePicker by remember { mutableStateOf(false) }','''var showEditTimePicker by remember { mutableStateOf(false) }
    var showDurationPicker by remember { mutableStateOf(false) }
    var durationForEdit by remember { mutableStateOf(false) }
    var editDuration by remember { mutableStateOf("Sem duração") }''')
replace('editDueTime = task.dueTime','editDueTime = task.dueTime\n        editDuration = task.duration')
replace('remote.dueTime == local.dueTime &&','remote.dueTime == local.dueTime &&\n        taskDurationMinutes(remote.duration) == taskDurationMinutes(local.duration) &&')
replace('val storedEndValue = when (editRecurrenceEnd)', '''if (taskDurationMinutes(editDuration) != null && normalizedEditTime.isBlank() && editRecurrenceTimes.isEmpty()) {
            Toast.makeText(context, "Escolha um horário de início para a duração.", Toast.LENGTH_SHORT).show()
            showEditTimePicker = true
            return
        }
        val storedEndValue = when (editRecurrenceEnd)''')
replace('dueTime = editRecurrenceTimes.minOrNull() ?: normalizedEditTime,','dueTime = editRecurrenceTimes.minOrNull() ?: normalizedEditTime,\n            duration = taskDurationLabel(taskDurationMinutes(editDuration)),')
replace('if (newTaskTitle.trim().length < 3) return','''if (newTaskTitle.trim().length < 3) return
        if (taskDurationMinutes(newTaskDuration) != null && newTaskTime.isBlank() && newTaskRecurrenceTimes.isEmpty()) {
            Toast.makeText(context, "Escolha um horário de início para a duração.", Toast.LENGTH_SHORT).show()
            showTaskDateSheet = true
            showTaskTimePicker = true
            return
        }''')
# Duration in the creation date settings.
needle='''                        DateSettingRow(
                            icon = Icons.Rounded.NotificationsActive,
                            label = "Lembrete",'''
replace(needle,'''                        DateSettingRow(
                            icon = Icons.Rounded.AccessTime,
                            label = "Duração",
                            value = newTaskDuration + taskEndLabel(newTaskTime, newTaskDuration),
                        ) { durationForEdit = false; showDurationPicker = true }
'''+needle)
needle='''                                DetailSettingRow(
                                    icon = Icons.Rounded.NotificationsActive,
                                    label = "Lembrar-me",'''
replace(needle,'''                                DetailSettingRow(
                                    icon = Icons.Rounded.AccessTime,
                                    label = "Duração",
                                    value = editDuration + taskEndLabel(editDueTime, editDuration),
                                    expanded = false,
                                ) { durationForEdit = true; showDurationPicker = true }
'''+needle)
replace('    if (showTaskTimePicker) {','''    if (showDurationPicker) {
        TaskDurationDialog(
            selected = if (durationForEdit) editDuration else newTaskDuration,
            startTime = if (durationForEdit) editDueTime else newTaskTime,
            onSelect = { value ->
                if (durationForEdit) {
                    editDuration = value
                    if (taskDurationMinutes(value) != null && editDueTime.isBlank()) showEditTimePicker = true
                } else {
                    newTaskDuration = value
                    if (taskDurationMinutes(value) != null && newTaskTime.isBlank()) showTaskTimePicker = true
                }
                showDurationPicker = false
            },
            onDismiss = { showDurationPicker = false },
        )
    }

    if (showTaskTimePicker) {''')
# Reuse the validated duration form without restoring the rejected calendar layout.
archive=Path('.codex-temp/calendar-prototype-build18/PopOrganizeApp.kt').read_text(encoding='utf-8')
helpers=archive[archive.index('private fun taskEndLabel('):archive.index('private fun weekDayToken(')]
replace('private fun weekDayToken(',helpers+'private fun weekDayToken(')
a=s.index('@Composable\nprivate fun CalendarDayAgenda(')
b=s.index('@Composable\nprivate fun CalendarTaskDetails(',a)
s=s[:a]+'''@Composable
private fun CalendarDayAgenda(
    tasks: List<PopTask>,
    today: LocalDate,
    onOpenTask: (PopTask) -> Unit,
    onToggleTaskComplete: (PopTask) -> Unit,
) {
    val timed = tasks.filter { agendaMinute(it.dueTime) != null }
    val untimed = tasks.filter { agendaMinute(it.dueTime) == null }
    listOf("Agenda do dia" to timed, "Sem horário" to untimed).forEach { (label, entries) ->
        if (entries.isNotEmpty()) {
            Text(label, color = PopMuted, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 10.dp, bottom = 4.dp))
            entries.forEach { task ->
                val color = taskPriorityColor(task.priority)
                val start = agendaMinute(task.dueTime)
                val duration = taskDurationMinutes(task.duration)
                Row(
                    Modifier.fillMaxWidth().clickable(enabled = !task.calendarProjection) { onOpenTask(task) }
                        .padding(vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(Modifier.width(53.dp), horizontalAlignment = Alignment.Start) {
                        Text(if (start != null) task.dueTime else "—", color = PopText, fontSize = 12.sp, fontWeight = FontWeight.Medium)
                        if (start != null && duration != null) Text(agendaTimeLabel(start + duration), color = PopMuted, fontSize = 10.sp)
                    }
                    Box(Modifier.width(3.dp).height(36.dp).background(color, RoundedCornerShape(2.dp)))
                    Spacer(Modifier.width(11.dp))
                    Column(Modifier.weight(1f)) {
                        Text(task.title, color = if (task.completed) PopMuted else PopText, fontSize = 14.sp, fontWeight = FontWeight.Medium, maxLines = 2, overflow = TextOverflow.Ellipsis,
                            textDecoration = if (task.completed) TextDecoration.LineThrough else null)
                        val detail = listOf(task.assignee.takeUnless { it == "Sem responsável" || it == "Eu" }.orEmpty(), duration?.let { taskDurationLabel(it) }.orEmpty()).filter { it.isNotBlank() }.joinToString(" · ")
                        if (detail.isNotBlank()) Text(detail, color = PopMuted, fontSize = 11.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                    IconButton(
                        onClick = { onToggleTaskComplete(task) },
                        enabled = !task.calendarProjection && !(task.awaitingReview && !task.canComplete),
                        modifier = Modifier.size(40.dp),
                    ) {
                        Icon(if (task.completed) Icons.Rounded.CheckCircle else Icons.Rounded.RadioButtonUnchecked,
                            if (task.completed) "Reabrir ${task.title}" else "Concluir ${task.title}", tint = if (task.completed) PopBlue else PopMuted.copy(alpha = .55f), modifier = Modifier.size(21.dp))
                    }
                }
                HorizontalDivider(color = PopMuted.copy(alpha = .12f), thickness = .5.dp)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CalendarDailyTimeline(date: LocalDate, tasks: List<PopTask>, onOpen: (PopTask) -> Unit, onDismiss: () -> Unit) {
    val intervals = tasks.mapNotNull { task -> agendaMinute(task.dueTime)?.let { AgendaInterval(task.id.toString(), task, it, taskDurationMinutes(task.duration) ?: 30) } }
    val placements = layoutAgendaIntervals(intervals)
    val scroll = rememberScrollState()
    val density = LocalDensity.current
    val firstHour = ((intervals.minOfOrNull { it.startMinute } ?: 480) / 60 - 1).coerceAtLeast(0)
    LaunchedEffect(date) { scroll.scrollTo(with(density) { (firstHour * 64).dp.roundToPx() }) }
    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true), containerColor = PopBackground) {
        Column(Modifier.fillMaxWidth().fillMaxHeight(.94f)) {
            Row(Modifier.fillMaxWidth().padding(start = 20.dp, end = 8.dp, bottom = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("Agenda do dia", fontSize = 20.sp, fontWeight = FontWeight.Bold)
                    Text(date.format(DateTimeFormatter.ofPattern("EEEE, d 'de' MMMM", Locale("pt", "BR"))), color = PopMuted, fontSize = 12.sp)
                }
                IconButton(onClick = onDismiss) { Icon(Icons.Rounded.Close, "Fechar horários") }
            }
            val untimed = tasks.filter { agendaMinute(it.dueTime) == null }
            if (untimed.isNotEmpty()) {
                Row(Modifier.padding(horizontal = 20.dp, vertical = 8.dp)) {
                    Text("Sem horário", color = PopMuted, fontSize = 10.sp, modifier = Modifier.width(65.dp))
                    Column { untimed.forEach { task -> Text(task.title, fontSize = 12.sp, modifier = Modifier.clickable(enabled = !task.calendarProjection) { onDismiss(); onOpen(task) }.padding(bottom = 7.dp)) } }
                }
                HorizontalDivider(color = PopMuted.copy(alpha = .15f))
            }
            BoxWithConstraints(Modifier.weight(1f).fillMaxWidth().verticalScroll(scroll).padding(end = 16.dp)) {
                val gutter = 59.dp
                val available = maxWidth - gutter
                Box(Modifier.fillMaxWidth().height(1536.dp)) {
                    repeat(24) { hour ->
                        Row(Modifier.fillMaxWidth().offset(y = (hour * 64).dp), verticalAlignment = Alignment.CenterVertically) {
                            Text("%02d:00".format(hour), color = PopMuted, fontSize = 10.sp, modifier = Modifier.width(gutter).padding(start = 14.dp))
                            HorizontalDivider(color = PopMuted.copy(alpha = .16f), thickness = .5.dp)
                        }
                    }
                    placements.forEach { item ->
                        val task = item.interval.task
                        val color = taskPriorityColor(task.priority)
                        val width = available / item.columns
                        val start = item.interval.startMinute
                        val actualDuration = taskDurationMinutes(task.duration)
                        val height = ((item.interval.durationMinutes.coerceAtLeast(30).coerceAtMost(1440 - start)) * 64f / 60f).dp
                        Surface(
                            onClick = { onDismiss(); onOpen(task) }, enabled = !task.calendarProjection,
                            color = color.copy(alpha = .14f), shape = RoundedCornerShape(5.dp),
                            modifier = Modifier.offset(x = gutter + width * item.column, y = (start * 64f / 60f).dp + 6.dp).width(width - 3.dp).height(height - 2.dp),
                        ) {
                            Row(Modifier.fillMaxSize()) {
                                Box(Modifier.width(3.dp).fillMaxHeight().background(color))
                                Column(Modifier.padding(horizontal = 7.dp, vertical = 3.dp)) {
                                    Text(task.title, fontSize = 11.sp, lineHeight = 13.sp, fontWeight = FontWeight.SemiBold, maxLines = if (height < 50.dp) 1 else 2, overflow = TextOverflow.Ellipsis)
                                    Text(task.dueTime + if (actualDuration != null) "–${agendaTimeLabel(start + actualDuration)}" else "", color = color, fontSize = 9.sp, maxLines = 1)
                                }
                            }
                        }
                    }
                    if (date == LocalDate.now()) {
                        val now = LocalTime.now()
                        Row(Modifier.fillMaxWidth().offset(y = ((now.hour * 60 + now.minute) * 64f / 60f).dp + 6.dp), verticalAlignment = Alignment.CenterVertically) {
                            Text(now.format(DateTimeFormatter.ofPattern("HH:mm")), color = Color(0xFFE96662), fontSize = 10.sp, modifier = Modifier.width(gutter).padding(start = 14.dp))
                            Box(Modifier.size(5.dp).background(Color(0xFFE96662), CircleShape))
                            HorizontalDivider(color = Color(0xFFE96662), thickness = 1.dp)
                        }
                    }
                }
            }
        }
    }
}

'''+s[b:]
# Duration is visible to people who can only view a task too.
replace('item { CalendarTaskInfoRow(Icons.Rounded.TaskAlt, "Prioridade", task.priority) }','''if (taskDurationMinutes(task.duration) != null) {
                        item { CalendarTaskInfoRow(Icons.Rounded.AccessTime, "Duração", task.duration + taskEndLabel(task.dueTime, task.duration)) }
                    }
                    item { CalendarTaskInfoRow(Icons.Rounded.TaskAlt, "Prioridade", task.priority) }''')
p.write_text(s,encoding='utf-8')

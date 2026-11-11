from pathlib import Path
p=Path('android/app/src/main/java/br/com/poporganize/app/ui/PopOrganizeApp.kt')
s=p.read_text(encoding='utf-8')
def replace(a,b):
    global s
    assert a in s, a[:100]
    s=s.replace(a,b,1)
replace('import androidx.compose.material3.MaterialTheme', 'import androidx.compose.material3.ProvideTextStyle\nimport androidx.compose.material3.LocalTextStyle\nimport androidx.compose.material3.MaterialTheme')
replace('import androidx.compose.material.icons.rounded.Tune','import androidx.compose.material.icons.rounded.Fullscreen\nimport androidx.compose.material.icons.rounded.Tune')
replace('''                    Text(selectedDate.format(DateTimeFormatter.ofPattern("EEEE, d 'de' MMMM", locale)).replaceFirstChar { it.uppercase() }, color = PopMuted, fontSize = 11.sp, modifier = Modifier.weight(1f))
                    TextButton(onClick = {
                        agendaExpanded = !agendaExpanded
                        if (agendaExpanded) pagerScope.launch { calendarListState.animateScrollToItem(3) }
                    }, contentPadding = PaddingValues(horizontal = 7.dp)) {
                        Icon(if (agendaExpanded) Icons.Rounded.KeyboardArrowUp else Icons.Rounded.KeyboardArrowDown, null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(3.dp))
                        Text(if (agendaExpanded) "Recolher" else "Abrir agenda", fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                    }''','''                    Text(selectedDate.format(DateTimeFormatter.ofPattern("EEEE, d 'de' MMMM", locale)).replaceFirstChar { it.uppercase() }, color = PopMuted, fontFamily = InterFontFamily, fontSize = 12.sp, lineHeight = 18.sp, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
                    Spacer(Modifier.width(8.dp))
                    Surface(
                        onClick = {
                            agendaExpanded = !agendaExpanded
                            if (agendaExpanded) pagerScope.launch { calendarListState.animateScrollToItem(3) }
                        },
                        color = if (agendaExpanded) PopBlueSoft else PopSurfaceAlt,
                        contentColor = PopBlue,
                        shape = RoundedCornerShape(12.dp),
                        border = BorderStroke(.5.dp, if (agendaExpanded) PopBlue.copy(alpha = .22f) else PopBorder),
                    ) {
                        Row(Modifier.padding(horizontal = 10.dp, vertical = 9.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(if (agendaExpanded) Icons.Rounded.KeyboardArrowUp else Icons.Rounded.KeyboardArrowDown, null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(4.dp))
                            Text(if (agendaExpanded) "Recolher" else "Abrir agenda", fontFamily = InterFontFamily, fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.SemiBold)
                        }
                    }''')
replace('''                if (agendaExpanded) {
                    Surface(color = PopSurface, shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
                        Column {
                            Row(Modifier.fillMaxWidth().padding(start = 14.dp, end = 5.dp), verticalAlignment = Alignment.CenterVertically) {
                                Text("Agenda aberta", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                                TextButton(onClick = { showDayTimeline = true }) { Text("Ampliar", fontSize = 11.sp) }
                            }
                            CalendarTimelineContent(selectedDate, selectedDayTasks, onOpenTask, Modifier.height(440.dp))
                        }
                    }''','''                Spacer(Modifier.height(14.dp))
                if (agendaExpanded) {
                    Surface(color = PopSurface, shape = RoundedCornerShape(20.dp), border = BorderStroke(1.dp, PopBorder.copy(alpha = .7f)), modifier = Modifier.fillMaxWidth()) {
                        Column {
                            Row(Modifier.fillMaxWidth().padding(start = 14.dp, end = 8.dp, top = 5.dp, bottom = 5.dp), verticalAlignment = Alignment.CenterVertically) {
                                Box(Modifier.size(30.dp).background(PopBlueSoft, RoundedCornerShape(10.dp)), contentAlignment = Alignment.Center) {
                                    Icon(Icons.Rounded.AccessTime, null, tint = PopBlue, modifier = Modifier.size(17.dp))
                                }
                                Spacer(Modifier.width(9.dp))
                                Text("Horários do dia", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                                TextButton(onClick = { showDayTimeline = true }, contentPadding = PaddingValues(horizontal = 8.dp)) {
                                    Icon(Icons.Rounded.Fullscreen, null, modifier = Modifier.size(17.dp))
                                    Spacer(Modifier.width(4.dp))
                                    Text("Ampliar", fontFamily = InterFontFamily, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                                }
                            }
                            HorizontalDivider(color = PopBorder.copy(alpha = .6f), thickness = .5.dp)
                            CalendarTimelineContent(selectedDate, selectedDayTasks, onOpenTask, Modifier.height(460.dp))
                        }
                    }''')
# Match web task text, which uses Inter rather than the display face.
a=s.index('private fun CalendarDayAgenda(')
b=s.index('@OptIn(ExperimentalMaterial3Api::class)',a)
part=s[a:b]
part=part.replace('fontSize = ', 'fontFamily = InterFontFamily, fontSize = ')
part=part.replace('fontSize = 14.sp, fontWeight = FontWeight.Medium','fontSize = 13.sp, fontWeight = FontWeight.SemiBold')
s=s[:a]+part+s[b:]
replace('''Text(date.format(DateTimeFormatter.ofPattern("EEEE, d 'de' MMMM", Locale("pt", "BR"))), color = PopMuted, fontSize = 12.sp)''','''Text(date.format(DateTimeFormatter.ofPattern("EEEE, d 'de' MMMM", Locale("pt", "BR"))), color = PopMuted, fontFamily = InterFontFamily, fontSize = 12.sp, lineHeight = 18.sp)''')
a=s.index('@Composable\nprivate fun CalendarTimelineContent(')
b=s.index('@Composable\nprivate fun CalendarTaskDetails(',a)
s=s[:a]+'''@Composable
private fun CalendarTimelineContent(date: LocalDate, tasks: List<PopTask>, onOpen: (PopTask) -> Unit, modifier: Modifier = Modifier) {
    val intervals = tasks.mapNotNull { task -> agendaMinute(task.dueTime)?.let { AgendaInterval(task.id.toString(), task, it, taskDurationMinutes(task.duration) ?: 30) } }
    val placements = layoutAgendaIntervals(intervals)
    val scroll = rememberScrollState()
    val density = LocalDensity.current
    val hourHeight = 72f
    val currentTime by produceState(initialValue = LocalTime.now(), key1 = date) {
        while (true) { value = LocalTime.now(); delay(30_000) }
    }
    val firstHour = ((intervals.minOfOrNull { it.startMinute } ?: 480) / 60 - 1).coerceAtLeast(0)
    LaunchedEffect(date) { scroll.scrollTo(with(density) { (firstHour * hourHeight).dp.roundToPx() }) }
    ProvideTextStyle(LocalTextStyle.current.copy(fontFamily = InterFontFamily)) {
        Column(modifier.fillMaxWidth()) {
            val untimed = tasks.filter { agendaMinute(it.dueTime) == null }
            if (untimed.isNotEmpty()) {
                Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Sem horário", color = PopMuted, fontSize = 11.sp, lineHeight = 15.sp, fontWeight = FontWeight.Medium)
                    Column(Modifier.heightIn(max = 88.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        untimed.forEach { task ->
                            Surface(onClick = { onOpen(task) }, enabled = !task.calendarProjection, color = PopSurfaceAlt, shape = RoundedCornerShape(10.dp), border = BorderStroke(.5.dp, PopBorder), modifier = Modifier.fillMaxWidth()) {
                                Row(Modifier.padding(horizontal = 10.dp, vertical = 9.dp), verticalAlignment = Alignment.CenterVertically) {
                                    Box(Modifier.width(2.dp).height(18.dp).background(taskPriorityColor(task.priority), CircleShape))
                                    Spacer(Modifier.width(8.dp))
                                    Text(task.title, fontSize = 12.sp, lineHeight = 17.sp, fontWeight = FontWeight.Medium, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                }
                            }
                        }
                    }
                }
                HorizontalDivider(color = PopBorder.copy(alpha = .6f), thickness = .5.dp)
            }
            BoxWithConstraints(Modifier.weight(1f).fillMaxWidth().verticalScroll(scroll).padding(end = 12.dp)) {
                val gutter = 52.dp
                val available = maxWidth - gutter
                Box(Modifier.fillMaxWidth().height((24 * hourHeight).dp)) {
                    repeat(24) { hour ->
                        Row(Modifier.fillMaxWidth().offset(y = (hour * hourHeight).dp), verticalAlignment = Alignment.CenterVertically) {
                            Text("%02d:00".format(hour), color = PopMuted.copy(alpha = .85f), fontSize = 11.sp, lineHeight = 14.sp, fontWeight = FontWeight.Medium, modifier = Modifier.width(gutter).padding(start = 12.dp))
                            HorizontalDivider(color = PopBorder.copy(alpha = .55f), thickness = .5.dp)
                        }
                    }
                    placements.forEach { item ->
                        val task = item.interval.task
                        val accent = taskPriorityColor(task.priority)
                        val width = available / item.columns
                        val start = item.interval.startMinute
                        val actualDuration = taskDurationMinutes(task.duration)
                        val height = (item.interval.durationMinutes.coerceAtLeast(30).coerceAtMost(1440 - start) * hourHeight / 60f).dp
                        val timeLabel = task.dueTime + if (actualDuration != null) "–${agendaTimeLabel(start + actualDuration)}" else ""
                        Surface(
                            onClick = { onOpen(task) }, enabled = !task.calendarProjection,
                            color = PopSurfaceAlt, shape = RoundedCornerShape(10.dp), border = BorderStroke(.5.dp, PopBorder),
                            modifier = Modifier.offset(x = gutter + width * item.column, y = (start * hourHeight / 60f).dp + 5.dp).width((width - 4.dp).coerceAtLeast(1.dp)).height((height - 3.dp).coerceAtLeast(4.dp)),
                        ) {
                            Row(Modifier.fillMaxSize()) {
                                Box(Modifier.width(2.dp).fillMaxHeight().background(accent))
                                if (height < 50.dp) {
                                    Row(Modifier.fillMaxSize().padding(horizontal = 9.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                        Text(task.title, modifier = Modifier.weight(1f), color = if (task.completed) PopMuted else PopText, fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                        if (item.columns == 1) Text(timeLabel, color = PopMuted, fontSize = 10.sp, lineHeight = 13.sp, fontWeight = FontWeight.Medium, maxLines = 1)
                                    }
                                } else {
                                    Column(Modifier.padding(horizontal = 8.dp, vertical = 4.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                        Text(task.title, color = if (task.completed) PopMuted else PopText, fontSize = 12.sp, lineHeight = 14.sp, fontWeight = FontWeight.SemiBold, maxLines = 2, overflow = TextOverflow.Ellipsis)
                                        Text(timeLabel, color = PopMuted, fontSize = 10.sp, lineHeight = 12.sp, fontWeight = FontWeight.Medium, maxLines = 1)
                                    }
                                }
                            }
                        }
                    }
                    if (date == LocalDate.now()) {
                        val now = currentTime
                        val nowColor = MaterialTheme.colorScheme.error
                        Row(Modifier.fillMaxWidth().offset(y = ((now.hour * 60 + now.minute) * hourHeight / 60f).dp + 5.dp), verticalAlignment = Alignment.CenterVertically) {
                            Text(now.format(DateTimeFormatter.ofPattern("HH:mm")), color = nowColor, fontSize = 10.sp, lineHeight = 14.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.width(gutter).padding(start = 12.dp))
                            Box(Modifier.size(5.dp).background(nowColor, CircleShape))
                            HorizontalDivider(color = nowColor, thickness = 1.dp)
                        }
                    }
                }
            }
        }
    }
}

'''+s[b:]
p.write_text(s,encoding='utf-8')

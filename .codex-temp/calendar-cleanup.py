from pathlib import Path
p=Path('android/app/src/main/java/br/com/poporganize/app/ui/PopOrganizeApp.kt')
s=p.read_text(encoding='utf-8')
def replace(a,b):
    global s
    assert a in s, a[:80]
    s=s.replace(a,b,1)
a=s.index('                    Surface(\n                        onClick = {\n                            agendaExpanded = !agendaExpanded')
b=s.index('                } else if (selectedDayTasks.isEmpty())',a)
s=s[:a]+'''                    TextButton(
                        onClick = {
                            agendaExpanded = !agendaExpanded
                            if (agendaExpanded) pagerScope.launch { calendarListState.animateScrollToItem(3) }
                        },
                        contentPadding = PaddingValues(horizontal = 6.dp),
                    ) {
                        Icon(if (agendaExpanded) Icons.Rounded.KeyboardArrowUp else Icons.Rounded.KeyboardArrowDown, null, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(3.dp))
                        Text(if (agendaExpanded) "Recolher" else "Abrir agenda", fontFamily = InterFontFamily, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                    }
                    if (agendaExpanded) {
                        IconButton(onClick = { showDayTimeline = true }, modifier = Modifier.size(36.dp)) {
                            Icon(Icons.Rounded.Fullscreen, "Ampliar agenda", tint = PopBlue, modifier = Modifier.size(20.dp))
                        }
                    }
                }
                Spacer(Modifier.height(8.dp))
                if (agendaExpanded) {
                    CalendarTimelineContent(selectedDate, selectedDayTasks, onOpenTask, Modifier.height(420.dp))
'''+s[b:]
a=s.index('@Composable\nprivate fun CalendarDayAgenda(')
b=s.index('@OptIn(ExperimentalMaterial3Api::class)',a)
s=s[:a]+'''/** Priority fades into the page instead of adding another divider or badge. */
@Composable
private fun CalendarPrioritySurface(task: PopTask, onOpen: () -> Unit, modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    val accent = if (task.completed) PopBlue else taskPriorityColor(task.priority)
    val shape = RoundedCornerShape(14.dp)
    Surface(
        onClick = onOpen, enabled = !task.calendarProjection, color = Color.Transparent, shape = shape,
        modifier = modifier
            .background(Brush.horizontalGradient(listOf(lerp(PopSurface, accent, .075f), PopBackground)), shape)
            .border(1.dp, Brush.horizontalGradient(listOf(accent.copy(alpha = .65f), accent.copy(alpha = .18f), PopBorder.copy(alpha = .3f))), shape),
    ) { content() }
}

@Composable
private fun CalendarDayAgenda(
    tasks: List<PopTask>,
    today: LocalDate,
    onOpenTask: (PopTask) -> Unit,
    onToggleTaskComplete: (PopTask) -> Unit,
) {
    val timed = tasks.filter { agendaMinute(it.dueTime) != null }
    val untimed = tasks.filter { agendaMinute(it.dueTime) == null }
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        (timed + untimed).forEach { task ->
            if (task == untimed.firstOrNull()) {
                Text("Sem horário", color = PopMuted, fontFamily = InterFontFamily, fontSize = 11.sp, lineHeight = 15.sp, modifier = Modifier.padding(top = 6.dp, bottom = 2.dp))
            }
            val accent = taskPriorityColor(task.priority)
            val start = agendaMinute(task.dueTime)
            val duration = taskDurationMinutes(task.duration)
            CalendarPrioritySurface(task, { onOpenTask(task) }, Modifier.fillMaxWidth()) {
                Row(Modifier.fillMaxWidth().padding(start = 3.dp, end = 10.dp, top = 6.dp, bottom = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                    IconButton(
                        onClick = { onToggleTaskComplete(task) },
                        enabled = !task.calendarProjection && !(task.awaitingReview && !task.canComplete),
                        modifier = Modifier.size(38.dp),
                    ) {
                        Icon(if (task.completed) Icons.Rounded.CheckCircle else Icons.Rounded.RadioButtonUnchecked,
                            if (task.completed) "Reabrir ${task.title}" else "Concluir ${task.title}", tint = if (task.completed) PopBlue else PopMuted, modifier = Modifier.size(22.dp))
                    }
                    Column(Modifier.width(47.dp), verticalArrangement = Arrangement.spacedBy(1.dp)) {
                        Text(if (start != null) task.dueTime else "—", color = PopText, fontFamily = InterFontFamily, fontSize = 12.sp, lineHeight = 14.sp, fontWeight = FontWeight.Medium)
                        if (start != null && duration != null) Text(agendaTimeLabel(start + duration), color = PopMuted, fontFamily = InterFontFamily, fontSize = 10.sp, lineHeight = 12.sp)
                    }
                    Spacer(Modifier.width(7.dp))
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                        Text(task.title, color = if (task.completed) PopMuted else PopText, fontFamily = InterFontFamily, fontSize = 13.sp, lineHeight = 17.sp, fontWeight = FontWeight.SemiBold, maxLines = 2, overflow = TextOverflow.Ellipsis,
                            textDecoration = if (task.completed) TextDecoration.LineThrough else null)
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            val detail = listOf(task.assignee.takeUnless { it == "Sem responsável" || it == "Eu" }.orEmpty(), duration?.let { taskDurationLabel(it) }.orEmpty()).filter { it.isNotBlank() }.joinToString(" · ")
                            Text(detail, color = PopMuted, fontFamily = InterFontFamily, fontSize = 10.sp, lineHeight = 13.sp, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
                            Text(task.priority, color = accent, fontFamily = InterFontFamily, fontSize = 10.sp, lineHeight = 13.sp, fontWeight = FontWeight.Medium)
                        }
                    }
                }
            }
        }
    }
}

'''+s[b:]
a=s.index('private fun CalendarTimelineContent(')
b=s.index('@Composable\nprivate fun CalendarTaskDetails',a)
t=s[a:b]
t=t.replace('val hourHeight = 72f','val hourHeight = 56f')
t=t.replace('Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp))','Column(Modifier.fillMaxWidth().padding(bottom = 12.dp), verticalArrangement = Arrangement.spacedBy(6.dp))')
x=t.index('                            Surface(onClick = { onOpen(task) }')
y=t.index('                        }\n                    }\n                }',x)
t=t[:x]+'''                            CalendarPrioritySurface(task, { onOpen(task) }, Modifier.fillMaxWidth()) {
                                Text(task.title, color = PopText, fontSize = 12.sp, lineHeight = 17.sp, fontWeight = FontWeight.Medium, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(horizontal = 12.dp, vertical = 9.dp))
                            }
'''+t[y:]
t=t.replace('                HorizontalDivider(color = PopBorder.copy(alpha = .6f), thickness = .5.dp)\n','')
t=t.replace('                            HorizontalDivider(color = PopBorder.copy(alpha = .55f), thickness = .5.dp)\n','')
t=t.replace('''                        Surface(
                            onClick = { onOpen(task) }, enabled = !task.calendarProjection,
                            color = PopSurfaceAlt, shape = RoundedCornerShape(10.dp), border = BorderStroke(.5.dp, PopBorder),''','''                        CalendarPrioritySurface(
                            task = task, onOpen = { onOpen(task) },''')
t=t.replace('                                Box(Modifier.width(2.dp).fillMaxHeight().background(accent))\n','')
t=t.replace('fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.SemiBold','fontSize = 11.sp, lineHeight = 15.sp, fontWeight = FontWeight.SemiBold')
t=t.replace('''                                        Text(timeLabel, color = PopMuted, fontSize = 10.sp, lineHeight = 12.sp, fontWeight = FontWeight.Medium, maxLines = 1)''','''                                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                            Text(timeLabel, color = PopMuted, fontSize = 10.sp, lineHeight = 12.sp, fontWeight = FontWeight.Medium, maxLines = 1, modifier = Modifier.weight(1f))
                                            if (item.columns == 1) Text(task.priority, color = accent, fontSize = 9.sp, lineHeight = 12.sp)
                                        }''')
# In the tighter grid, 30/45 minute blocks use one line and retain the full title in task details.
t=t.replace('if (height < 50.dp)', 'if (height < 44.dp)')
s=s[:a]+t+s[b:]
replace('"Hoje", if (index == 2) "Alta" else "Média", dueTime = time', '"Hoje", listOf("Média", "Alta", "Urgente", "Baixa", "Média")[index], dueTime = time')
p.write_text(s,encoding='utf-8')

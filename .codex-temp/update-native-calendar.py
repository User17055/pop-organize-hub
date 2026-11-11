from pathlib import Path

p = Path('android/app/src/main/java/br/com/poporganize/app/ui/PopOrganizeApp.kt')
s = p.read_text(encoding='utf-8')
calendar = s.index('private fun CalendarScreen(')
start = s.index('    var showFilters by remember', calendar)
s = s[:start] + '    var dayView by remember { mutableStateOf(true) }\n' + s[start:]
start = s.index('    val selectedDayTasks = remember(', calendar)
end = s.index('    val selectedDateLabel =', start)
s = s[:start] + '''    val selectedDayTasks = remember(visibleCalendarTasks, filteredTaskSnapshot, selectedDate) {
        val previousDate = selectedDate.minusDays(1).toString()
        (visibleCalendarTasks + filteredTaskSnapshot.filter { it.dueDate == previousDate })
            .distinctBy { "${it.serverId.ifBlank { it.id.toString() }}:${it.dueDate}" }
            .filter { task ->
                task.dueDate == selectedDate.toString() ||
                    (task.dueDate == previousDate && taskDurationMinutes(task.duration)?.let { duration ->
                        (task.recurrenceTimes.ifEmpty { listOf(task.dueTime) }).any { time ->
                            agendaMinute(time)?.let { it + duration > 1440 } == true
                        }
                    } == true)
            }
            .sortedWith(compareBy<PopTask> { it.completed }.thenBy {
                when (it.priority) { "Urgente" -> 0; "Alta" -> 1; "Média" -> 2; else -> 3 }
            }.thenBy { it.dueTime })
    }
''' + s[end:]
start = s.index('        item {\n            Box(Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 12.dp))', calendar)
end = s.index('        item {\n            HorizontalPager(', start)
s = s[:start] + '''        item {
            Column(Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 8.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = {
                        if (dayView) { month = month.minusMonths(1) }
                        else pagerScope.launch { pagerState.animateScrollToPage(pagerState.currentPage - 1) }
                    }) { Icon(Icons.Rounded.ChevronLeft, "Mês anterior") }
                    Text(
                        "${month.month.getDisplayName(TextStyle.FULL, locale).replaceFirstChar { it.uppercase() }} ${month.year}",
                        fontWeight = FontWeight.ExtraBold, fontSize = 17.sp,
                        modifier = Modifier.weight(1f), textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                    )
                    IconButton(onClick = {
                        if (dayView) { month = month.plusMonths(1) }
                        else pagerScope.launch { pagerState.animateScrollToPage(pagerState.currentPage + 1) }
                    }) { Icon(Icons.Rounded.ChevronRight, "Próximo mês") }
                }
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(Modifier.background(PopSurfaceAlt, RoundedCornerShape(12.dp)).padding(3.dp)) {
                        listOf(false to "Mês", true to "Dia").forEach { (isDay, label) ->
                            Surface(
                                onClick = { dayView = isDay },
                                color = if (dayView == isDay) PopBlue else Color.Transparent,
                                contentColor = if (dayView == isDay) Color.White else PopMuted,
                                shape = RoundedCornerShape(9.dp),
                            ) { Text(label, fontSize = 12.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 17.dp, vertical = 9.dp)) }
                        }
                    }
                    Spacer(Modifier.weight(1f))
                    TextButton(onClick = {
                        selectedDate = today; month = YearMonth.from(today)
                        if (!dayView) pagerScope.launch { pagerState.scrollToPage(pagerCenter) }
                    }) { Text("Hoje", fontWeight = FontWeight.Bold) }
                    if (workSpace == WorkSpace.Company) {
                        Surface(
                            onClick = { showFilters = true },
                            color = if (activeFilterCount > 0) PopBlue else PopBlueSoft,
                            contentColor = if (activeFilterCount > 0) Color.White else PopBlue,
                            shape = RoundedCornerShape(12.dp),
                        ) {
                            Row(Modifier.padding(horizontal = 11.dp, vertical = 11.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                CalendarFilterIcon(if (activeFilterCount > 0) Color.White else PopBlue, Modifier.size(19.dp))
                                Text(if (activeFilterCount > 0) "Filtros · $activeFilterCount" else "Filtros", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        }
''' + s[end:]
start = s.index('        item {\n            HorizontalPager(', calendar)
s = s[:start] + s[start:].replace('''        item {
            HorizontalPager(''', '''        item {
            if (dayView) {
                CalendarWeekStrip(selectedDate, today) { date ->
                    selectedDate = date
                    month = YearMonth.from(date)
                }
            } else HorizontalPager(''',1)
start=s.index('    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 24.dp))',calendar)
s=s[:start]+'''    LaunchedEffect(dayView) {
        if (!dayView) {
            val page = pagerCenter + ChronoUnit.MONTHS.between(anchorMonth, month).toInt()
            pagerState.scrollToPage(page)
        }
    }

'''+s[start:]
start=s.index('''                if (selectedDayTasks.isEmpty()) {''',calendar)
end=s.index('''            }
        }
    }

    if (showFilters''',start)
s=s[:start]+'''                CalendarDayAgenda(
                    tasks = selectedDayTasks,
                    selectedDate = selectedDate,
                    today = today,
                    timeline = dayView,
                    onOpenTask = onOpenTask,
                    onToggleTaskComplete = onToggleTaskComplete,
                )
'''+s[end:]
start=s.index('@Composable\nprivate fun CalendarDayAgenda(')
end=s.index('@Composable\nprivate fun CalendarTaskDetails(',start)
s=s[:start]+'''@Composable
private fun CalendarWeekStrip(selected: LocalDate, today: LocalDate, onSelect: (LocalDate) -> Unit) {
    val start = selected.minusDays((selected.dayOfWeek.value - 1).toLong())
    Row(Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 12.dp)) {
        repeat(7) { index ->
            val date = start.plusDays(index.toLong())
            Column(Modifier.weight(1f).clickable { onSelect(date) }, horizontalAlignment = Alignment.CenterHorizontally) {
                Text(listOf("S", "T", "Q", "Q", "S", "S", "D")[index], color = PopMuted, fontSize = 10.sp)
                Spacer(Modifier.height(7.dp))
                Box(
                    Modifier.size(35.dp).background(if (date == selected) PopBlue else Color.Transparent, CircleShape)
                        .border(if (date == today && date != selected) 1.dp else 0.dp, if (date == today && date != selected) PopBlue else Color.Transparent, CircleShape),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(date.dayOfMonth.toString(), color = if (date == selected) Color.White else PopText, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                }
            }
        }
    }
}

@Composable
private fun CalendarAgendaEvent(task: PopTask, timeLabel: String, onOpen: () -> Unit, onToggle: (() -> Unit)? = null, modifier: Modifier = Modifier) {
    val color = if (task.completed) PopBlue else taskPriorityColor(task.priority)
    Surface(
        onClick = onOpen,
        enabled = !task.calendarProjection,
        color = color.copy(alpha = .13f),
        shape = RoundedCornerShape(7.dp),
        modifier = modifier.border(1.dp, color.copy(alpha = .24f), RoundedCornerShape(7.dp)),
    ) {
        Row(Modifier.fillMaxSize(), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.width(3.dp).fillMaxHeight().background(color))
            Column(Modifier.weight(1f).padding(horizontal = 9.dp, vertical = 5.dp)) {
                Text(task.title, color = if (task.completed) PopMuted else PopText, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, maxLines = 2, overflow = TextOverflow.Ellipsis)
                if (timeLabel.isNotBlank()) Text(timeLabel, color = color, fontSize = 10.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            if (onToggle != null && !task.calendarProjection) {
                IconButton(onClick = onToggle, enabled = task.canComplete, modifier = Modifier.size(36.dp)) {
                    Icon(if (task.completed) Icons.Rounded.CheckCircle else Icons.Rounded.RadioButtonUnchecked, if (task.completed) "Reabrir tarefa" else "Concluir tarefa", tint = color, modifier = Modifier.size(20.dp))
                }
            }
        }
    }
}

@Composable
private fun CalendarDayAgenda(
    tasks: List<PopTask>,
    selectedDate: LocalDate,
    today: LocalDate,
    timeline: Boolean,
    onOpenTask: (PopTask) -> Unit,
    onToggleTaskComplete: (PopTask) -> Unit,
) {
    var showAllUntimed by remember(selectedDate) { mutableStateOf(false) }
    var now by remember { mutableStateOf(LocalTime.now()) }
    LaunchedEffect(selectedDate) {
        while (true) { now = LocalTime.now(); delay(30_000) }
    }
    val intervals = remember(tasks, selectedDate) {
        tasks.flatMap { task ->
            val days = runCatching { ChronoUnit.DAYS.between(selectedDate, LocalDate.parse(task.dueDate)).toInt() }.getOrDefault(0)
            task.recurrenceTimes.ifEmpty { listOf(task.dueTime) }.distinct().mapNotNull { time ->
                val start = agendaMinute(time)?.plus(days * 1440) ?: return@mapNotNull null
                val duration = taskDurationMinutes(task.duration) ?: 30
                if (start >= 1440 || start + duration <= 0) return@mapNotNull null
                AgendaInterval("${task.serverId.ifBlank { task.id.toString() }}:$time", task, start, duration)
            }
        }
    }
    val untimed = tasks.filter { task -> task.dueDate == selectedDate.toString() && agendaMinute(task.dueTime) == null && task.recurrenceTimes.isEmpty() }
    if (!timeline) {
        if (tasks.isEmpty()) Text("Nenhuma tarefa para este dia.", color = PopMuted, fontSize = 13.sp, modifier = Modifier.padding(vertical = 18.dp))
        intervals.sortedBy { it.startMinute }.forEach { interval ->
            CalendarAgendaEvent(interval.task, agendaTimeLabel(interval.startMinute) + taskEndLabel(agendaTimeLabel(interval.startMinute), interval.task.duration),
                onOpen = { onOpenTask(interval.task) }, onToggle = { onToggleTaskComplete(interval.task) }, modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp).padding(vertical = 3.dp))
        }
        untimed.forEach { task ->
            CalendarAgendaEvent(task, "Sem horário", { onOpenTask(task) }, { onToggleTaskComplete(task) }, Modifier.fillMaxWidth().heightIn(min = 52.dp).padding(vertical = 3.dp))
        }
        return
    }
    if (untimed.isNotEmpty()) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("Sem horário", color = PopMuted, fontSize = 11.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
            if (untimed.size > 3) TextButton(onClick = { showAllUntimed = !showAllUntimed }) {
                Text(if (showAllUntimed) "Recolher" else "Ver ${untimed.size}", fontSize = 11.sp)
            }
        }
        (if (showAllUntimed) untimed else untimed.take(3)).forEach { task ->
            CalendarAgendaEvent(task, "", { onOpenTask(task) }, { onToggleTaskComplete(task) }, Modifier.fillMaxWidth().height(48.dp).padding(bottom = 4.dp))
        }
        Spacer(Modifier.height(12.dp))
    }
    val placements = remember(intervals) { layoutAgendaIntervals(intervals) }
    val hourHeight = 72.dp
    val gutter = 48.dp
    val scrollState = rememberScrollState()
    val density = LocalDensity.current
    LaunchedEffect(selectedDate) {
        val focus = if (selectedDate == today) now.hour * 60 + now.minute else intervals.minOfOrNull { it.startMinute } ?: 480
        scrollState.scrollTo(with(density) { (hourHeight * ((focus - 60).coerceIn(0, 1200) / 60f)).roundToPx() })
    }
    Box(Modifier.fillMaxWidth().height(440.dp).clipToBounds().verticalScroll(scrollState)) {
        BoxWithConstraints(Modifier.fillMaxWidth().height(hourHeight * 24 + 20.dp)) {
            val eventArea = maxWidth - gutter
            repeat(25) { hour ->
                Row(Modifier.fillMaxWidth().offset(y = hourHeight * hour + 8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text(if (hour == 24) "24:00" else "%02d:00".format(hour), color = PopMuted, fontSize = 10.sp, modifier = Modifier.width(gutter))
                    Box(Modifier.weight(1f).height(1.dp).background(PopBorder.copy(alpha = .65f)))
                }
                if (hour < 24) Box(Modifier.offset(x = gutter, y = hourHeight * hour + hourHeight / 2 + 14.dp).width(eventArea).height(1.dp).background(PopBorder.copy(alpha = .2f)))
            }
            placements.forEach { placement ->
                val interval = placement.interval
                val start = interval.startMinute.coerceAtLeast(0)
                val end = (interval.startMinute + interval.durationMinutes).coerceAtMost(1440)
                val width = eventArea / placement.columns
                val minutes = taskDurationMinutes(interval.task.duration)
                val label = if (interval.startMinute < 0) "Até ${agendaTimeLabel(end)}" else agendaTimeLabel(start) + if (minutes != null) " – ${agendaTimeLabel(interval.startMinute + minutes)}" else ""
                CalendarAgendaEvent(
                    task = interval.task,
                    timeLabel = label,
                    onOpen = { onOpenTask(interval.task) },
                    modifier = Modifier.offset(x = gutter + width * placement.column + 3.dp, y = hourHeight * (start / 60f) + 14.dp)
                        .width(width - 5.dp).height(maxOf(34.dp, hourHeight * ((end - start) / 60f) - 2.dp)),
                )
            }
            if (selectedDate == today) {
                val minute = now.hour * 60 + now.minute
                Row(Modifier.fillMaxWidth().offset(y = hourHeight * (minute / 60f) + 6.dp).zIndex(2f), verticalAlignment = Alignment.CenterVertically) {
                    Text(agendaTimeLabel(minute), color = Color(0xFFFF4B55), fontWeight = FontWeight.Bold, fontSize = 10.sp, modifier = Modifier.width(gutter))
                    Box(Modifier.size(6.dp).background(Color(0xFFFF4B55), CircleShape))
                    Box(Modifier.weight(1f).height(1.dp).background(Color(0xFFFF4B55)))
                }
            }
        }
    }
}

'''+s[end:]
p.write_text(s, encoding='utf-8', newline='\r\n')

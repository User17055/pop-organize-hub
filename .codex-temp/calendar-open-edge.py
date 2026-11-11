from pathlib import Path
p=Path('android/app/src/main/java/br/com/poporganize/app/ui/PopOrganizeApp.kt')
s=p.read_text(encoding='utf-8')
def replace(a,b):
    global s
    assert a in s, a[:100]
    s=s.replace(a,b,1)
replace('import androidx.compose.ui.graphics.StrokeCap','import androidx.compose.ui.graphics.Path\nimport androidx.compose.ui.graphics.drawscope.Stroke\nimport androidx.compose.ui.graphics.StrokeCap')
replace('''                        tasks = selectedDayTasks,
                        today = today,
                        onOpenTask = onOpenTask,''','''                        tasks = selectedDayTasks,
                        today = today,
                        members = activeMembers,
                        onOpenTask = onOpenTask,''')
a=s.index('/** Priority fades into the page')
b=s.index('@OptIn(ExperimentalMaterial3Api::class)',a)
s=s[:a]+'''/** An open color accent: the right and bottom edges blend into the page. */
@Composable
private fun CalendarPrioritySurface(task: PopTask, onOpen: () -> Unit, modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    val accent = if (task.completed) PopBlue else taskPriorityColor(task.priority)
    val pageColor = PopBackground
    val surfaceColor = PopSurface
    val shape = RoundedCornerShape(16.dp)
    Box(
        modifier = modifier.clip(shape)
            .background(Brush.linearGradient(0f to lerp(surfaceColor, accent, .09f), .5f to lerp(surfaceColor, pageColor, .5f), 1f to pageColor), shape)
            .clickable(enabled = !task.calendarProjection, onClick = onOpen),
    ) {
        Canvas(Modifier.matchParentSize()) {
            val stroke = 1.1.dp.toPx()
            val inset = stroke / 2f
            val radius = minOf(16.dp.toPx(), size.height / 2f).coerceAtLeast(stroke)
            val left = Path().apply {
                moveTo(radius, inset)
                quadraticBezierTo(inset, inset, inset, radius)
                lineTo(inset, size.height - inset)
            }
            drawPath(left, Brush.verticalGradient(0f to accent.copy(alpha = .75f), .5f to accent.copy(alpha = .38f), 1f to Color.Transparent), style = Stroke(stroke, cap = StrokeCap.Round))
            val fadeEnd = (size.width * .78f).coerceAtLeast(radius + stroke)
            drawLine(Brush.horizontalGradient(0f to accent.copy(alpha = .75f), .45f to accent.copy(alpha = .14f), 1f to Color.Transparent, startX = radius, endX = fadeEnd), Offset(radius, inset), Offset(fadeEnd, inset), stroke, StrokeCap.Round)
        }
        content()
    }
}

@Composable
private fun CalendarOriginalTaskInfo(task: PopTask, modifier: Modifier = Modifier) {
    val tint = PopMuted
    val hasAttachment = task.attachmentName.isNotBlank() || task.attachmentData.isNotBlank()
    Row(modifier, verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(5.dp)) {
        if (task.recurrenceRule != "Não repetir") Icon(Icons.Rounded.Repeat, "Tarefa recorrente", tint = tint, modifier = Modifier.size(14.dp))
        if (task.description.isNotBlank()) Icon(Icons.Rounded.Description, "Possui anotação", tint = tint, modifier = Modifier.size(14.dp))
        if (hasAttachment) Icon(Icons.Rounded.AttachFile, "Possui anexo", tint = tint, modifier = Modifier.size(14.dp))
        if (task.checklist.isNotEmpty()) {
            Icon(Icons.Rounded.Checklist, "Checklist", tint = tint, modifier = Modifier.size(14.dp))
            Text("${task.checklist.count { it.completed }}/${task.checklist.size}", color = tint, fontFamily = InterFontFamily, fontSize = 10.sp, lineHeight = 14.sp)
        }
        val status = when {
            task.awaitingReview -> "Aguardando revisão"
            task.completed -> "Concluída"
            else -> ""
        }
        val labelColor = when {
            task.awaitingReview -> PopPurple
            task.completed -> PopBlue
            isTaskOverdue(task) -> taskPriorityColor("Urgente")
            else -> tint
        }
        Text(listOf(displayDueLabel(task), status).filter { it.isNotBlank() }.joinToString(" · "), color = labelColor, fontFamily = InterFontFamily, fontSize = 11.sp, lineHeight = 15.sp, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
    }
}

@Composable
private fun CalendarDayAgenda(
    tasks: List<PopTask>,
    today: LocalDate,
    members: List<CompanyMember>,
    onOpenTask: (PopTask) -> Unit,
    onToggleTaskComplete: (PopTask) -> Unit,
) {
    val timed = tasks.filter { agendaMinute(it.dueTime) != null }
    val untimed = tasks.filter { agendaMinute(it.dueTime) == null }
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        (timed + untimed).forEach { task ->
            if (task == untimed.firstOrNull()) {
                Text("Sem horário", color = PopMuted, fontFamily = InterFontFamily, fontSize = 11.sp, lineHeight = 15.sp, modifier = Modifier.padding(top = 6.dp, bottom = 2.dp))
            }
            val start = agendaMinute(task.dueTime)
            val duration = taskDurationMinutes(task.duration)
            CalendarPrioritySurface(task, { onOpenTask(task) }, Modifier.fillMaxWidth()) {
                Row(Modifier.fillMaxWidth().heightIn(min = 88.dp).padding(start = 5.dp, end = 12.dp, top = 12.dp, bottom = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                    IconButton(
                        onClick = { onToggleTaskComplete(task) },
                        enabled = !task.calendarProjection && !(task.awaitingReview && !task.canComplete),
                        modifier = Modifier.size(42.dp),
                    ) {
                        Icon(if (task.completed) Icons.Rounded.CheckCircle else Icons.Rounded.RadioButtonUnchecked,
                            if (task.completed) "Reabrir ${task.title}" else "Concluir ${task.title}", tint = if (task.completed) PopBlue else PopMuted, modifier = Modifier.size(24.dp))
                    }
                    Column(Modifier.width(48.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text(if (start != null) task.dueTime else "—", color = PopText, fontFamily = InterFontFamily, fontSize = 13.sp, lineHeight = 16.sp, fontWeight = FontWeight.Medium)
                        if (start != null && duration != null) Text(agendaTimeLabel(start + duration), color = PopMuted, fontFamily = InterFontFamily, fontSize = 11.sp, lineHeight = 14.sp)
                    }
                    Spacer(Modifier.width(8.dp))
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(task.title, color = if (task.completed) PopMuted else PopText, fontFamily = InterFontFamily, fontSize = 14.sp, lineHeight = 19.sp, fontWeight = FontWeight.SemiBold, maxLines = 2, overflow = TextOverflow.Ellipsis,
                                textDecoration = if (task.completed) TextDecoration.LineThrough else null, modifier = Modifier.weight(1f))
                            TaskAssigneeAvatarStack(task, members)
                        }
                        CalendarOriginalTaskInfo(task, Modifier.fillMaxWidth())
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            val detail = listOf(task.assignee.takeUnless { it == "Sem responsável" || it == "Eu" }.orEmpty(), duration?.let { taskDurationLabel(it) }.orEmpty()).filter { it.isNotBlank() }.joinToString(" · ")
                            Text(detail, color = PopMuted, fontFamily = InterFontFamily, fontSize = 11.sp, lineHeight = 15.sp, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
                            PriorityPill(task.priority)
                        }
                    }
                }
            }
        }
    }
}

'''+s[b:]
# Let longer timeline blocks carry the same metadata without squeezing short intervals.
replace('''                                            if (item.columns == 1) Text(task.priority, color = accent, fontSize = 9.sp, lineHeight = 12.sp)
                                        }
                                    }''','''                                            if (item.columns == 1) Text(task.priority, color = accent, fontSize = 9.sp, lineHeight = 12.sp)
                                        }
                                        if (height >= 74.dp) CalendarOriginalTaskInfo(task, Modifier.fillMaxWidth())
                                    }''')
# Debug fixture: show restored original indicators with local sample data.
replace('''                    description = "Tarefa de exemplo para conferir a agenda. As alterações ficam somente nesta prévia."))''','''                    description = "Tarefa de exemplo para conferir a agenda. As alterações ficam somente nesta prévia.",
                    attachmentName = if (index == 1) "pedido-exemplo.pdf" else "",
                    checklist = if (index == 1) listOf(TaskChecklistItem("preview-1", "Conferir itens", true), TaskChecklistItem("preview-2", "Finalizar conferência")) else emptyList(),
                    completed = index == 4))''')
p.write_text(s,encoding='utf-8')

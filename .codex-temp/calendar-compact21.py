from pathlib import Path
p=Path('android/app/src/main/java/br/com/poporganize/app/ui/PopOrganizeApp.kt')
s=p.read_text(encoding='utf-8')
def replace(a,b):
    global s
    assert a in s, a[:80]
    s=s.replace(a,b,1)
replace('private fun CalendarOriginalTaskInfo(task: PopTask, modifier: Modifier = Modifier)', 'private fun CalendarOriginalTaskInfo(task: PopTask, modifier: Modifier = Modifier, includeAssignee: Boolean = false)')
replace('''        Text(listOf(displayDueLabel(task), status).filter { it.isNotBlank() }.joinToString(" · "), color = labelColor,''','''        val supportingInfo = buildList {
            add(displayDueLabel(task))
            if (status.isNotBlank()) add(status)
            if (includeAssignee) {
                task.assignee.takeUnless { it.isBlank() || it == "Sem responsável" || it == "Eu" }?.let { add(it) }
                taskDurationMinutes(task.duration)?.let { add(taskDurationLabel(it)) }
            }
        }.joinToString(" · ")
        Text(supportingInfo, color = labelColor,''')
a=s.index('private fun CalendarDayAgenda(')
b=s.index('@OptIn(ExperimentalMaterial3Api::class)',a)
t=s[a:b]
t=t.replace('Arrangement.spacedBy(8.dp)', 'Arrangement.spacedBy(4.dp)',1)
x=t.index('                Row(Modifier.fillMaxWidth().heightIn(')
y=t.index('\n            }\n        }\n    }\n}',x)
t=t[:x]+'''                Row(Modifier.fillMaxWidth().heightIn(min = 58.dp).padding(start = 4.dp, end = 8.dp, top = 7.dp, bottom = 7.dp), verticalAlignment = Alignment.CenterVertically) {
                    IconButton(
                        onClick = { onToggleTaskComplete(task) },
                        enabled = !task.calendarProjection && !(task.awaitingReview && !task.canComplete),
                        modifier = Modifier.size(36.dp),
                    ) {
                        Icon(if (task.completed) Icons.Rounded.CheckCircle else Icons.Rounded.RadioButtonUnchecked,
                            if (task.completed) "Reabrir ${task.title}" else "Concluir ${task.title}", tint = if (task.completed) PopBlue else PopMuted, modifier = Modifier.size(21.dp))
                    }
                    if (start != null) {
                        Column(Modifier.width(43.dp), verticalArrangement = Arrangement.spacedBy(1.dp)) {
                            Text(task.dueTime, color = PopText, fontFamily = InterFontFamily, fontSize = 11.sp, lineHeight = 13.sp, fontWeight = FontWeight.Medium)
                            if (duration != null) Text(agendaTimeLabel(start + duration), color = PopMuted, fontFamily = InterFontFamily, fontSize = 10.sp, lineHeight = 12.sp)
                        }
                    }
                    Spacer(Modifier.width(6.dp))
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Text(task.title, color = if (task.completed) PopMuted else PopText, fontFamily = InterFontFamily, fontSize = 13.sp, lineHeight = 17.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis,
                                textDecoration = if (task.completed) TextDecoration.LineThrough else null, modifier = Modifier.weight(1f))
                            TaskAssigneeAvatarStack(task, members)
                        }
                        CalendarOriginalTaskInfo(task, Modifier.fillMaxWidth(), includeAssignee = true)
                    }
                    Spacer(Modifier.width(5.dp))
                    PriorityPill(task.priority)
                }'''+t[y:]
s=s[:a]+t+s[b:]
old='''                                Column(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Text(task.title, color = if (task.completed) PopMuted else PopText, fontSize = 14.sp, lineHeight = 19.sp, fontWeight = FontWeight.SemiBold, maxLines = 2, overflow = TextOverflow.Ellipsis)
                                    CalendarOriginalTaskInfo(task, Modifier.fillMaxWidth())
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text(task.assignee, color = PopMuted, fontSize = 11.sp, lineHeight = 15.sp, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
                                        PriorityPill(task.priority)
                                    }
                                }'''
new='''                                Row(Modifier.fillMaxWidth().heightIn(min = 52.dp).padding(horizontal = 10.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                                        Text(task.title, color = if (task.completed) PopMuted else PopText, fontSize = 13.sp, lineHeight = 17.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                        CalendarOriginalTaskInfo(task, Modifier.fillMaxWidth(), includeAssignee = true)
                                    }
                                    Spacer(Modifier.width(5.dp))
                                    PriorityPill(task.priority)
                                }'''
replace(old,new)
replace('Column(Modifier.heightIn(max = 128.dp).verticalScroll(rememberScrollState())','Column(Modifier.heightIn(max = 104.dp).verticalScroll(rememberScrollState())')
p.write_text(s,encoding='utf-8')

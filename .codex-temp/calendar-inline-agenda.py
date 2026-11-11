from pathlib import Path
p=Path('android/app/src/main/java/br/com/poporganize/app/ui/PopOrganizeApp.kt')
s=p.read_text(encoding='utf-8')
def replace(a,b):
    global s
    assert a in s, a[:100]
    s=s.replace(a,b,1)
replace('import androidx.compose.material.icons.rounded.KeyboardArrowDown', 'import androidx.compose.material.icons.rounded.KeyboardArrowUp\nimport androidx.compose.material.icons.rounded.KeyboardArrowDown')
replace('import androidx.compose.runtime.Composable', 'import androidx.compose.runtime.saveable.rememberSaveable\nimport androidx.compose.runtime.Composable')
replace('var showDayTimeline by remember { mutableStateOf(false) }', 'var showDayTimeline by remember { mutableStateOf(false) }\n    var agendaExpanded by rememberSaveable { mutableStateOf(false) }')
replace('''                    TextButton(onClick = { showDayTimeline = true }, contentPadding = PaddingValues(horizontal = 7.dp)) {
                        Icon(Icons.Rounded.AccessTime, null, modifier = Modifier.size(15.dp))
                        Spacer(Modifier.width(5.dp))
                        Text("Horários", fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                    }''', '''                    TextButton(onClick = { agendaExpanded = !agendaExpanded }, contentPadding = PaddingValues(horizontal = 7.dp)) {
                        Icon(if (agendaExpanded) Icons.Rounded.KeyboardArrowUp else Icons.Rounded.KeyboardArrowDown, null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(3.dp))
                        Text(if (agendaExpanded) "Recolher" else "Abrir agenda", fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                    }''')
replace('''                if (selectedDayTasks.isEmpty()) {
                    Text("Nenhuma tarefa para este dia.",''', '''                if (agendaExpanded) {
                    Surface(color = PopSurface, shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
                        Column {
                            Row(Modifier.fillMaxWidth().padding(start = 14.dp, end = 5.dp), verticalAlignment = Alignment.CenterVertically) {
                                Text("Agenda aberta", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                                TextButton(onClick = { showDayTimeline = true }) { Text("Ampliar", fontSize = 11.sp) }
                            }
                            CalendarTimelineContent(selectedDate, selectedDayTasks, onOpenTask, Modifier.height(440.dp))
                        }
                    }
                } else if (selectedDayTasks.isEmpty()) {
                    Text("Nenhuma tarefa para este dia.",''')
# Share the timeline between its inline and enlarged presentations.
start=s.index('    val intervals = tasks.mapNotNull',s.index('private fun CalendarDailyTimeline('))
modal=s.index('    ModalBottomSheet(',start)
state=s[start:modal]
contentstart=s.index('            val untimed = tasks.filter',modal)
end=s.index('\n@Composable\nprivate fun CalendarTaskDetails',contentstart)
old=s[contentstart:end]
# Last braces close the content Column, ModalBottomSheet and composable function.
assert old.endswith('        }\n    }\n}\n')
content=old[:-len('        }\n    }\n}\n')]
header=s[modal:contentstart]
newmodal=header+'''            CalendarTimelineContent(date, tasks, { onDismiss(); onOpen(it) }, Modifier.weight(1f))
        }
    }
}

@Composable
private fun CalendarTimelineContent(date: LocalDate, tasks: List<PopTask>, onOpen: (PopTask) -> Unit, modifier: Modifier = Modifier) {
'''+state+'''    Column(modifier.fillMaxWidth()) {
'''+content.replace('onDismiss(); onOpen(task)', 'onOpen(task)')+'''    }
}
'''
s=s[:start]+newmodal+s[end:]
p.write_text(s,encoding='utf-8')

from pathlib import Path
p=Path('android/app/src/main/java/br/com/poporganize/app/ui/PopOrganizeApp.kt')
s=p.read_text(encoding='utf-8')
a=s.index('    Box(\n',s.index('private fun GoogleProfileAvatar('))
b=s.index('\n    }\n}\n\nprivate fun organizationId',a)
s=s[:a]+''.join('    '+line if line.strip() else line for line in s[a:b].splitlines(keepends=True))+s[b:]
a=s.index('        if (!isImage) {',s.index('private fun TaskAttachmentPreview('))
b=s.index('\n    }\n    }\n    val lowerName',a)
s=s[:a]+''.join('    '+line if line.strip() else line for line in s[a:b].splitlines(keepends=True))+s[b:]
s=s.replace('\n    }\n    }\n    val lowerName','\n        }\n    }\n    val lowerName',1)
a=s.index('private fun LazyListScope.calendarDayAgenda(')
b=s.index('\n@OptIn',a)
block=s[a:b]
lines=block.splitlines(keepends=True)
inside=False
for i,line in enumerate(lines):
    if line.startswith('        Text(') or line.startswith('            val unavailable'):
        inside=True
    if inside:
        lines[i]='    '+line if line.strip() else line
    if inside and (line.startswith('        )') or line.startswith('            )')):
        inside=False
s=s[:a]+''.join(lines)+s[b:]
p.write_text(s,encoding='utf-8')

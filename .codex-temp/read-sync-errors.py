import collections, datetime, pathlib, re, subprocess
result=subprocess.run(['journalctl','-u','pop-organize','--since','45 minutes ago','--no-pager','-o','cat'],capture_output=True,text=True)
lines=result.stdout.splitlines()
print('Sync error messages:')
for i,line in enumerate(lines):
    if 'Mobile task sync failed' in line:
        print('\n'.join(lines[i:i+3]))
counts=collections.Counter(); recent=[]
for path in [pathlib.Path('/var/log/nginx/access.log'),pathlib.Path('/var/log/nginx/pop-organize-access.log')]:
    if not path.exists(): continue
    for line in path.read_text(errors='replace').splitlines()[-15000:]:
        match=re.search(r'\[([^]]+)\] "(GET|PUT) /api/mobile/tasks[^ ]* HTTP/[^ ]+" (\d+)',line)
        if match:
            date,method,status=match.groups()
            counts[(method,status)]+=1
            recent.append((date,method,status))
print('Task API request status counts:',dict(counts))
print('Latest task API request dates/status:',recent[-15:])

classes=collections.Counter()
for line in pathlib.Path('/var/log/nginx/access.log').read_text(errors='replace').splitlines()[-15000:]:
    if '/downloads/pop-organize-teste-1.0.15-build24.apk' not in line: continue
    agent = 'Android' if 'Android' in line else 'curl' if 'curl/' in line else 'Other'
    method = 'HEAD' if '"HEAD ' in line else 'GET'
    classes[(agent,method)] += 1
print('Build24 download client classes:', dict(classes))

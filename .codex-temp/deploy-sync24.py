from pathlib import Path
import datetime, hashlib, json, os, pwd, shutil, subprocess, time, urllib.request

root = Path('/var/www/pop-organize').resolve()
stage = Path('/var/www/pop-organize-sync-JSXwNf').resolve()
assert root == Path('/var/www/pop-organize') and stage.parent == root.parent
assert subprocess.check_output(['git', 'rev-parse', '--short', 'HEAD'], cwd=root, text=True).strip() == '467672f'
paths = ['src/lib/database.ts', 'src/lib/mobile-api.server.ts', 'src/lib/mobile-task-sync.ts', 'src/lib/domain.ts', 'src/lib/task-duration.ts',
         'src/routes/api/mobile/tasks.ts', 'src/routes/api/mobile/task-lists.ts']
for path in paths:
    assert (stage / path).is_file()
assert (stage / '.output/server/index.mjs').is_file()
assert subprocess.check_output(['systemctl', 'is-active', 'pop-organize'], text=True).strip() == 'active'
stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
backup = root.parent / ('pop-organize-sync-backup-' + stamp)
backup.mkdir(mode=0o700)
new_output = root / ('.output-sync24-' + stamp)
old_output = root / ('.output-before-sync24-' + stamp)
assert not new_output.exists() and not old_output.exists()
existing = {}
for path in paths:
    original = root / path
    existing[path] = original.exists()
    if original.exists():
        target = backup / path
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(original, target)
shutil.copytree(stage / '.output', new_output)
# Preserve hashed assets for browsers which still have the previous HTML loaded.
for relative in ['public', 'server/_ssr']:
    previous = root / '.output' / relative
    if not previous.exists(): continue
    for source in previous.rglob('*'):
        if source.is_symlink() or not source.is_file(): continue
        target = new_output / relative / source.relative_to(previous)
        if not target.exists():
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, target)
deploy = pwd.getpwnam('deploy')
for directory, dirs, files in os.walk(new_output):
    os.chown(directory, deploy.pw_uid, deploy.pw_gid)
    for name in files: os.chown(Path(directory) / name, deploy.pw_uid, deploy.pw_gid, follow_symlinks=False)

switched = False
try:
    for path in paths: shutil.copy2(stage / path, root / path)
    os.replace(root / '.output', old_output)
    os.replace(new_output, root / '.output')
    switched = True
    subprocess.run(['systemctl', 'restart', 'pop-organize'], check=True)
    healthy = False
    for attempt in range(20):
        try:
            with urllib.request.urlopen('http://127.0.0.1:3000/api/health', timeout=3) as response:
                healthy = response.status == 200
            if healthy: break
        except Exception: pass
        time.sleep(1)
    assert healthy, 'Health check failed'
    assert subprocess.check_output(['systemctl', 'is-active', 'pop-organize'], text=True).strip() == 'active'
except Exception:
    if switched:
        failed = root / ('.output-failed-sync24-' + stamp)
        os.replace(root / '.output', failed)
        os.replace(old_output, root / '.output')
    elif old_output.exists() and not (root / '.output').exists():
        os.replace(old_output, root / '.output')
    for path in paths:
        if existing[path]: shutil.copy2(backup / path, root / path)
        elif (root / path).exists(): (root / path).unlink()
    subprocess.run(['systemctl', 'restart', 'pop-organize'], check=True)
    raise
print(json.dumps({'deployed': True, 'health': 200, 'sourceBackup': str(backup), 'previousOutput': str(old_output),
                  'sourceHashes': {path: hashlib.sha256((root/path).read_bytes()).hexdigest() for path in paths}}))

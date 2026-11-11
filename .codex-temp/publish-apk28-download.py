from pathlib import Path
import hashlib
import subprocess

name = 'pop-organize-teste-1.0.15-build28.apk'
expected = '8b4852bd4e26508d1b14ef840a7020fc6aeae578e68975438868c0290bd71325'
staging = Path('/var/www/pop-organize-downloads') / (name + '.upload')
target = staging.with_name(name)
assert hashlib.sha256(staging.read_bytes()).hexdigest() == expected, 'APK checksum mismatch'
if target.exists():
    assert hashlib.sha256(target.read_bytes()).hexdigest() == expected, 'Existing version differs'
staging.chmod(0o644)
staging.replace(target)

config = Path('/etc/nginx/sites-enabled/pop-organize').resolve()
original = config.read_text()
uri = '/downloads/' + name
if 'location = ' + uri not in original:
    backup = Path('/tmp/pop-organize-nginx-before-apk28-20261111.conf')
    if not backup.exists():
        backup.write_text(original)
    marker = '    location = /downloads/pop-organize-android.apk {'
    assert original.count(marker) == 1, 'Expected existing Android download route'
    block = f'''    location = {uri} {{
        alias {target};
        default_type application/vnd.android.package-archive;
        add_header Content-Disposition 'attachment; filename="{name}"';
        add_header Cache-Control "no-cache";
        add_header X-Robots-Tag "noindex, nofollow";
    }}

'''
    config.write_text(original.replace(marker, block + marker, 1))
    checked = subprocess.run(['nginx', '-t'], capture_output=True, text=True)
    if checked.returncode:
        config.write_text(original)
        raise RuntimeError('Nginx validation failed; original config restored: ' + checked.stderr)
    subprocess.run(['systemctl', 'reload', 'nginx'], check=True)
print('Published:', uri, 'bytes:', target.stat().st_size, 'sha256:', expected)

from pathlib import Path
import hashlib
import zipfile

root = Path(__file__).resolve().parents[1]
output = root.parent / 'output'
output.mkdir(exist_ok=True)
archive = output / ('HanyuFlow-Android-source.zip' if '--android' in __import__('sys').argv else 'HanyuFlow-source.zip')
excluded_dirs = {'node_modules', '.next', '.git', '.gradle', 'build', '.idea', 'test-results', 'playwright-report', '__pycache__'}
included = []
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as target:
    for path in sorted(root.rglob('*')):
        if not path.is_file():
            continue
        relative = path.relative_to(root)
        if any(part in excluded_dirs for part in relative.parts):
            continue
        if path.name.startswith('.env') and path.name != '.env.example':
            continue
        if path.name == 'local.properties' or path.suffix in {'.keystore', '.jks'}:
            continue
        if path.suffix in {'.db', '.db-journal', '.tsbuildinfo'} or '.db-' in path.name:
            continue
        target.write(path, Path('HanyuFlow') / relative)
        included.append(str(relative))
with zipfile.ZipFile(archive) as target:
    if target.testzip() is not None:
        raise RuntimeError('Archive integrity check failed')
    names = target.namelist()
    assert 'HanyuFlow/package-lock.json' in names
    assert 'HanyuFlow/prisma/migrations/20261012000000_initial/migration.sql' in names
    assert all(not name.endswith('/.env') and not name.endswith('.db') for name in names)
digest = hashlib.sha256(archive.read_bytes()).hexdigest()
archive.with_suffix('.sha256').write_text(f'{digest}  {archive.name}\n',encoding='utf-8')
print(f'{archive}\n{len(included)} files; {archive.stat().st_size} bytes\nSHA256 {digest}')

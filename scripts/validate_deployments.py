#!/usr/bin/env python3
"""Check example deployment contracts before publishing their badges (requires PyYAML)."""
from pathlib import Path
import re
import subprocess
import yaml


ROOT = Path(__file__).resolve().parents[1]


def validate_app(path, app, strategy):
    directory = path.parent / app.get('path', '.')
    for field in ('install', 'build', 'start'):
        command = app.get(field)
        if command:
            result = subprocess.run(['bash', '-n'], input=command, text=True, capture_output=True)
            assert result.returncode == 0, f'{path}: invalid {field}: {result.stderr}'
    if strategy == 'image':
        assert app.get('reproducible') is True, f'{path}: image app needs reproducible: true'
        return
    for field in ('install', 'build', 'start'):
        command = '\n'.join(line for line in app.get(field, '').splitlines()
                            if not line.lstrip().startswith('#'))
        assert not re.search(r'\bsudo\b|--break-system-packages', command), f'{path}: privileged {field}'
    for source in app.get('dependencyInputs', []):
        assert (directory / source).is_file(), f'{path}: missing dependency input {source}'
    for output in app.get('dependencyOutputs', []):
        assert app.get('dependencyInputs') and app.get('install'), f'{path}: missing dependency contract'
        assert not app.get('build'), f'{path}: immutable outputs cannot have a build hook'
        assert not (directory / output).exists(), f'{path}: generated dependencies must not be uploaded'
    if app.get('kind') == 'cli':
        assert app.get('executables'), f'{path}: CLI entrypoints must be declared'
        for executable in app['executables'].values():
            assert (directory / executable).is_file(), f'{path}: missing CLI entrypoint {executable}'


def main():
    counts = {'incremental': 0, 'image': 0}
    for path in sorted(ROOT.rglob('rig.yaml')):
        if any(part in ('node_modules', '.venv') for part in path.parts):
            continue
        doc = yaml.safe_load(path.read_text())
        strategy = doc.get('workspace', {}).get('deployment', {}).get('strategy')
        assert strategy in counts, f'{path}: explicit deployment strategy required'
        for app in doc.get('apps', {'app': doc}).values():
            validate_app(path, app, strategy)
        counts[strategy] += 1
    print(f'Validated {sum(counts.values())} manifests: {counts}')


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
import glob, subprocess, os, sys
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
files = sorted(glob.glob(os.path.join(project_root, 'test_*.py')))
if not files:
    print('No test scripts found')
    sys.exit(0)
for f in files:
    print('\n--- Running', f)
    # Ensure project root is on PYTHONPATH so scripts can import `myproject`
    env = os.environ.copy()
    env['PYTHONPATH'] = project_root + os.pathsep + env.get('PYTHONPATH', '')
    p = subprocess.run([sys.executable, f], capture_output=True, text=True, env=env)
    print('EXIT', p.returncode)
    if p.stdout:
        print('STDOUT:\n' + p.stdout)
    if p.stderr:
        print('STDERR:\n' + p.stderr)

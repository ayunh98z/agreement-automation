#!/usr/bin/env python3
# use only stdlib so script runs without extra packages
import sys
import urllib.request
import urllib.error
import json

BASE = 'http://localhost:8000'
TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzcxNTEyOTI4LCJpYXQiOjE3NzE1MDkzMjgsImp0aSI6ImMzMDM1ODkzMjdiNDQ1MDBhZWYzZDJkZGQ3YzQyYjcwIiwidXNlcl9pZCI6MSwidXNlcm5hbWUiOiJhZG1pbiJ9.edMtXR6K1qrMB9rHfRxtUu9jPXjZ4SSPILfNa9du3pE'

def http_get(path):
    req = urllib.request.Request(path, headers={'Authorization': f'Bearer {TOKEN}'})
    try:
        with urllib.request.urlopen(req) as r:
            return r.read().decode('utf-8'), r.getcode()
    except urllib.error.HTTPError as he:
        return he.read().decode('utf-8'), he.code

def http_post(path, data_dict):
    data = json.dumps(data_dict).encode('utf-8')
    req = urllib.request.Request(path, data=data, headers={'Authorization': f'Bearer {TOKEN}', 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as r:
            return r.read().decode('utf-8'), r.getcode()
    except urllib.error.HTTPError as he:
        return he.read().decode('utf-8'), he.code

print('Fetching contracts from /api/contracts/table/')
body, code = http_get(f'{BASE}/api/contracts/table/')
if code != 200:
    print('Failed to fetch contracts:', code, body)
    sys.exit(1)

data = json.loads(body)
# data may be list of rows or dict with key 'contracts' or similar
contracts = []
if isinstance(data, dict):
    # try common keys
    if 'contracts' in data and isinstance(data['contracts'], list):
        contracts = data['contracts']
    elif 'rows' in data and isinstance(data['rows'], list):
        contracts = [r.get('contract_number') or r.get('contract') or r.get('contract_no') for r in data['rows']]
    else:
        # maybe it's a single row
        contracts = []
elif isinstance(data, list):
    # list of dicts
    for r in data:
        if isinstance(r, dict):
            if 'contract_number' in r:
                contracts.append(r['contract_number'])
            elif 'contract' in r:
                contracts.append(r['contract'])

# normalize: if list contains dicts (full rows), extract contract_number
normalized = []
for c in contracts:
    if isinstance(c, dict):
        if 'contract_number' in c:
            normalized.append(c['contract_number'])
        elif 'contract' in c:
            normalized.append(c['contract'])
        else:
            # try first string-like value
            for v in c.values():
                if isinstance(v, str):
                    normalized.append(v)
                    break
    else:
        normalized.append(c)

contracts = [c for c in normalized if c]
print(f'Found {len(contracts)} contract(s)')

bl_success = 0
uv_success = 0
errors = []

for cn in contracts:
    # BL collateral
    bl_payload = {
        'contract_number': cn,
        'collateral_type': 'Land',
        'name_of_collateral_owner': 'Seed Owner',
        'surface_area': '100'
    }
    body1, code1 = http_post(f'{BASE}/api/bl-collateral/', bl_payload)
    if code1 == 200:
        bl_success += 1
    else:
        errors.append(('BL', cn, code1, body1))

    # UV collateral
    uv_payload = {
        'contract_number': cn,
        'wheeled_vehicle': True,
        'vehicle_type': 'Car',
        'vehicle_brand': 'SeedBrand'
    }
    body2, code2 = http_post(f'{BASE}/api/uv-collateral/', uv_payload)
    if code2 == 200:
        uv_success += 1
    else:
        errors.append(('UV', cn, code2, body2))

print('Done.')
print('BL inserts succeeded:', bl_success)
print('UV inserts succeeded:', uv_success)
if errors:
    print('\nErrors:')
    for e in errors[:50]:
        print(e)
    if len(errors) > 50:
        print('... (truncated)')

sys.exit(0)

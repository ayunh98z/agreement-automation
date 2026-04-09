# tmp_post_test_flat_rate.py
# POST a test contract payload to /api/contracts/ using requests.
# It will try to read a token from 'frontend_token.txt' or env var TEST_TOKEN.

import os
import json
import requests
API_BASE = os.environ.get('API_BASE')
if not API_BASE:
    raise RuntimeError("Environment variable API_BASE is required (e.g. 'http://127.0.0.1:8000').")
from datetime import datetime

BASE = os.path.dirname(os.path.abspath(__file__))
TOKEN_FILE = os.path.join(BASE, 'frontend_token.txt')

def load_token():
    if 'TEST_TOKEN' in os.environ and os.environ['TEST_TOKEN'].strip():
        return os.environ['TEST_TOKEN'].strip()
    if os.path.exists(TOKEN_FILE):
        try:
            return open(TOKEN_FILE).read().strip()
        except Exception:
            return None
    return None

if __name__ == '__main__':
    token = load_token()
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    payload = {
        'contract_number': f'TESTPOST_{datetime.utcnow().strftime("%Y%m%d%H%M%S")}',
        'contract_data': {
            'flat_rate': '2,09',
            'admin_rate': '2,09',
            'loan_amount': '1000000'
        },
        'debtor': {},
        'collateral_data': {},
        'bm_data': {},
        'branch_data': {},
        'header_fields': {},
        'created_by': 'tmp_test_script'
    }
    url = API_BASE + '/api/contracts/'
    print('Posting to', url)
    try:
        r = requests.post(url, headers=headers, data=json.dumps(payload), timeout=30)
        print('Status:', r.status_code)
        try:
            print(json.dumps(r.json(), indent=2, ensure_ascii=False))
        except Exception:
            print(r.text)
    except Exception as e:
        print('Request failed:', e)

import json
import urllib.request

URL_TOKEN = 'http://localhost:8000/api/token/'
URL_UV = 'http://localhost:8000/api/uv-agreement/'

creds = {'username':'admin', 'password':'admin123'}

def get_token():
    data = json.dumps(creds).encode('utf-8')
    req = urllib.request.Request(URL_TOKEN, data=data, headers={'Content-Type':'application/json'})
    with urllib.request.urlopen(req) as resp:
        return json.load(resp)

def post_uv(token):
    payload = {
        'contract_number': 'TEST-PY-001',
        'branch_id': 1,
        'bm_data': {},
        'branch_data': {},
        'contract_data': {'contract_number': 'TEST-PY-001'},
        'debtor': {'name_of_debtor': 'Test Debtor Py'},
        'collateral_data': {},
        'header_fields': {'agreement_date': '2026-02-10'},
    }
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(URL_UV, data=data, headers={'Content-Type':'application/json', 'Authorization': f"Bearer {token}"})
    with urllib.request.urlopen(req) as resp:
        return resp.status, json.load(resp)

if __name__ == '__main__':
    try:
        t = get_token()
        access = t.get('access')
        print('Got access token:', bool(access))
        status, body = post_uv(access)
        print('POST status:', status)
        print('Response:', json.dumps(body))
    except Exception as e:
        print('ERROR:', e)

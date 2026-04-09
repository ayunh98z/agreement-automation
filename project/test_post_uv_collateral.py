import json
import urllib.request
import os

API_BASE = os.environ.get('API_BASE')
if not API_BASE:
    raise RuntimeError("Environment variable API_BASE is required (e.g. 'http://127.0.0.1:8000').")

URL_TOKEN = API_BASE + '/api/token/'
URL_UV_COLL = API_BASE + '/api/uv-collateral/'

creds = {'username':'admin', 'password':'admin123'}

def get_token():
    data = json.dumps(creds).encode('utf-8')
    req = urllib.request.Request(URL_TOKEN, data=data, headers={'Content-Type':'application/json'})
    with urllib.request.urlopen(req) as resp:
        return json.load(resp)


def post_uv_collateral(token):
    payload = {
        'contract_number': 'TEST-UV-COLL-001',
        'collateral': {
            'vechile_types': 'Motor',
            'vechile_brand': 'Yamaha',
            'vechile_model': 'NMAX',
            'plat_number': 'B-1234-XYZ',
            'chasiss_number': 'CHASIS12345',
            'engine_number': 'ENG12345',
            'manufactured_year': '2020',
            'colour': 'Hitam',
            'bpkb_number': 'BPKB98765',
            'name_bpkb_owner': 'Pemilik Test'
        }
    }
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(URL_UV_COLL, data=data, headers={'Content-Type':'application/json', 'Authorization': f"Bearer {token}"})
    with urllib.request.urlopen(req) as resp:
        return resp.status, json.load(resp)


def create_contract(token, contract_number):
    url = API_BASE + '/api/contracts/'
    payload = {'contract_number': contract_number, 'name_of_debtor': 'Test Debtor Contract'}
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type':'application/json', 'Authorization': f"Bearer {token}"})
    with urllib.request.urlopen(req) as resp:
        return resp.status, json.load(resp)

if __name__ == '__main__':
    try:
        t = get_token()
        access = t.get('access')
        print('Got access token:', bool(access))
        try:
            # ensure contract exists
            create_contract(access, 'TEST-UV-COLL-001')
            status, body = post_uv_collateral(access)
            print('POST status:', status)
            print('Response:', json.dumps(body))
        except Exception as e:
            # If HTTPError, try to show response body
            try:
                import urllib.error
                if isinstance(e, urllib.error.HTTPError):
                    print('HTTPError code:', e.code)
                    print('Response body:', e.read().decode('utf-8'))
                else:
                    print('ERROR posting:', e)
            except Exception as ee:
                print('ERROR while handling exception:', ee)
    except Exception as e:
        print('ERROR:', e)

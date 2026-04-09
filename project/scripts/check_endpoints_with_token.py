import sys, urllib.request, json, os

if len(sys.argv) < 2:
    print('Usage: python check_endpoints_with_token.py <ACCESS_TOKEN>')
    sys.exit(2)

token = sys.argv[1].strip()
API_BASE = os.environ.get('API_BASE')
if not API_BASE:
    raise RuntimeError("Environment variable API_BASE is required (e.g. 'http://127.0.0.1:8000').")
base = API_BASE
endpoints = [
    ('Contracts (BL Agreement)', '/api/bl-agreement/contracts/'),
    ('BL Collateral', '/api/bl-collateral/'),
    ('UV Collateral', '/api/uv-collateral/'),
]

for name, path in endpoints:
    url = base + path
    req = urllib.request.Request(url)
    req.add_header('Authorization', f'Bearer {token}')
    req.add_header('Accept', 'application/json')
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = resp.read().decode('utf-8')
            code = resp.getcode()
            print(f"=== {name} ===")
            print('URL:', url)
            print('Status:', code)
            try:
                obj = json.loads(data)
                print(json.dumps(obj, indent=2, ensure_ascii=False))
            except Exception:
                print(data)
    except Exception as e:
        try:
            import urllib.error
            if isinstance(e, urllib.error.HTTPError):
                body = e.read().decode('utf-8', errors='ignore')
                print(f"=== {name} ===")
                print('URL:', url)
                print('HTTPERR', e.code)
                print(body)
            else:
                print('ERR', repr(e))
        except Exception:
            print('ERR', repr(e))

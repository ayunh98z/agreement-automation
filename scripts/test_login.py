import json, sys, os
from urllib.request import Request, urlopen
from urllib.error import HTTPError
API_BASE = os.environ.get('API_BASE')
if not API_BASE:
    raise RuntimeError("Environment variable API_BASE is required (e.g. 'http://127.0.0.1:8000').")
url = API_BASE + '/api/token/'
data = json.dumps({'username':'admin','password':'admin123'}).encode('utf-8')
req = Request(url, data=data, headers={'Content-Type':'application/json','Origin':'http://localhost:3000'})
try:
    resp = urlopen(req, timeout=10)
    print(resp.read().decode('utf-8'))
except HTTPError as e:
    print('HTTP', e.code)
    print(e.read().decode('utf-8'))
except Exception as e:
    print('ERR', e)
    sys.exit(1)

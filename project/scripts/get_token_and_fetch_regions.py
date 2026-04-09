import urllib.request, urllib.parse, json, os

API_BASE = os.environ.get('API_BASE')
if not API_BASE:
    raise RuntimeError("Environment variable API_BASE is required (e.g. 'http://127.0.0.1:8000').")

def read_credentials(path):
    try:
        with open(path,'r',encoding='utf-8') as f:
            txt=f.read()
        username='admin'; password=''
        for line in txt.splitlines():
            if line.strip().startswith('Username:'):
                username=line.split(':',1)[1].strip()
            if line.strip().startswith('Password:'):
                password=line.split(':',1)[1].strip()
        return username, password
    except Exception as e:
        return 'admin','admin'

base = API_BASE
credpath = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', 'admin_token.txt'))
user,pwd = read_credentials(credpath)
print('Using credentials:', user, ' / ', ('*'*len(pwd)))

# Obtain token
try:
    url = base + '/api/token/'
    data = json.dumps({'username': user, 'password': pwd}).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type':'application/json'})
    with urllib.request.urlopen(req, timeout=10) as resp:
        b = resp.read().decode('utf-8')
        tok = json.loads(b)
        print('Token response:', json.dumps(tok, indent=2))
        access = tok.get('access')
        if access:
            # call regions
            rreq = urllib.request.Request(base + '/api/regions/')
            rreq.add_header('Authorization', f'Bearer {access}')
            with urllib.request.urlopen(rreq, timeout=10) as r:
                data = r.read().decode('utf-8')
                print('Regions status', r.getcode())
                try:
                    print(json.dumps(json.loads(data), indent=2, ensure_ascii=False))
                except Exception:
                    print(data)
except Exception as e:
    # try using email field
    try:
        url = base + '/api/token/'
        data = json.dumps({'email': user, 'password': pwd}).encode('utf-8')
        req = urllib.request.Request(url, data=data, headers={'Content-Type':'application/json'})
        with urllib.request.urlopen(req, timeout=10) as resp:
            b = resp.read().decode('utf-8')
            tok = json.loads(b)
            print('Token response (email):', json.dumps(tok, indent=2))
    except Exception as ee:
        print('ERR', repr(e), repr(ee))

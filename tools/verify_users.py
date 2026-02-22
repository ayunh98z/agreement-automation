import re, requests, json, sys, os

# Cari token di project/frontend_token.txt
base = os.path.dirname(os.path.dirname(__file__))
tokpath = os.path.join(base, 'project', 'frontend_token.txt')
if not os.path.exists(tokpath):
    print('TOKEN_FILE_MISSING', tokpath)
    sys.exit(2)

with open(tokpath, 'r', encoding='utf-8') as f:
    txt = f.read()

m = re.search(r'([A-Za-z0-9_\-\.]{40,})', txt)
if not m:
    print('TOKEN_NOT_FOUND')
    sys.exit(2)

token = m.group(1)
headers = {'Authorization': f'Bearer {token}'}

url = 'http://127.0.0.1:8000/api/users/'
print('Using token from', tokpath)
print('Requesting', url)
try:
    r = requests.get(url, headers=headers, timeout=10)
    print('HTTP', r.status_code)
    try:
        j = r.json()
        out = json.dumps(j, indent=2)
        print(out[:8000])
    except Exception as e:
        print('JSON parse error:', e)
        print(r.text[:4000])
except Exception as e:
    print('Request error:', e)
    sys.exit(3)

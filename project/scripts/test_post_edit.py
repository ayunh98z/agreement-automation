import json, urllib.request, urllib.error, os
TOKEN = os.environ.get('API_TOKEN', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzcxODA2MDc3LCJpYXQiOjE3NzE4MDI0NzcsImp0aSI6ImU4NzZmMDdhMWE0MjRmODc4NzhmYzExOTQzMzRhODMxIiwidXNlcl9pZCI6MjksInVzZXJuYW1lIjoiYWRhZGkifQ._RiAiD0pT6WxDeLLw-oHsSNL3V5dO9pfqzgr6MFQuTs')
API_BASE = os.environ.get('API_BASE')
if not API_BASE:
    raise RuntimeError("Environment variable API_BASE is required (e.g. 'http://127.0.0.1:8000').")
url_post = API_BASE.rstrip('/') + '/api/bl-agreement/'
url_access = API_BASE.rstrip('/') + '/api/bl-agreement/CON002/access/'

def do_post():
    data = json.dumps({'contract_number':'CON002','edit_only':True}).encode('utf-8')
    req = urllib.request.Request(url_post, data=data, headers={'Authorization':f'Bearer {TOKEN}','Content-Type':'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            print('POST', r.status, r.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        try:
            print('POST', e.code, e.read().decode('utf-8'))
        except Exception:
            print('POST HTTPError', e.code)
    except Exception as e:
        print('POST error', e)

def do_get():
    req = urllib.request.Request(url_access, headers={'Authorization':f'Bearer {TOKEN}'})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            print('\nGET', r.status, r.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        try:
            print('\nGET', e.code, e.read().decode('utf-8'))
        except Exception:
            print('\nGET HTTPError', e.code)
    except Exception as e:
        print('\nGET error', e)

if __name__ == '__main__':
    do_post()
    do_get()

import urllib.request, json, sys

try:
    url = "http://localhost:8000/api/regions/"
    req = urllib.request.Request(url)
    # try to read admin token file for Authorization header if present
    try:
        import os
        tokpath = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', 'admin_token.txt'))
        with open(tokpath,'r', encoding='utf-8') as f:
            text = f.read()
            # crude extraction of token: find 'Access Token:' line
            for line in text.splitlines():
                if 'Access Token:' in line:
                    token = line.split('Access Token:')[-1].strip()
                    if not token:
                        # try next non-empty line
                        parts = [l.strip() for l in text.splitlines()]
                        try:
                            idx = parts.index(line.strip())
                            for nxt in parts[idx+1:]:
                                if nxt:
                                    token = nxt.strip(); break
                        except Exception:
                            pass
                    if token:
                        req.add_header('Authorization', f'Bearer {token}')
                        print('Using token (len):', len(token))
                        break
    except Exception:
        pass
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = resp.read().decode('utf-8')
        print('STATUS', resp.getcode())
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
            print('HTTPERR', e.code)
            print(body)
        else:
            print('ERR', repr(e))
    except Exception:
        print('ERR', repr(e))

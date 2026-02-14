import urllib.request
import sys
from urllib.error import HTTPError, URLError

url = 'http://127.0.0.1:8000/api/uv-agreement/download-docx/?contract_number=TEST123'
local = 'uv_test_TEST123.docx'
print('Requesting', url)
try:
    resp = urllib.request.urlopen(url, timeout=15)
    data = resp.read()
    with open(local, 'wb') as f:
        f.write(data)
    print('Saved', local, 'bytes=', len(data))
except HTTPError as e:
    print('HTTPError', e.code, e.reason)
    try:
        print(e.read().decode('utf-8'))
    except Exception:
        pass
    sys.exit(2)
except URLError as e:
    print('URLError', e)
    sys.exit(3)
except Exception as e:
    print('Error', e)
    sys.exit(4)

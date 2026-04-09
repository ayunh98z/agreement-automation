import urllib.request
import os
API_BASE = os.environ.get('API_BASE')
if not API_BASE:
    raise RuntimeError("Environment variable API_BASE is required (e.g. 'http://127.0.0.1:8000').")
url = API_BASE.rstrip('/') + '/api/bl-agreement/download-docx/?contract_number=CON005'
out = os.path.join(os.path.dirname(__file__), '..', 'tmp_docx', 'bl_agreement_CON005.docx')
out = os.path.abspath(out)

os.makedirs(os.path.dirname(out), exist_ok=True)

try:
    urllib.request.urlretrieve(url, out)
    print('DOWNLOAD_OK:' + out)
except Exception as e:
    print('DOWNLOAD_ERR:' + str(e))

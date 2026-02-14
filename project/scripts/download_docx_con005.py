import urllib.request
import os

url = 'http://localhost:8000/api/bl-agreement/download-docx/?contract_number=CON005'
out = os.path.join(os.path.dirname(__file__), '..', 'tmp_docx', 'bl_agreement_CON005.docx')
out = os.path.abspath(out)

os.makedirs(os.path.dirname(out), exist_ok=True)

try:
    urllib.request.urlretrieve(url, out)
    print('DOWNLOAD_OK:' + out)
except Exception as e:
    print('DOWNLOAD_ERR:' + str(e))

import os,sys,json
sys.path.insert(0, r'C:\laragon\www\lolc\operasional\project')
os.environ.setdefault('DJANGO_SETTINGS_MODULE','myproject.settings')
import django
django.setup()
from django.db import connection
cur = connection.cursor()
cur.execute("select COLUMN_NAME from INFORMATION_SCHEMA.COLUMNS where TABLE_SCHEMA = DATABASE() and TABLE_NAME='uv_agreement'")
cols = [r[0] for r in cur.fetchall()]
print('COLUMNS:')
print(json.dumps(cols, indent=2))
cur.execute('select * from uv_agreement order by id desc limit 20')
rows = cur.fetchall()
colnames = [d[0] for d in cur.description]
out = []
for r in rows:
    rowdict = dict(zip(colnames, r))
    contract = rowdict.get('contract_number')
    cur.execute('select user_id, role, edit_grants, edit_consumed, download_grants, download_consumed from agreement_access where contract_number=%s limit 1', (contract,))
    aa = cur.fetchone()
    if aa is None:
        aa_dict = None
    else:
        aa_dict = {'user_id': aa[0], 'role': aa[1], 'edit_grants': aa[2], 'edit_consumed': aa[3], 'download_grants': aa[4], 'download_consumed': aa[5]}
    out.append({'row': rowdict, 'agreement_access': aa_dict})
print(json.dumps(out, default=str, indent=2))

import os,sys,json
sys.path.insert(0, r'C:\laragon\www\lolc\operasional\project')
os.environ.setdefault('DJANGO_SETTINGS_MODULE','myproject.settings')
import django
django.setup()
from django.db import connection
CONTRACT = 'con000'
cur = connection.cursor()
# fetch agreement_access
cur.execute('select user_id, role, edit_grants, edit_consumed from agreement_access where contract_number=%s limit 1', (CONTRACT,))
aa = cur.fetchone()
if aa is None:
    print(json.dumps({'error':'no agreement_access for contract', 'contract':CONTRACT}))
    sys.exit(1)
uid, role, edit_grants, edit_consumed = aa
before = {'contract':CONTRACT, 'agreement_access':{'user_id':uid,'role':role,'edit_grants':edit_grants,'edit_consumed':edit_consumed}}
# show uv_agreement created_by_id before
cur.execute('select created_by, created_by_id, created_at, update_at from uv_agreement where contract_number=%s limit 1', (CONTRACT,))
uv = cur.fetchone()
if uv is None:
    print(json.dumps({'error':'no uv_agreement row for contract', 'contract':CONTRACT}))
    sys.exit(1)
created_by, created_by_id, created_at, update_at = uv
before['uv_agreement'] = {'created_by':created_by,'created_by_id':created_by_id,'created_at':str(created_at),'update_at':str(update_at)}
print('BEFORE:')
print(json.dumps(before, default=str, indent=2))
# perform updates
cur.execute('update uv_agreement set created_by_id=%s where contract_number=%s', (uid, CONTRACT))
rows_uv = cur.rowcount
cur.execute('update agreement_access set edit_consumed = edit_consumed + 1 where contract_number=%s and user_id=%s and edit_consumed < edit_grants', (CONTRACT, uid))
rows_aa = cur.rowcount
connection.commit()
# fetch after
cur.execute('select user_id, role, edit_grants, edit_consumed from agreement_access where contract_number=%s limit 1', (CONTRACT,))
aa2 = cur.fetchone()
cur.execute('select created_by, created_by_id, created_at, update_at from uv_agreement where contract_number=%s limit 1', (CONTRACT,))
uv2 = cur.fetchone()
after = {'contract':CONTRACT}
if aa2:
    after['agreement_access'] = {'user_id':aa2[0],'role':aa2[1],'edit_grants':aa2[2],'edit_consumed':aa2[3]}
if uv2:
    after['uv_agreement'] = {'created_by':uv2[0],'created_by_id':uv2[1],'created_at':str(uv2[2]),'update_at':str(uv2[3])}
print('\nAPPLIED: rows_uv=%s, rows_agreement_access=%s' % (rows_uv, rows_aa))
print('AFTER:')
print(json.dumps(after, default=str, indent=2))

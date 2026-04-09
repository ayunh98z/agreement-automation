import json
from django.db import connection
cur=connection.cursor()
cur.execute("SHOW COLUMNS FROM uv_agreement")
cols_meta=cur.fetchall()
cols=[r[0] for r in cols_meta]
sel_cols = ['contract_number','created_at','created_by','name_of_debtor']
available = [c for c in sel_cols if c in cols]
sql = f"SELECT {', '.join(available)} FROM uv_agreement ORDER BY created_at DESC LIMIT 20"
try:
    cur.execute(sql)
    rows=cur.fetchall()
    out=[dict(zip(available,r)) for r in rows]
    print(json.dumps(out, default=str, ensure_ascii=False))
except Exception as e:
    print(json.dumps({'error':str(e)}))

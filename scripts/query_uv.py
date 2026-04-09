import json,sys
from django.db import connection
cn='S6-02-006YYH'
cur=connection.cursor()
cur.execute("SELECT * FROM uv_agreement WHERE LOWER(contract_number)=LOWER(%s) LIMIT 1", [cn])
row=cur.fetchone()
cols=[col[0] for col in cur.description] if cur.description else []
print(json.dumps(dict(zip(cols,row)) if row else {}, default=str, ensure_ascii=False))

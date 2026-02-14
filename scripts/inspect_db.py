import sqlite3
from pathlib import Path

DB = Path(__file__).resolve().parent.parent.joinpath('project', 'db.sqlite3')
print(f"Using DB: {DB}\n")
if not DB.exists():
    print("Database file not found:", DB)
    raise SystemExit(1)

conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

# List tables
cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;")
tables = [r[0] for r in cur.fetchall()]
print(f"Tables ({len(tables)}):")
for t in tables:
    print(' -', t)
print('\n')

for t in tables:
    print('== Table:', t)
    # schema
    cur.execute(f"PRAGMA table_info('{t}')")
    cols = cur.fetchall()
    if cols:
        print('Schema:')
        for c in cols:
            print(f"  {c['cid']}: {c['name']} {c['type']} NOTNULL={c['notnull']} PK={c['pk']}")
    else:
        print('  (no schema info)')

    # row count
    cur.execute(f"SELECT COUNT(*) as cnt FROM '{t}'")
    cnt = cur.fetchone()['cnt']
    print(f"Rows: {cnt}")

    # sample rows
    limit = 20
    cur.execute(f"SELECT * FROM '{t}' LIMIT {limit}")
    rows = cur.fetchall()
    if rows:
        headers = rows[0].keys()
        print('Columns:', ', '.join(headers))
        for i, r in enumerate(rows, 1):
            vals = [str(r[h]) for h in headers]
            print(f" {i}. " + ' | '.join(vals))
        if cnt > limit:
            print(f" ... ({cnt-limit} more rows)")
    else:
        print(' (no rows)')
    print('\n')

conn.close()
print('Done')

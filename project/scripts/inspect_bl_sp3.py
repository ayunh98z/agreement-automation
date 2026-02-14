import sqlite3, json, sys, os

db = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'db.sqlite3'))
if not os.path.exists(db):
    print('DB file not found:', os.path.abspath(db))
    sys.exit(2)

conn = sqlite3.connect(db)
cur = conn.cursor()
cur.execute("PRAGMA table_info('bl_sp3')")
schema = cur.fetchall()
print('SCHEMA:', json.dumps(schema))
try:
    cur.execute("SELECT COUNT(*) FROM bl_sp3")
    print('COUNT:', cur.fetchone())
    cur.execute("SELECT contract_number, created_at, created_by FROM bl_sp3 LIMIT 5")
    print('ROWS:', json.dumps(cur.fetchall()))
except Exception as e:
    print('QUERY ERROR:', str(e))
conn.close()

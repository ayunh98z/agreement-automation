import sqlite3
import pymysql
from pathlib import Path

SQLITE_DB = Path(__file__).resolve().parent.parent.joinpath('project', 'db.sqlite3')
print('SQLite DB:', SQLITE_DB)
if not SQLITE_DB.exists():
    raise SystemExit('SQLite DB not found')

# MySQL connection params
MYSQL = dict(host='127.0.0.1', user='root', password='', db='lolc_operasional', port=3306, charset='utf8mb4')

# Read users from sqlite
sconn = sqlite3.connect(str(SQLITE_DB))
sconn.row_factory = sqlite3.Row
scur = sconn.cursor()
scur.execute('SELECT id, password, last_login, is_superuser, username, last_name, email, is_staff, is_active, date_joined, first_name FROM auth_user')
rows = scur.fetchall()
print('Users in sqlite:', len(rows))

# Connect to MySQL
mconn = pymysql.connect(**MYSQL)
mc = mconn.cursor()

inserted = 0
updated = 0
for r in rows:
    username = r['username']
    # check exists
    mc.execute('SELECT id FROM auth_user WHERE username=%s', (username,))
    exists = mc.fetchone()
    params = (
        r['password'],
        r['last_login'],
        int(r['is_superuser']),
        username,
        r['last_name'],
        r['email'],
        int(r['is_staff']),
        int(r['is_active']),
        r['date_joined'],
        r['first_name'],
    )
    if exists:
        mc.execute(
            '''UPDATE auth_user SET password=%s, last_login=%s, is_superuser=%s, last_name=%s, email=%s, is_staff=%s, is_active=%s, date_joined=%s, first_name=%s WHERE username=%s''',
            (r['password'], r['last_login'], int(r['is_superuser']), r['last_name'], r['email'], int(r['is_staff']), int(r['is_active']), r['date_joined'], r['first_name'], username)
        )
        updated += 1
    else:
        mc.execute(
            '''INSERT INTO auth_user (password, last_login, is_superuser, username, last_name, email, is_staff, is_active, date_joined, first_name)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)''', params
        )
        inserted += 1

mconn.commit()
mc.close()
mconn.close()
scur.close()
sconn.close()
print('Inserted:', inserted, 'Updated:', updated)

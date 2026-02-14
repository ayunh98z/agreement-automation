import pymysql

conn = pymysql.connect(host='127.0.0.1', user='root', password='', db='lolc_operasional', port=3306)
cur = conn.cursor()
cur.execute("SHOW TABLES")
tables = [row[0] for row in cur.fetchall()]
print('Tables:', tables)
if 'auth_user' in tables:
    cur.execute('SELECT id, username, email, is_superuser, is_staff FROM auth_user')
    rows = cur.fetchall()
    print('\nauth_user rows:')
    for r in rows:
        print(r)
else:
    print('\nNo auth_user table present in this DB')
cur.close()
conn.close()

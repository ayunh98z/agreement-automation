#!/usr/bin/env python3
import os
import pymysql

host = os.environ.get('MYSQL_HOST', '127.0.0.1')
port = int(os.environ.get('MYSQL_PORT', '3306'))
user = os.environ.get('MYSQL_USER', 'root')
password = os.environ.get('MYSQL_PASSWORD', '')
db = os.environ.get('MYSQL_NAME', 'lolc_operasional')

print('Connecting to MySQL', host, port, 'db=', db, 'user=', user)
conn = pymysql.connect(host=host, port=port, user=user, password=password, database=db, charset='utf8mb4')
try:
    with conn.cursor() as cur:
        print('\n-- @@sql_mode --')
        cur.execute("SELECT @@sql_mode;")
        print(cur.fetchone())

        print('\n-- SHOW CREATE TABLE bl_agreement --')
        try:
            cur.execute('SHOW CREATE TABLE bl_agreement;')
            row = cur.fetchone()
            if row:
                # row[1] contains create statement
                print(row[1])
            else:
                print('No such table: bl_agreement')
        except Exception as e:
            print('Error running SHOW CREATE TABLE:', e)

        print('\n-- COUNT rows with id=0 and bl_agreement_id=0 --')
        for col in ('id','bl_agreement_id'):
            try:
                cur.execute(f"SELECT COUNT(*) FROM bl_agreement WHERE `{col}` = 0;")
                cnt = cur.fetchone()[0]
                print(f"rows where {col}=0: {cnt}")
                if cnt:
                    cur.execute(f"SELECT * FROM bl_agreement WHERE `{col}` = 0 LIMIT 5;")
                    rows = cur.fetchall()
                    for r in rows:
                        print(r)
            except Exception as e:
                print(f"Query for column {col} failed: {e}")
finally:
    conn.close()

print('\nDone')

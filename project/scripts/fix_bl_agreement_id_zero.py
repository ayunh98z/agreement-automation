#!/usr/bin/env python3
import os
import pymysql
import datetime

host = os.environ.get('MYSQL_HOST', '127.0.0.1')
port = int(os.environ.get('MYSQL_PORT', '3306'))
user = os.environ.get('MYSQL_USER', 'root')
password = os.environ.get('MYSQL_PASSWORD', '')
db = os.environ.get('MYSQL_NAME', 'lolc_operasional')

bak_dir = os.path.join(os.path.dirname(__file__), 'db_backups')
os.makedirs(bak_dir, exist_ok=True)
now = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
backup_file = os.path.join(bak_dir, f'bl_agreement_id_0_backup_{now}.sql')

print('Connecting to MySQL', host, port, 'db=', db, 'user=', user)
conn = pymysql.connect(host=host, port=port, user=user, password=password, database=db, charset='utf8mb4')
try:
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM bl_agreement WHERE bl_agreement_id = 0;")
        cnt = cur.fetchone()[0]
        print('Rows with bl_agreement_id = 0:', cnt)
        if cnt == 0:
            print('Nothing to do.')
        else:
            # fetch rows
            cur.execute('SELECT * FROM bl_agreement WHERE bl_agreement_id = 0;')
            rows = cur.fetchall()
            cols = [d[0] for d in cur.description]
            print('Backing up', len(rows), 'rows to', backup_file)
            with open(backup_file, 'w', encoding='utf-8') as f:
                for r in rows:
                    values = []
                    for v in r:
                        if v is None:
                            values.append('NULL')
                        elif isinstance(v, (bytes, bytearray)):
                            values.append("'" + conn.escape(v.decode('utf-8', errors='replace')) + "'")
                        elif isinstance(v, str):
                            values.append("'" + conn.escape(v) + "'")
                        else:
                            # numbers, dates, decimals
                            values.append(str(v))
                    col_list = ','.join([f'`{c}`' for c in cols])
                    val_list = ','.join(values)
                    f.write(f'INSERT INTO `bl_agreement` ({col_list}) VALUES ({val_list});\n')
            print('Backup written.')

            # Delete rows
            print('Deleting rows with bl_agreement_id = 0')
            cur.execute('DELETE FROM bl_agreement WHERE bl_agreement_id = 0;')
            deleted = cur.rowcount
            conn.commit()
            print('Deleted rows:', deleted)

            # Ensure AUTO_INCREMENT is set to MAX(id)+1
            cur.execute('SELECT MAX(bl_agreement_id) FROM bl_agreement;')
            max_id = cur.fetchone()[0] or 0
            next_ai = max_id + 1
            print('Current max id:', max_id, 'Setting AUTO_INCREMENT to', next_ai)
            cur.execute(f'ALTER TABLE bl_agreement AUTO_INCREMENT = {next_ai};')
            conn.commit()
            print('AUTO_INCREMENT updated.')
finally:
    conn.close()

print('Done')

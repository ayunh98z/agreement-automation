from django.db import connection
usernames = ['admin','csa','slik']
with connection.cursor() as cursor:
    for u in usernames:
        cursor.execute('SELECT id, username, role, full_name, email FROM auth_user WHERE username=%s', [u])
        row = cursor.fetchone()
        print(u, '=>', row)

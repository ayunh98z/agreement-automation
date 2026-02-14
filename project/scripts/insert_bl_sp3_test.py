import os, django, sys

# prepare Django
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')
import django
django.setup()
from django.db import connection

cur = connection.cursor()
try:
    sql = (
        "INSERT INTO bl_sp3 (contract_number, street_name, subdistrict, district, city, province, phone_number_of_lolc, created_by, created_at) "
        "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())"
    )
    params = (
        'CON123',
        'Jalan Test No.1',
        'SubTest',
        'DistTest',
        'CityTest',
        'ProvTest',
        '0000000000',
        'automated_test',
    )
    cur.execute(sql, params)
    connection.commit()
    print('INSERT OK')
except Exception as e:
    print('ERROR:', str(e))
finally:
    cur.close()

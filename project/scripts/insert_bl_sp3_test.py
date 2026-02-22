import os, django, sys

# prepare Django
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')
import django
django.setup()
from django.db import connection
from django.utils import timezone
import datetime

cur = connection.cursor()
try:
    # Use Django timezone utilities so inserted timestamps follow
    # the project's TIME_ZONE (Asia/Jakarta / WIB) and are formatted
    # in a way MySQL DATETIME accepts.
    # Store timestamps in UTC so DB remains consistent regardless of
    # application timezone. Format as naive UTC datetime string for MySQL DATETIME.
    now_utc = timezone.now().astimezone(datetime.timezone.utc)
    now_str = now_utc.strftime('%Y-%m-%d %H:%M:%S')

    sql = (
        "INSERT INTO bl_sp3 (contract_number, street_name, subdistrict, district, city, province, phone_number_of_lolc, created_by, created_at) "
        "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)"
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
        now_str,
    )
    cur.execute(sql, params)
    connection.commit()
    print('INSERT OK')
except Exception as e:
    print('ERROR:', str(e))
finally:
    cur.close()

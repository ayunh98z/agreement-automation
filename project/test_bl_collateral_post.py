import os, json
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')
import django
django.setup()
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from django.db import connection
User = get_user_model()
user, created = User.objects.get_or_create(username='admin', defaults={'email':'admin@example.com'})
if created:
    user.set_password('admin123'); user.is_staff=True; user.is_superuser=True; user.save()

c = APIClient(); c.force_authenticate(user=user)
cn = 'TEST-COLL-001'
payload = {
    'contract_number': cn,
    'contract_data': {'name_of_debtor':'John'},
    'collateral_data': {'collateral_type':'BPKB', 'number_of_certificate':'123'},
    'header_fields': {'place_of_agreement':'Jakarta'},
}
resp = c.post('/api/bl-agreement/', payload, format='json')
print('POST STATUS', resp.status_code, resp.data)
# fetch row
resp2 = c.get('/api/bl-agreement/', {'contract_number': cn})
print('GET STATUS', resp2.status_code)
print('GET DATA:', json.dumps(resp2.data, indent=2, ensure_ascii=False))
# show columns for row directly from DB
with connection.cursor() as cursor:
    cursor.execute('SELECT collateral_type FROM bl_agreement WHERE contract_number=%s LIMIT 1', [cn])
    row = cursor.fetchone()
    print('DB collateral_type:', row)

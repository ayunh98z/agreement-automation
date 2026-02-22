import os
import sys
import pathlib
import django
import json

# Ensure project package is on sys.path (workspace root /project contains myproject/)
BASE_DIR = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BASE_DIR))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')
django.setup()

from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory, force_authenticate
from myproject.views import ContractCreateView

User = get_user_model()
# Create or get a test admin user
user, created = User.objects.get_or_create(username='test_admin_for_script')
if created:
    user.is_staff = True
    user.is_superuser = True
    user.set_password('testpass')
    user.save()

factory = APIRequestFactory()
# Payload with empty fields we expect to be replaced by placeholder
payload = {'contract_number': 'TEST-PLACEHOLDER-001', 'virtual_account_number': '', 'topup_contract': ''}
req = factory.post('/api/contracts/', payload, format='json')
force_authenticate(req, user=user)

view = ContractCreateView.as_view()
resp = view(req)

print('Status:', getattr(resp, 'status_code', 'unknown'))
try:
    print('Response data:', json.dumps(resp.data, default=str))
except Exception:
    print('Response repr:', repr(resp))

# If successful, also fetch the inserted row to confirm values (optional)
from django.db import connection
with connection.cursor() as cursor:
    cursor.execute("SELECT virtual_account_number, topup_contract FROM contract WHERE LOWER(contract_number)=LOWER(%s) LIMIT 1", ['TEST-PLACEHOLDER-001'])
    row = cursor.fetchone()
    print('Row from DB:', row)

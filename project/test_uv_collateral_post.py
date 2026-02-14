import os
import json
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')
import django
django.setup()
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

User = get_user_model()
try:
    user = User.objects.get(username='admin')
except User.DoesNotExist:
    user = User.objects.create_superuser('admin', 'admin@example.com', 'admin123')

c = APIClient()
c.force_authenticate(user=user)
payload = {
    'contract_number': 'TEST-COLL-001',
    'vechile_types': 'Motorcycle',
    'vehicle_types': 'Motorcycle',
    'collateral_type': 'Motorcycle',
    'vechile_brand': 'Yamaha',
    'vechile_model': 'NMax',
    'plat_number': 'B1234XYZ',
}
# Ensure contract exists first to satisfy foreign key on uv_collateral
resp_contract = c.post('/api/contracts/', json.dumps({'contract_number': 'TEST-COLL-001'}), content_type='application/json')
print('CONTRACT STATUS:', resp_contract.status_code)
try:
    print('CONTRACT JSON:', resp_contract.json())
except Exception:
    print('CONTRACT CONTENT:', resp_contract.content.decode(errors='replace'))

resp = c.post('/api/uv-collateral/', json.dumps(payload), content_type='application/json')
print('STATUS:', resp.status_code)
try:
    print('JSON:', resp.json())
except Exception:
    print('CONTENT:', resp.content.decode(errors='replace'))

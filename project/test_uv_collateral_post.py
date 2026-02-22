import os
import json
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')
import django
django.setup()
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from django.db import connection

User = get_user_model()
try:
    user = User.objects.get(username='admin')
except User.DoesNotExist:
    user = User.objects.create_superuser('admin', 'admin@example.com', 'admin123')

c = APIClient()
c.force_authenticate(user=user)
payload = {
    'contract_number': 'TEST-COLL-001',
    'collateral': {
        'vechile_types': 'Motorcycle',
        'vehicle_types': 'Motorcycle',
        'collateral_type': 'Motorcycle',
        'vechile_brand': 'Yamaha',
        'vechile_model': 'NMax',
        'plat_number': 'B1234XYZ',
        'bpkb_number': 'ab12345',
        'sp3_number': 'sp3-001',
        'vehicle_type': 'motorcycle',
        'vehicle_brand': 'yamaha',
        'vehicle_colour': 'hitam',
        'name_bpkb_owner': 'joni suparman'
    }
}
# Ensure contract exists first to satisfy foreign key on uv_collateral
resp_contract = c.post('/api/contracts/', json.dumps({'contract_number': 'TEST-COLL-001'}), content_type='application/json')
print('CONTRACT STATUS:', resp_contract.status_code)
try:
    print('CONTRACT JSON:', resp_contract.json())
except Exception:
    print('CONTRACT CONTENT:', resp_contract.content.decode(errors='replace'))

# Remove any existing uv_collateral for this contract to allow INSERT (test only)
with connection.cursor() as cursor:
    try:
        cursor.execute("DELETE FROM uv_collateral WHERE LOWER(contract_number)=LOWER(%s)", ['TEST-COLL-001'])
    except Exception:
        pass

resp = c.post('/api/uv-collateral/', json.dumps(payload), content_type='application/json')
print('STATUS:', resp.status_code)
try:
    print('JSON:', resp.json())
except Exception:
    print('CONTENT:', resp.content.decode(errors='replace'))

# Verify saved row from DB (bpkb_number if present)
with connection.cursor() as cursor:
    try:
        cursor.execute("SELECT bpkb_number, vehicle_type, vehicle_brand, vehicle_colour, name_bpkb_owner FROM uv_collateral WHERE LOWER(contract_number)=LOWER(%s) LIMIT 1", ['TEST-COLL-001'])
        row = cursor.fetchone()
        print('DB ROW (bpkb_number, vehicle_type, vehicle_brand, vehicle_colour, name_bpkb_owner):', row)
    except Exception as e:
        print('DB verify failed or column missing:', str(e))

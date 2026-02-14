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
    # create a simple admin user for test
    user = User.objects.create_superuser('admin', 'admin@example.com', 'admin123')

c = APIClient()
c.force_authenticate(user=user)
payload = {"contract_number": "TEST-DEFAULTS-001"}
resp = c.post('/api/contracts/', json.dumps(payload), content_type='application/json')
print('STATUS:', resp.status_code)
try:
    print('JSON:', resp.json())
except Exception:
    print('CONTENT:', resp.content.decode(errors='replace'))

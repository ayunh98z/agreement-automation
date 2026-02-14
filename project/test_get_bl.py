import os, json
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')
import django
django.setup()
from django.test import Client
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
User = get_user_model()

# ensure admin exists
user, created = User.objects.get_or_create(username='admin', defaults={'email':'admin@example.com'})
if created:
    try:
        user.set_password('admin123')
        user.is_superuser = True
        user.is_staff = True
        user.save()
    except Exception:
        pass

c = APIClient()
c.force_authenticate(user=user)
cn = 'TEST-DEFAULTS-001'
resp = c.get('/api/bl-agreement/', {'contract_number': cn})
print('STATUS', resp.status_code)
try:
    print(json.dumps(resp.data, indent=2, ensure_ascii=False))
except Exception:
    print('RAW:', resp.content)

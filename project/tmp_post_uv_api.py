import os,sys,json
sys.path.insert(0, r'C:\laragon\www\lolc\operasional\project')
os.environ.setdefault('DJANGO_SETTINGS_MODULE','myproject.settings')
import django
django.setup()
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
User = get_user_model()
user = User.objects.get(pk=29)
client = APIClient()
client.force_authenticate(user=user)
payload = {'contract_number':'TESTCREATE1'}
resp = client.post('/api/uv-agreement/', payload, format='json')
print('POST status', resp.status_code, resp.data)
resp2 = client.get('/api/uv-agreement/', {'contract_number':'TESTCREATE1'})
print('GET status', resp2.status_code, resp2.data)

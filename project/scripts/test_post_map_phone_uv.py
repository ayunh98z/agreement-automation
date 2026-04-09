#!/usr/bin/env python3
import os
import sys
import django

# Adjust path and settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

django.setup()

from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory, force_authenticate
from myproject.uv_agreement.views import UVAgreementView
from django.db import connection

User = get_user_model()

# Create or get a test user and ensure it appears as Admin to the view
user, created = User.objects.get_or_create(username='test_admin_for_script_uv')
try:
    user.is_active = True
    user.is_staff = True
    if hasattr(user, 'role'):
        setattr(user, 'role', 'Admin')
    else:
        setattr(user, 'role', 'Admin')
    user.save()
except Exception:
    try:
        user.save()
    except Exception:
        pass

factory = APIRequestFactory()

payload = {
    'contract_number': 'TEST-MAP-PHONE-UV-001',
    'branch_id': 99998,
    'branch_data': {
        'phone_number_branch': '089876543210'
    }
}

req = factory.post('/api/uv-agreement/', payload, format='json')
force_authenticate(req, user=user)

view = UVAgreementView.as_view()
resp = view(req)

print('Response status:', getattr(resp, 'status_code', None))
print('Response data:', getattr(resp, 'data', None))

# Query DB to see inserted phone_number_of_bm
with connection.cursor() as cursor:
    try:
        cursor.execute("SELECT phone_number_of_bm FROM uv_agreement WHERE contract_number=%s LIMIT 1", [payload['contract_number']])
        row = cursor.fetchone()
        print('DB row phone_number_of_bm:', row[0] if row else None)
    except Exception as e:
        print('DB check failed:', e)

# Note: cleanup is manual

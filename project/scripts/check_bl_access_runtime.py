import os
import sys
import json

# Ensure current project directory is on path
cwd = os.getcwd()
if cwd not in sys.path:
    sys.path.insert(0, cwd)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')
try:
    import django
    django.setup()
except Exception as e:
    print('DJANGO setup failed:', e)
    raise

from django.db import connection
from django.conf import settings
from myproject import models

cn = 'CON003'
out = {}

# Print DB config
out['DATABASES'] = getattr(settings, 'DATABASES', {})

with connection.cursor() as c:
    c.execute("SELECT contract_number, created_by, created_by_id FROM bl_agreement WHERE LOWER(contract_number)=LOWER(%s) LIMIT 1", [cn])
    row = c.fetchone()
    out['bl_agreement_row'] = row

# ORM queries
try:
    aa_list = list(models.AgreementAccess.objects.filter(contract_number__iexact=cn).values())
except Exception as e:
    aa_list = f'ERROR: {e}'

try:
    aa_user21 = models.AgreementAccess.objects.filter(contract_number__iexact=cn, user_id=21).values().first()
except Exception as e:
    aa_user21 = f'ERROR: {e}'

out['agreement_access_all'] = aa_list
out['agreement_access_user_21'] = aa_user21

print(json.dumps(out, default=str, ensure_ascii=False, indent=2))

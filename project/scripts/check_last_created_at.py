import os, sys

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
import pytz

with connection.cursor() as cur:
    cur.execute('SELECT id, created_at FROM bl_sp3 ORDER BY id DESC LIMIT 5')
    rows = cur.fetchall()

print('Last inserted rows (DB stored value, interpreted as):')
for r in rows:
    rid, created_at = r
    # created_at may be naive or timezone-aware depending on driver; treat as naive UTC
    if isinstance(created_at, datetime.datetime):
        if created_at.tzinfo is None:
            created_utc = created_at.replace(tzinfo=datetime.timezone.utc)
        else:
            created_utc = created_at.astimezone(datetime.timezone.utc)
    else:
        # fallback: parse string
        try:
            created_utc = datetime.datetime.fromisoformat(created_at).replace(tzinfo=datetime.timezone.utc)
        except Exception:
            created_utc = None

    if created_utc:
        wib = created_utc.astimezone(pytz.timezone('Asia/Jakarta'))
        print(f'- id={rid} UTC={created_utc.isoformat()} WIB={wib.isoformat()}')
    else:
        print(f'- id={rid} created_at={created_at} (unparsed)')

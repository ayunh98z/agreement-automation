import os
import sys
import django

# Ensure project root is on PYTHONPATH so 'myproject' package can be imported
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')
django.setup()

from myproject.master_data.models import Region, Area, Branch

def as_list(qs):
    return list(qs.values())

print('Regions:', as_list(Region.objects.all()))
print('Areas:', as_list(Area.objects.all()))
print('Branches:', as_list(Branch.objects.all()))

import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE','myproject.settings')
import django
django.setup()
from django.apps import apps
print('Installed apps:', apps.app_configs.keys())
try:
    cfg = apps.get_app_config('myproject')
    print('models in myproject:', [m.__name__ for m in cfg.get_models()])
except Exception as e:
    print('Error getting myproject app config:', e)

try:
    print('get_model("myproject.CustomUser") ->', apps.get_model('myproject','CustomUser'))
except Exception as e:
    print('Error get_model CustomUser:', e)

try:
    print('get_model("myproject.customuser") ->', apps.get_model('myproject','customuser'))
except Exception as e:
    print('Error get_model customuser:', e)

import os,sys
sys.path.insert(0, r'C:\laragon\www\lolc\operasional\project')
os.environ.setdefault('DJANGO_SETTINGS_MODULE','myproject.settings')
import django
django.setup()
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
User = get_user_model()
try:
    user = User.objects.get(pk=29)
except User.DoesNotExist:
    print('USER_NOT_FOUND')
    sys.exit(1)
refresh = RefreshToken.for_user(user)
print('ACCESS_TOKEN:'+str(refresh.access_token))
print('REFRESH_TOKEN:'+str(refresh))

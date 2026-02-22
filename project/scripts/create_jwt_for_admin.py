from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
User = get_user_model()
try:
    u = User.objects.filter(username='admin').first()
    if not u:
        print('NOUSER')
    else:
        r = RefreshToken.for_user(u)
        print('ACCESS:'+str(r.access_token))
        print('REFRESH:'+str(r))
except Exception as e:
    print('ERR', e)

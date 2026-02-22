import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE','myproject.settings')
import django
django.setup()
from django.contrib.auth import get_user_model
User = get_user_model()
count = 0
for u in User.objects.all():
    try:
        u.set_password('Password1!')
        u.save()
        print('UPDATED', u.username)
        count += 1
    except Exception as e:
        print('ERROR', u.username, e)
print('DONE. Total updated:', count)

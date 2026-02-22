from django.contrib.auth import get_user_model
User = get_user_model()
u = User.objects.filter(username='admin').first()
if u:
    u.set_password('Password123!')
    u.save()
    print('PASSWORD SET for', u.username)
else:
    print('ADMIN NOT FOUND')

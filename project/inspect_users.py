from django.contrib.auth import get_user_model
User = get_user_model()
for uname in ['admin','csa','slik']:
    u = User.objects.filter(username=uname).first()
    if not u:
        print(uname,'NOT FOUND')
        continue
    print('---',uname,'id',u.id)
    # Print attributes including role, role_name, and all __dict__ keys
    print('role attr:', getattr(u,'role',None))
    print('role_name attr:', getattr(u,'role_name',None))
    try:
        print('raw dict keys:', {k:v for k,v in u.__dict__.items() if k in ('username','role','role_name','full_name','email','is_staff','is_active','branch_id','area_id','region_id')})
    except Exception as e:
        print('err',e)

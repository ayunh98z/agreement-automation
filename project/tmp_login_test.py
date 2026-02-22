import requests, json
BASE='http://127.0.0.1:8000'
creds=[('admin','Password123!'),('csa','Password123!'),('slik','Password123!')]
for u,p in creds:
    try:
        r=requests.post(BASE+'/login/', json={'username':u,'password':p}, timeout=5)
        print('\nUSER',u,'STATUS',r.status_code)
        try:
            data=r.json()
            print(json.dumps(data, indent=2))
        except Exception as e:
            print('RESPONSE_TEXT:', r.text)
            continue
        if r.status_code==200:
            tok=data.get('access')
            if not tok:
                print('No access token returned')
                continue
            w=requests.get(BASE+'/api/whoami/', headers={'Authorization':f'Bearer {tok}'}, timeout=5)
            print('WHOAMI', w.status_code)
            try:
                who=w.json()
                print(json.dumps(who, indent=2))
                role=(who.get('role') or who.get('role_name') or '')
                rl=role.lower()
                show = ('admin' in rl) or (rl=='bod')
                print('ShowUserManagement:', show)
            except Exception as e:
                print('WHOAMI_RESPONSE_TEXT:', w.text)
    except Exception as e:
        print('ERR',u,e)

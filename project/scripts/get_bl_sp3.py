import requests
r = requests.get('http://127.0.0.1:8000/api/bl-sp3/')
print('STATUS', r.status_code)
print(r.text)

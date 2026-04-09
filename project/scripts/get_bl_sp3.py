import requests, os
API_BASE = os.environ.get('API_BASE')
if not API_BASE:
	raise RuntimeError("Environment variable API_BASE is required (e.g. 'http://127.0.0.1:8000').")
r = requests.get(API_BASE.rstrip('/') + '/api/bl-sp3/')
print('STATUS', r.status_code)
print(r.text)

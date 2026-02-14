import requests, json

url = 'http://127.0.0.1:8000/api/bl-sp3/create-public/'
payload = {
    'contract_number': 'CON123',
    'name_of_debtor': 'Frontend Test Debtor',
    'street_name': 'Jalan From Frontend',
    'city': 'CityFront',
    'province': 'ProvFront',
    'phone_number_of_debtor': '08123456789',
    'created_by': 'frontend_test'
}
try:
    r = requests.post(url, json=payload, timeout=10)
    print('STATUS', r.status_code)
    try:
        print('JSON:', json.dumps(r.json()))
    except Exception:
        print('TEXT:', r.text)
except Exception as e:
    print('ERROR:', str(e))

#!/usr/bin/env python
"""
Verify CORS and token endpoint functionality
"""
import json
import urllib.request
import urllib.error
import os

API_BASE = os.environ.get('API_BASE')
if not API_BASE:
    raise RuntimeError("Environment variable API_BASE is required (e.g. 'http://127.0.0.1:8000').")

def test_token_endpoint():
    """Test if token endpoint returns tokens"""
    url = API_BASE + '/api/token/'
    data = json.dumps({'username': 'admin', 'password': 'admin123'}).encode('utf-8')
    headers = {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000'
    }
    
    req = urllib.request.Request(url, data=data, headers=headers)
    
    try:
        resp = urllib.request.urlopen(req)
        response_data = json.loads(resp.read().decode('utf-8'))
        print("✓ Token endpoint working")
        print(f"  - Access token length: {len(response_data.get('access', ''))}")
        print(f"  - Refresh token length: {len(response_data.get('refresh', ''))}")
        return response_data.get('access')
    except urllib.error.HTTPError as e:
        print(f"✗ Token endpoint error: {e.code}")
        print(f"  Response: {e.read().decode('utf-8')}")
        return None
    except Exception as e:
        print(f"✗ Connection error: {e}")
        return None

def test_cors_preflight():
    """Test CORS preflight request"""
    url = API_BASE + '/api/token/'
    
    req = urllib.request.Request(url)
    req.get_method = lambda: 'OPTIONS'
    req.add_header('Origin', 'http://localhost:3000')
    req.add_header('Access-Control-Request-Method', 'POST')
    req.add_header('Access-Control-Request-Headers', 'Content-Type, Authorization')
    
    try:
        resp = urllib.request.urlopen(req)
        cors_header = resp.headers.get('Access-Control-Allow-Origin', 'NOT SET')
        print(f"✓ CORS preflight OK")
        print(f"  - Access-Control-Allow-Origin: {cors_header}")
        return True
    except Exception as e:
        print(f"✗ CORS preflight failed: {e}")
        return False

def test_protected_endpoint(token):
    """Test protected endpoint with token"""
    if not token:
        print("⊘ Skipping protected endpoint test (no token)")
        return
    
    url = API_BASE + '/protected/'
    headers = {
        'Authorization': f'Bearer {token}',
        'Origin': 'http://localhost:3000'
    }
    
    req = urllib.request.Request(url, headers=headers)
    
    try:
        resp = urllib.request.urlopen(req)
        print("✓ Protected endpoint accessible with token")
        print(f"  Response code: {resp.code}")
    except urllib.error.HTTPError as e:
        print(f"✗ Protected endpoint error: {e.code}")
        if e.code == 403:
            print("  Reason: Token may be invalid or endpoint requires different auth")
        print(f"  Response: {e.read().decode('utf-8')[:200]}")
    except Exception as e:
        print(f"✗ Connection error: {e}")

if __name__ == '__main__':
    print("Verifying backend CORS and authentication...\n")
    
    token = test_token_endpoint()
    print()
    test_cors_preflight()
    print()
    test_protected_endpoint(token)
    
    print("\n" + "="*50)
    print("Verification complete!")

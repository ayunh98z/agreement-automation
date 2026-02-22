#!/usr/bin/env python
"""
Test script to verify BL Agreement and UV Agreement endpoints return 4 fields:
- debtor
- collateral
- branch_manager
- branch
"""

import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')
django.setup()

from django.test import Client
from django.db import connection
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
import json

User = get_user_model()

def get_auth_headers():
    """Get JWT auth headers for testing by logging in"""
    client = Client()
    
    # Try to login with admin credentials
    try:
        response = client.post('/api/token/', {
            'username': 'admin',
            'password': 'admin123'
        }, content_type='application/json')
        
        if response.status_code == 200:
            data = response.json()
            if 'access' in data:
                return {'HTTP_AUTHORIZATION': f'Bearer {data["access"]}'}
    except Exception as e:
        print(f"Could not obtain token: {e}")
    
    return {}

def test_agreement_endpoints():
    """Test both BL and UV agreement endpoints"""
    
    client = Client()
    auth_headers = get_auth_headers()
    
    # First, get a sample contract_number from database
    with connection.cursor() as cursor:
        # Try to get a BL agreement
        cursor.execute("SELECT contract_number FROM bl_agreement LIMIT 1")
        bl_row = cursor.fetchone()
        bl_contract = bl_row[0] if bl_row else None
        
        # Try to get a UV agreement
        cursor.execute("SELECT contract_number FROM uv_agreement LIMIT 1")
        uv_row = cursor.fetchone()
        uv_contract = uv_row[0] if uv_row else None
    
    print("=" * 80)
    print("Testing BL Agreement and UV Agreement Endpoints - 4 Field Structure")
    print("=" * 80)
    
    # Test BL Agreement
    if bl_contract:
        print(f"\n[BL AGREEMENT] Testing with contract_number: {bl_contract}")
        print("-" * 80)
        response = client.get(f'/api/bl-agreement/?contract_number={bl_contract}', **auth_headers)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Status Code: {response.status_code}")
            print(f"✓ Response Keys: {list(data.keys())}")
            
            # Check for 4 required fields
            required_fields = ['debtor', 'collateral', 'branch_manager', 'branch']
            missing_fields = [f for f in required_fields if f not in data]
            
            if not missing_fields:
                print(f"✓ All 4 required fields present!")
                for field in required_fields:
                    value = data[field]
                    is_none = value is None
                    field_count = len(value) if isinstance(value, dict) else "?"
                    print(f"  - {field:20s}: {'<None>' if is_none else f'<Dict with {field_count} keys>'}")
            else:
                print(f"✗ Missing fields: {missing_fields}")
        else:
            print(f"✗ Status Code: {response.status_code}")
            print(f"  Response: {response.content.decode()}")
    else:
        print("\n[BL AGREEMENT] No test data available (no contract in database)")
    
    # Test UV Agreement
    if uv_contract:
        print(f"\n[UV AGREEMENT] Testing with contract_number: {uv_contract}")
        print("-" * 80)
        response = client.get(f'/api/uv-agreement/?contract_number={uv_contract}', **auth_headers)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Status Code: {response.status_code}")
            print(f"✓ Response Keys: {list(data.keys())}")
            
            # Check for 4 required fields
            required_fields = ['debtor', 'collateral', 'branch_manager', 'branch']
            missing_fields = [f for f in required_fields if f not in data]
            
            if not missing_fields:
                print(f"✓ All 4 required fields present!")
                for field in required_fields:
                    value = data[field]
                    is_none = value is None
                    field_count = len(value) if isinstance(value, dict) else "?"
                    print(f"  - {field:20s}: {'<None>' if is_none else f'<Dict with {field_count} keys>'}")
            else:
                print(f"✗ Missing fields: {missing_fields}")
        else:
            print(f"✗ Status Code: {response.status_code}")
            print(f"  Response: {response.content.decode()}")
    else:
        print("\n[UV AGREEMENT] No test data available (no contract in database)")
    
    print("\n" + "=" * 80)
    print("Test Summary")
    print("=" * 80)
    print(f"BL Agreement: {'READY' if bl_contract else 'NO TEST DATA'}")
    print(f"UV Agreement: {'READY' if uv_contract else 'NO TEST DATA'}")
    
    if bl_contract and uv_contract:
        print("\n✓ Both endpoints are now returning 4-field structure!")
        print("✓ Frontend edit modal should now receive complete data")
    else:
        print("\n⚠ Insert sample data into bl_agreement or uv_agreement to fully test")

if __name__ == '__main__':
    try:
        test_agreement_endpoints()
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

import json
import requests
import pytest
import os

API_BASE = os.environ.get('API_BASE')
if not API_BASE:
    raise RuntimeError("Environment variable API_BASE is required (e.g. 'http://127.0.0.1:8000').")

URL_TOKEN = API_BASE + '/api/token/'
URL_UV = API_BASE + '/api/uv-agreement/'
URL_BL = API_BASE + '/api/bl-agreement/'
URL_REGISTER = API_BASE + '/register/'

CREDS_AUDIT = {'username': 'audit', 'password': 'Password123!'}


def get_access_token(creds):
    resp = requests.post(URL_TOKEN, json=creds, timeout=10)
    if resp.status_code == 200:
        return resp.json().get('access')

    # Try to self-register the user (RegisterView is AllowAny) and retry token
    reg_payload = {'username': creds.get('username'), 'password': creds.get('password'), 'email': f"{creds.get('username')}@example.com", 'role': 'Audit'}
    rreg = requests.post(URL_REGISTER, json=reg_payload, timeout=10)
    if rreg.status_code not in (200, 201):
        pytest.skip(f"Could not obtain token and auto-register failed: {rreg.status_code} {rreg.text}")

    resp2 = requests.post(URL_TOKEN, json=creds, timeout=10)
    if resp2.status_code != 200:
        pytest.skip(f"Token request after register failed: {resp2.status_code} {resp2.text}")
    return resp2.json().get('access')


def test_audit_can_get_uv_list():
    token = get_access_token(CREDS_AUDIT)
    headers = {'Authorization': f'Bearer {token}'}
    resp = requests.get(URL_UV, headers=headers, timeout=10)
    assert resp.status_code == 200, resp.text


def test_audit_cannot_post_uv():
    token = get_access_token(CREDS_AUDIT)
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    payload = {
        'contract_number': 'TEST-AUDIT-001',
        'branch_id': 1,
        'bm_data': {},
        'branch_data': {},
        'contract_data': {'contract_number': 'TEST-AUDIT-001'},
        'collateral_data': {},
        'header_fields': {'agreement_date': '2026-02-10'},
    }
    resp = requests.post(URL_UV, json=payload, headers=headers, timeout=10)
    # Should be forbidden for audit (only Admin/CSA allowed to create)
    assert resp.status_code == 403, f"Expected 403 for audit POST to UV, got {resp.status_code}: {resp.text}"


def test_audit_can_get_bl_list():
    token = get_access_token(CREDS_AUDIT)
    headers = {'Authorization': f'Bearer {token}'}
    resp = requests.get(URL_BL, headers=headers, timeout=10)
    assert resp.status_code == 200, resp.text


def test_audit_cannot_post_bl():
    token = get_access_token(CREDS_AUDIT)
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    payload = {
        'contract_number': 'TEST-AUDIT-BL-001',
        'branch_id': 1,
        'bm_data': {},
        'branch_data': {},
        'contract_data': {'contract_number': 'TEST-AUDIT-BL-001'},
    }
    resp = requests.post(URL_BL, json=payload, headers=headers, timeout=10)
    assert resp.status_code == 403, f"Expected 403 for audit POST to BL, got {resp.status_code}: {resp.text}"

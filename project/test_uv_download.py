"""
This file was a simple script performing a live HTTP request during import,
which caused pytest collection to fail in CI/local runs. Convert it into a
skippable pytest test that only runs when an environment variable
`LIVE_TEST_URL` is provided.

Usage to run live test:
LIVE_TEST_URL=http://127.0.0.1:8000 pytest -q test_uv_download.py
"""
import os
import pytest
import requests

LIVE_TEST_URL = os.environ.get('LIVE_TEST_URL')


@pytest.mark.skipif(not LIVE_TEST_URL, reason="LIVE_TEST_URL not set")
def test_uv_download_live():
    url = f"{LIVE_TEST_URL.rstrip('/')}" + "/api/uv-agreement/download-docx/?contract_number=TEST123"
    resp = requests.get(url, timeout=15)
    assert resp.status_code == 200
    assert resp.content is not None and len(resp.content) > 0

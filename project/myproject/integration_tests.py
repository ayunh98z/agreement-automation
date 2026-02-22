"""
Integration tests for backend endpoints: BL agreement, BL SP3, UV agreement, UV SP3.
Tests use real database and JWT authentication.
"""

from django.test import TestCase, Client
from django.contrib.auth.models import User
from rest_framework_simplejwt.tokens import RefreshToken
import json


class BLAgreementIntegrationTests(TestCase):
    """Integration tests for BL Agreement endpoints."""
    
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        # Create a test user
        cls.user = User.objects.create_user(
            username='testuser_bl',
            email='testuser@example.com',
            password='testpass123'
        )
        # Create JWT token for user
        refresh = RefreshToken.for_user(cls.user)
        cls.token = str(refresh.access_token)
    
    def setUp(self):
        self.client = Client()
        self.headers = {'HTTP_AUTHORIZATION': f'Bearer {self.token}'}
    
    def test_01_create_bl_agreement(self):
        """Test creating a new BL agreement."""
        payload = {
            'contract_number': 'CN-INT-001',
            'agreement_date': '2026-02-16',
            'director': 'Director Test',
            'branch_id': 1
        }
        response = self.client.post(
            '/api/bl-agreement/',
            data=json.dumps(payload),
            content_type='application/json',
            **self.headers
        )
        self.assertEqual(response.status_code, 201, f"Expected 201, got {response.status_code}. Response: {response.content}")
        data = response.json()
        self.assertIn('id', data)
        self.assertEqual(data['contract_number'], 'CN-INT-001')
    
    def test_02_update_bl_agreement(self):
        """Test updating an existing BL agreement."""
        payload = {
            'contract_number': 'CN-INT-002',
            'agreement_date': '2026-02-16',
            'director': 'Director Update',
            'branch_id': 2
        }
        # Create first
        create_resp = self.client.post(
            '/api/bl-agreement/',
            data=json.dumps(payload),
            content_type='application/json',
            **self.headers
        )
        self.assertEqual(create_resp.status_code, 201)
        
        # Update
        update_payload = {
            'contract_number': 'CN-INT-002',
            'director': 'Director Updated'
        }
        update_resp = self.client.put(
            '/api/bl-agreement/',
            data=json.dumps(update_payload),
            content_type='application/json',
            **self.headers
        )
        self.assertEqual(update_resp.status_code, 200, f"Expected 200, got {update_resp.status_code}. Response: {update_resp.content}")
    
    def test_03_get_bl_agreements(self):
        """Test getting list of BL agreements."""
        response = self.client.get(
            '/api/bl-agreement/',
            **self.headers
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('agreements', data)
        self.assertIsInstance(data['agreements'], list)


class BLSP3IntegrationTests(TestCase):
    """Integration tests for BL SP3 endpoints."""
    
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.user = User.objects.create_user(
            username='testuser_blsp3',
            email='testuser_blsp3@example.com',
            password='testpass123'
        )
        refresh = RefreshToken.for_user(cls.user)
        cls.token = str(refresh.access_token)
    
    def setUp(self):
        self.client = Client()
        self.headers = {'HTTP_AUTHORIZATION': f'Bearer {self.token}'}
    
    def test_01_get_bl_sp3_list(self):
        """Test getting list of BL SP3 records."""
        response = self.client.get(
            '/api/bl-sp3/',
            **self.headers
        )
        self.assertEqual(response.status_code, 200, f"Expected 200, got {response.status_code}")
        data = response.json()
        self.assertIn('sp3s', data)
        self.assertIsInstance(data['sp3s'], list)


class UVSp3IntegrationTests(TestCase):
    """Integration tests for UV SP3 list endpoint."""
    
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.user = User.objects.create_user(
            username='testuser_uvsp3',
            email='testuser_uvsp3@example.com',
            password='testpass123'
        )
        refresh = RefreshToken.for_user(cls.user)
        cls.token = str(refresh.access_token)
    
    def setUp(self):
        self.client = Client()
        self.headers = {'HTTP_AUTHORIZATION': f'Bearer {self.token}'}
    
    def test_01_get_uv_sp3_list(self):
        """Test getting paginated list of UV SP3 records."""
        response = self.client.get(
            '/api/uv-sp3/',
            **self.headers
        )
        self.assertEqual(response.status_code, 200, f"Expected 200, got {response.status_code}")
        data = response.json()
        # Should have DRF pagination structure
        self.assertIn('count', data)
        self.assertIn('results', data)
        self.assertIsInstance(data['results'], list)
    
    def test_02_get_uv_sp3_with_filter(self):
        """Test getting UV SP3 list with query filters."""
        response = self.client.get(
            '/api/uv-sp3/?q=test',
            **self.headers
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('count', data)
        self.assertIn('results', data)
    
    def test_03_get_uv_sp3_with_ordering(self):
        """Test getting UV SP3 list with ordering."""
        response = self.client.get(
            '/api/uv-sp3/?order_by=uv_sp3_id',
            **self.headers
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('count', data)
        self.assertIn('results', data)


class AuthenticationTests(TestCase):
    """Test authentication and token endpoints."""
    
    def setUp(self):
        self.client = Client()
        User.objects.create_user(
            username='authtest',
            email='authtest@example.com',
            password='authpass123'
        )
    
    def test_01_obtain_token(self):
        """Test obtaining JWT token."""
        payload = {
            'username': 'authtest',
            'password': 'authpass123'
        }
        response = self.client.post(
            '/api/token/',
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200, f"Expected 200, got {response.status_code}. Response: {response.content}")
        data = response.json()
        self.assertIn('access', data)
        self.assertIn('refresh', data)
    
    def test_02_invalid_credentials(self):
        """Test token endpoint with invalid credentials."""
        payload = {
            'username': 'authtest',
            'password': 'wrongpass'
        }
        response = self.client.post(
            '/api/token/',
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 401)
    
    def test_03_protected_endpoint_without_token(self):
        """Test accessing protected endpoint without token."""
        response = self.client.get('/api/bl-agreement/')
        self.assertEqual(response.status_code, 401)

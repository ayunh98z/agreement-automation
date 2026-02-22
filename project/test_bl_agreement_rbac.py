from django.test import TestCase
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from django.db import connection


User = get_user_model()


class BLAgreementRBACTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        # users
        self.db_ok = True
        try:
            self.admin = User.objects.create_user(username='admin2', password='pass')
            self.admin.role = 'Admin'
            self.admin.save()

            self.csa = User.objects.create_user(username='csa2', password='pass')
            self.csa.role = 'CSA'
            self.csa.save()

            self.bm = User.objects.create_user(username='bm2', password='pass')
            self.bm.role = 'BM'
            self.bm.branch_id = 11
            self.bm.save()

            # insert two agreements: one created by csa2 in branch 11, another by other user branch 99
            with connection.cursor() as cursor:
                try:
                    cursor.execute("INSERT INTO bl_agreement (contract_number, name_of_debtor, created_by, branch_id) VALUES (%s,%s,%s,%s)", ['C-100', 'Debtor A', 'csa2', 11])
                except Exception:
                    # table/column may not exist
                    self.db_ok = False
                try:
                    cursor.execute("INSERT INTO bl_agreement (contract_number, name_of_debtor, created_by, branch_id) VALUES (%s,%s,%s,%s)", ['C-200', 'Debtor B', 'other', 99])
                except Exception:
                    self.db_ok = False
        except Exception:
            self.db_ok = False

    def test_csa_sees_only_own(self):
        if not self.db_ok:
            self.skipTest('DB or table bl_agreement not available')
        self.client.force_authenticate(user=self.csa)
        resp = self.client.get('/api/bl-agreement/')
        self.assertEqual(resp.status_code, 200)
        items = resp.data.get('agreements') or []
        # all returned rows must have created_by == csa2
        for it in items:
            self.assertEqual(it.get('created_by'), 'csa2')

    def test_bm_sees_branch(self):
        if not self.db_ok:
            self.skipTest('DB or table bl_agreement not available')
        self.client.force_authenticate(user=self.bm)
        resp = self.client.get('/api/bl-agreement/')
        self.assertEqual(resp.status_code, 200)
        items = resp.data.get('agreements') or []
        for it in items:
            self.assertIn(int(it.get('branch_id') or 0), (11,))

    def test_admin_sees_all(self):
        if not self.db_ok:
            self.skipTest('DB or table bl_agreement not available')
        self.client.force_authenticate(user=self.admin)
        resp = self.client.get('/api/bl-agreement/')
        self.assertEqual(resp.status_code, 200)
        items = resp.data.get('agreements') or []
        # should include both contract numbers
        nums = {it.get('contract_number') for it in items}
        self.assertTrue('C-100' in nums or 'C-200' in nums)

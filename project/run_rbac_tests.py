import os
import sys

import django
import pytest


def main():
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')
    django.setup()
    # run pytest on the two RBAC tests
    sys.exit(pytest.main(['-q', 'project/test_user_management_rbac.py', 'project/test_bl_agreement_rbac.py']))


if __name__ == '__main__':
    main()

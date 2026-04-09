from myproject.settings import *

# When running tests we want Django to manage the legacy `auth_user` table
# so migrations and integration tests can create a test version of it.
TEST_MANAGE_AUTH_USER = True

# Optionally override other test-friendly settings here (e.g. faster password hashing)
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',
]

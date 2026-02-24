from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken


class Command(BaseCommand):
    help = 'Create a test user (if not exists) and print JWT tokens for dev testing'

    def add_arguments(self, parser):
        parser.add_argument('--username', default='masterdata_admin')
        parser.add_argument('--password', default='masterdata')
        parser.add_argument('--email', default='masterdata@example.com')

    def handle(self, *args, **options):
        User = get_user_model()
        username = options['username']
        password = options['password']
        email = options['email']

        user, created = User.objects.get_or_create(username=username, defaults={'email': email})
        if created:
            user.set_password(password)
            user.is_staff = True
            user.is_superuser = True
            user.save()
            self.stdout.write(self.style.SUCCESS(f'Created user: {username}'))
        else:
            self.stdout.write(self.style.WARNING(f'User {username} already exists'))

        refresh = RefreshToken.for_user(user)
        access = str(refresh.access_token)
        self.stdout.write('--- TOKENS ---')
        self.stdout.write(f'username: {username}')
        self.stdout.write(f'password: {password}')
        self.stdout.write(f'access: {access}')
        self.stdout.write(f'refresh: {str(refresh)}')

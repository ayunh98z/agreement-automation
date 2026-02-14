from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from rolepermissions.roles import assign_role


class Command(BaseCommand):
    help = 'Create test users with roles'

    def handle(self, *args, **options):
        # Buat admin user
        if not User.objects.filter(username='admin').exists():
            admin_user = User.objects.create_user(
                username='admin',
                password='admin123',
                email='admin@example.com'
            )
            assign_role(admin_user, 'AdminRole')
            self.stdout.write(self.style.SUCCESS('✅ Admin user created: admin/admin123'))
        else:
            self.stdout.write(self.style.WARNING('⚠️  Admin user already exists'))

        # Buat regular user
        if not User.objects.filter(username='user').exists():
            regular_user = User.objects.create_user(
                username='user',
                password='user123',
                email='user@example.com'
            )
            assign_role(regular_user, 'UserRole')
            self.stdout.write(self.style.SUCCESS('✅ Regular user created: user/user123'))
        else:
            self.stdout.write(self.style.WARNING('⚠️  Regular user already exists'))

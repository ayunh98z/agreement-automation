from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model


class Command(BaseCommand):
    help = "Create a development superuser 'devadmin' with a known password"

    def handle(self, *args, **options):
        User = get_user_model()
        username = 'devadmin'
        password = 'Admin123!'
        email = 'devadmin@example.com'

        if User.objects.filter(username=username).exists():
            self.stdout.write(self.style.WARNING(f"User '{username}' already exists."))
            return

        User.objects.create_superuser(username=username, email=email, password=password)
        self.stdout.write(self.style.SUCCESS(f"Created superuser '{username}' with password '{password}'"))

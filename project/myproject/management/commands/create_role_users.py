from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model


class Command(BaseCommand):
    help = 'Create demo users for each RBAC role (Admin, CSA, SLIK, BM, AM, RM, BOD)'

    def handle(self, *args, **options):
        User = get_user_model()
        roles = [
            ('admin', 'Admin'),
            ('csa', 'CSA'),
            ('slik', 'SLIK'),
            ('bm1', 'BM'),
            ('am1', 'AM'),
            ('rm1', 'RM'),
            ('bod', 'BOD'),
            ('audit', 'Audit'),
        ]

        default_password = 'Password123!'

        created = []
        for uname, role_name in roles:
            try:
                if User.objects.filter(username=uname).exists():
                    self.stdout.write(self.style.WARNING(f"User '{uname}' already exists, skipping"))
                    continue

                user = User.objects.create_user(username=uname, email=f"{uname}@example.com", password=default_password)
                # Set role and some context values for BM/AM/RM
                try:
                    user.role = role_name
                except Exception:
                    # If the model doesn't expose `role` as writable, use setattr
                    try:
                        setattr(user, 'role', role_name)
                    except Exception:
                        pass

                # Set numeric defaults for location fields to avoid type errors
                if role_name == 'BM':
                    try: setattr(user, 'branch_id', 1)
                    except Exception: pass
                if role_name == 'AM':
                    try: setattr(user, 'area_id', 1)
                    except Exception: pass
                if role_name == 'RM':
                    try: setattr(user, 'region_id', 1)
                    except Exception: pass

                try:
                    user.full_name = uname.capitalize()
                except Exception:
                    pass

                user.save()
                created.append((uname, default_password, role_name))
                self.stdout.write(self.style.SUCCESS(f"Created user {uname} with role {role_name}"))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Failed creating {uname}: {e}"))

        if created:
            self.stdout.write(self.style.SUCCESS('\nDemo accounts created:'))
            for u, p, r in created:
                self.stdout.write(self.style.SUCCESS(f" - {u} / {p}  (role={r})"))
        else:
            self.stdout.write(self.style.WARNING('No new users were created.'))

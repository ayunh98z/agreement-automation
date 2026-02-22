from django.db import migrations


def set_default_roles(apps, schema_editor):
    # Best-effort SQL to normalize/seed role values for existing users.
    # - Map 'Administrator' -> 'Admin'
    # - Set role='Admin' for is_staff=1 when role empty
    # - Set role='User' for others when role empty
    from django.db import connection
    with connection.cursor() as cursor:
        try:
            cursor.execute("UPDATE auth_user SET role = 'Admin' WHERE role = 'Administrator'")
        except Exception:
            pass
        try:
            cursor.execute("UPDATE auth_user SET role = 'Admin' WHERE (role IS NULL OR role = '') AND is_staff = 1")
        except Exception:
            pass
        try:
            cursor.execute("UPDATE auth_user SET role = 'User' WHERE (role IS NULL OR role = '') AND (is_staff = 0 OR is_staff IS NULL)")
        except Exception:
            pass


class Migration(migrations.Migration):

    dependencies = [
        ('myproject', '0002_add_custom_user_fields'),
    ]

    operations = [
        migrations.RunPython(set_default_roles, reverse_code=migrations.RunPython.noop),
    ]

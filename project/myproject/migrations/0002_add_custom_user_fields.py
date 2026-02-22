# Generated migration - no-op since CustomUser is managed=False

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('myproject', '0001_custom_user'),
    ]

    operations = [
        # No operations - CustomUser fields are in auth_user table which is unmanaged
        migrations.RunSQL(
            sql=migrations.RunSQL.noop,
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]

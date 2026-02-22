# Generated migration to create CustomUser model mapping to auth_user
# Using RunSQL instead of CreateModel to avoid constraint issues with managed=False

from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('auth', '0012_alter_user_first_name_max_length'),
    ]

    operations = [
        # Provide a minimal model state for the swappable CustomUser so other
        # app migrations that reference AUTH_USER_MODEL can be resolved.
        migrations.CreateModel(
            name='CustomUser',
            fields=[
                ('id', models.BigAutoField(primary_key=True, serialize=False)),
            ],
            options={
                'db_table': 'auth_user',
                'managed': False,
            },
        ),
    ]

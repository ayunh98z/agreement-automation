from django.db import migrations


def add_columns(apps, schema_editor):
    cursor = schema_editor.connection.cursor()
    for col in ('branch_id','area_id','region_id'):
        try:
            cursor.execute(f"ALTER TABLE auth_user ADD COLUMN {col} INTEGER NULL;")
        except Exception:
            # Column may already exist or DB doesn't allow ALTER; ignore
            pass


def remove_columns(apps, schema_editor):
    cursor = schema_editor.connection.cursor()
    for col in ('branch_id','area_id','region_id'):
        try:
            cursor.execute(f"ALTER TABLE auth_user DROP COLUMN {col};")
        except Exception:
            pass


class Migration(migrations.Migration):

    dependencies = [
        ('myproject', '0003_set_default_roles'),
    ]

    operations = [
        migrations.RunPython(add_columns, reverse_code=remove_columns),
    ]

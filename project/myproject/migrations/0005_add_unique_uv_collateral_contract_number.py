from django.db import migrations


def create_unique_index(apps, schema_editor):
    cursor = schema_editor.connection.cursor()
    cursor.execute("""
        SELECT COUNT(1) FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'uv_collateral' AND INDEX_NAME = 'ux_uv_collateral_contract_number'
    """)
    row = cursor.fetchone()
    if not row or row[0] == 0:
        # create index; contract_number may be larger than index prefix limit depending on DB charset
        try:
            cursor.execute("ALTER TABLE uv_collateral ADD UNIQUE INDEX ux_uv_collateral_contract_number (contract_number(255))")
        except Exception:
            # fallback without prefix (some engines/versions may accept plain column)
            cursor.execute("ALTER TABLE uv_collateral ADD UNIQUE INDEX ux_uv_collateral_contract_number (contract_number)")


def drop_unique_index(apps, schema_editor):
    cursor = schema_editor.connection.cursor()
    cursor.execute("""
        SELECT COUNT(1) FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'uv_collateral' AND INDEX_NAME = 'ux_uv_collateral_contract_number'
    """)
    row = cursor.fetchone()
    if row and row[0] > 0:
        cursor.execute("ALTER TABLE uv_collateral DROP INDEX ux_uv_collateral_contract_number")


class Migration(migrations.Migration):

    dependencies = [
        ('myproject', '0004_add_user_context_fields'),
    ]

    operations = [
        migrations.RunPython(create_unique_index, reverse_code=drop_unique_index),
    ]

import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')
django.setup()

from django.db import connection

# Get column names from uv_agreement
with connection.cursor() as cursor:
    cursor.execute("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'uv_agreement' ORDER BY ORDINAL_POSITION")
    uv_agreement_cols = [row[0] for row in cursor.fetchall()]

# Get column names from uv_sp3
with connection.cursor() as cursor:
    cursor.execute("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'uv_sp3' ORDER BY ORDINAL_POSITION")
    uv_sp3_cols = [row[0] for row in cursor.fetchall()]

# Compare
cols_only_in_sp3 = set(uv_sp3_cols) - set(uv_agreement_cols)
cols_only_in_agreement = set(uv_agreement_cols) - set(uv_sp3_cols)

print('==== ANALISIS PERBANDINGAN KOLOM ====')
print()
print('Total kolom di uv_agreement:', len(uv_agreement_cols))
print('Total kolom di uv_sp3:', len(uv_sp3_cols))
print()

if cols_only_in_sp3:
    print('KOLOM YANG ADA DI uv_sp3 TAPI TIDAK DI uv_agreement:')
    for col in sorted(cols_only_in_sp3):
        print('  - ' + col)
else:
    print('✓ Tidak ada kolom yang hanya di uv_sp3')

print()

if cols_only_in_agreement:
    print('KOLOM YANG ADA DI uv_agreement TAPI TIDAK DI uv_sp3:')
    for col in sorted(cols_only_in_agreement):
        print('  - ' + col)
else:
    print('✓ Tidak ada kolom yang hanya di uv_agreement')

print()
print('Kolom yang sama di kedua tabel:', len(set(uv_agreement_cols) & set(uv_sp3_cols)))

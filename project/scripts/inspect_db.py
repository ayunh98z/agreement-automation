from django.db import connection
from myproject.models import AgreementAccess

cn = 'CON002'
with connection.cursor() as c:
    c.execute("SELECT created_by, created_by_id FROM bl_agreement WHERE LOWER(contract_number)=LOWER(%s) LIMIT 1", [cn])
    row = c.fetchone()
    print('bl_agreement row:', row)
    aas = list(AgreementAccess.objects.filter(contract_number__iexact=cn).values())
    print('AgreementAccess rows:', aas)

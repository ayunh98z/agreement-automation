import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')
django.setup()

from myproject.models import AgreementAccess

print('Total AgreementAccess rows:', AgreementAccess.objects.count())
for aa in AgreementAccess.objects.order_by('-created_at')[:50]:
    print({
        'id': aa.pk,
        'contract_number': aa.contract_number,
        'user_id': aa.user_id,
        'role': aa.role,
        'download_grants': aa.download_grants,
        'download_consumed': aa.download_consumed,
        'edit_grants': aa.edit_grants,
        'edit_consumed': aa.edit_consumed,
        'locked': aa.locked,
        'created_at': str(aa.created_at),
    })

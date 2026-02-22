import pytest

from myproject.models import AgreementAccess, AuditEvent


@pytest.mark.integration
@pytest.mark.django_db
def test_audit_event_created_on_consume_edit():
    aa = AgreementAccess.objects.create(contract_number='CNTEST_EDIT', user_id=1001, role='CSA', download_grants=1, edit_grants=1)
    assert aa.edit_consumed == 0
    ok = aa.consume_edit()
    aa.refresh_from_db()
    assert ok is True
    assert aa.edit_consumed == 1
    ev = AuditEvent.objects.filter(contract_number='CNTEST_EDIT', action='edit').first()
    assert ev is not None
    assert 'edit_consumed' in (ev.details or '')


@pytest.mark.integration
@pytest.mark.django_db
def test_audit_event_created_on_consume_download():
    aa = AgreementAccess.objects.create(contract_number='CNTEST_DL', user_id=1002, role='CSA', download_grants=1, edit_grants=0)
    assert aa.download_consumed == 0
    ok = aa.consume_download()
    aa.refresh_from_db()
    assert ok is True
    assert aa.download_consumed == 1
    ev = AuditEvent.objects.filter(contract_number='CNTEST_DL', action='download').first()
    assert ev is not None
    assert 'download_consumed' in (ev.details or '')

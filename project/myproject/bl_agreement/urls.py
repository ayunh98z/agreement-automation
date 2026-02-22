from django.urls import path
from .views import BLAgreementView, BLAgreementContractListView, BLAgreementDocxDownloadView
from .views import BLAgreementAccessView

urlpatterns = [
    path('', BLAgreementView.as_view(), name='bl-agreement'),
    path('contracts/', BLAgreementContractListView.as_view(), name='bl-agreement-contracts'),
    path('download-docx/', BLAgreementDocxDownloadView.as_view(), name='bl-agreement-download-docx'),
    path('<str:contract_number>/access/', BLAgreementAccessView.as_view(), name='bl-agreement-access'),
]

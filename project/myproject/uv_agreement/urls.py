from django.urls import path
from .views import UVAgreementView, UVAgreementDocxDownloadView, UVCollateralCreateView, UVAgreementAccessView

urlpatterns = [
    path('', UVAgreementView.as_view(), name='uv-agreement'),
    path('contracts/', UVAgreementView.as_view(), name='uv-agreement-contracts'),
    path('download-docx/', UVAgreementDocxDownloadView.as_view(), name='uv-agreement-download-docx'),
    path('<str:contract_number>/access/', UVAgreementAccessView.as_view(), name='uv-agreement-access'),
    path('collateral/', UVCollateralCreateView.as_view(), name='uv-collateral-create'),
]

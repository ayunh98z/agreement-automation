from django.urls import path
from .views import UVAgreementView, UVAgreementDocxDownloadView, UVCollateralCreateView

urlpatterns = [
    path('', UVAgreementView.as_view(), name='uv-agreement'),
    path('contracts/', UVAgreementView.as_view(), name='uv-agreement-contracts'),
    path('download-docx/', UVAgreementDocxDownloadView.as_view(), name='uv-agreement-download-docx'),
    path('collateral/', UVCollateralCreateView.as_view(), name='uv-collateral-create'),
]

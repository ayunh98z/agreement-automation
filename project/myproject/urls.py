"""
URL configuration for myproject project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from myproject import views  # Mengimpor views dari aplikasi myapp
from .views import RegisterView, CustomTokenObtainPairView, CustomTokenRefreshView, ProtectedView, DashboardSummaryView, SimpleLoginView
from .views import UserListCreateView, UserDetailView, BLAgreementView, BLAgreementContractListView, BranchListView, BranchManagerByCityView, DirectorListView, RegionListView, AreaListView



urlpatterns = [
    path('admin/', admin.site.urls),
    path('accounts/', include('allauth.urls')),
    path('', views.home, name='home'),  # Menambahkan root URL (/) yang menuju ke view home
    path('login/', SimpleLoginView.as_view(), name='simple-login'),  # Simple login endpoint (dari auth_user table)
    path('register/', RegisterView.as_view(), name='register'),  # Register endpoint
    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),  # Login (JWT)
    path('api/token/refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),  # Refresh token
    path('protected/', ProtectedView.as_view(), name='protected'),  # Contoh endpoint yang dilindungi
    path('api/dashboard/summary/', DashboardSummaryView.as_view(), name='dashboard-summary'),
    path('api/users/', UserListCreateView.as_view(), name='user-list-create'),
    path('api/users/<str:username>/', UserDetailView.as_view(), name='user-detail'),
    path('api/bl-agreement/', BLAgreementView.as_view(), name='bl-agreement'),  # BL Agreement endpoint
    path('api/bl-agreement/contracts/', BLAgreementContractListView.as_view(), name='bl-agreement-contracts'),  # BL Agreement contract list
    path('api/bl-agreement/download-docx/', views.BLAgreementDocxDownloadView.as_view(), name='bl-agreement-download-docx'),
    # UV agreement endpoints (kept separate from BL)
    path('api/uv-agreement/', views.UVAgreementView.as_view(), name='uv-agreement'),
    path('api/uv-agreement/contracts/', views.UVAgreementView.as_view(), name='uv-agreement-contracts'),
    path('api/uv-agreement/download-docx/', views.UVAgreementDocxDownloadView.as_view(), name='uv-agreement-download-docx'),
    path('api/uv-sp3/download-docx/', views.UVSP3DocxDownloadView.as_view(), name='uv-sp3-download-docx'),
    path('api/uv-sp3/', views.UVSP3ListView.as_view(), name='uv-sp3'),
    path('api/uv-collateral/', views.UVCollateralCreateView.as_view(), name='uv-collateral-create'),
    path('api/contracts/', views.ContractCreateView.as_view(), name='contract-create'),
    path('api/contracts/lookup/', views.ContractLookupView.as_view(), name='contract-lookup'),
    path('api/bl-collateral/', views.BLCollateralCreateView.as_view(), name='bl-collateral-create'),
    path('api/bl-sp3/', views.BLSP3View.as_view(), name='bl-sp3'),
    path('api/bl-sp3/create-public/', views.bl_sp3_public_create, name='bl-sp3-create-public'),
    path('api/regions/', RegionListView.as_view(), name='region-list'),
    path('api/areas/', AreaListView.as_view(), name='area-list'),
    path('api/branches/', BranchListView.as_view(), name='branch-list'),
    path('api/branch-manager/', BranchManagerByCityView.as_view(), name='branch-manager-by-city'),
    path('api/directors/', DirectorListView.as_view(), name='director-list'),
    path('api/whoami/', views.WhoAmIView.as_view(), name='whoami'),
]

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
from .views import CustomTokenObtainPairView, CustomTokenRefreshView, ProtectedView, DashboardSummaryView, BranchListView, BranchManagerByCityView, DirectorListView, RegionListView, AreaListView
from myproject.user_management import views as user_views
from myproject.uv_agreement.views import UVCollateralCreateView



urlpatterns = [
    path('admin/', admin.site.urls),
    path('accounts/', include('allauth.urls')),
    path('', views.home, name='home'),  # Menambahkan root URL (/) yang menuju ke view home
        path('login/', user_views.SimpleLoginView.as_view(), name='simple-login'),  # Simple login endpoint (moved to user_management)
        path('register/', user_views.RegisterView.as_view(), name='register'),  # Register endpoint (moved to user_management)
    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),  # Login (JWT)
    path('api/token/refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),  # Refresh token
    path('protected/', ProtectedView.as_view(), name='protected'),  # Contoh endpoint yang dilindungi
    path('api/dashboard/summary/', DashboardSummaryView.as_view(), name='dashboard-summary'),
        path('api/users/', user_views.UserListCreateView.as_view(), name='user-list-create'),
        path('api/users/<str:username>/', user_views.UserDetailView.as_view(), name='user-detail'),
    path('api/bl-agreement/', include('myproject.bl_agreement.urls')),
    # UV agreement endpoints
    path('api/uv-agreement/', include('myproject.uv_agreement.urls')),
    path('api/contracts/', views.ContractCreateView.as_view(), name='contract-create'),
    path('api/contracts/list/', views.ContractsListView.as_view(), name='contracts-list'),
    path('api/contracts/table/', views.ContractsTableView.as_view(), name='contracts-table'),
    path('api/contracts/lookup/', views.ContractLookupView.as_view(), name='contract-lookup'),
    path('api/bl-collateral/', views.BLCollateralCreateView.as_view(), name='bl-collateral-create'),
    path('api/uv-collateral/', UVCollateralCreateView.as_view(), name='uv-collateral-create'),
    # All BL/UV endpoints are served from their app packages below.
    # Keep monolith routes only for unrelated legacy views.
    path('api/regions/', RegionListView.as_view(), name='region-list'),
    path('api/areas/', AreaListView.as_view(), name='area-list'),
    path('api/branches/', BranchListView.as_view(), name='branch-list'),
    path('api/branch-manager/', BranchManagerByCityView.as_view(), name='branch-manager-by-city'),
    path('api/directors/', DirectorListView.as_view(), name='director-list'),
    path('api/whoami/', views.WhoAmIView.as_view(), name='whoami'),
    path('api/downloads/logs/', views.DownloadLogListView.as_view(), name='download-log-list'),
]

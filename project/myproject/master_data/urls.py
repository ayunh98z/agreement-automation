from django.urls import path
from myproject import views as legacy_views

# Route master-data API paths to the legacy DB-backed views so the frontend
# reads from the existing `regions`, `areas`, and `branches` tables instead of
# the seeded `master_data_*` tables.
urlpatterns = [
    path('regions/', legacy_views.RegionListView.as_view(), name='md-region-list'),
    path('regions/<int:pk>/', legacy_views.RegionListView.as_view(), name='md-region-detail'),
    path('areas/', legacy_views.AreaListView.as_view(), name='md-area-list'),
    path('areas/<int:pk>/', legacy_views.AreaListView.as_view(), name='md-area-detail'),
    path('branches/', legacy_views.BranchListView.as_view(), name='md-branch-list'),
    path('branches/<int:pk>/', legacy_views.BranchListView.as_view(), name='md-branch-detail'),
]

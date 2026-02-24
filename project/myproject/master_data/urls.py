from django.urls import path
from . import views

urlpatterns = [
    path('regions/', views.RegionListCreateView.as_view(), name='md-region-list'),
    path('regions/<int:pk>/', views.RegionDetailView.as_view(), name='md-region-detail'),
    path('areas/', views.AreaListCreateView.as_view(), name='md-area-list'),
    path('areas/<int:pk>/', views.AreaDetailView.as_view(), name='md-area-detail'),
    path('branches/', views.BranchListCreateView.as_view(), name='md-branch-list'),
    path('branches/<int:pk>/', views.BranchDetailView.as_view(), name='md-branch-detail'),
]

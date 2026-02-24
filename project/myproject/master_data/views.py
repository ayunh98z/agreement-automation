from rest_framework import generics, permissions
from .models import Region, Area, Branch
from .serializers import RegionSerializer, AreaSerializer, BranchSerializer


class RegionListCreateView(generics.ListCreateAPIView):
    queryset = Region.objects.all().order_by('id')
    serializer_class = RegionSerializer
    permission_classes = [permissions.IsAuthenticated]


class RegionDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Region.objects.all()
    serializer_class = RegionSerializer
    permission_classes = [permissions.IsAuthenticated]


class AreaListCreateView(generics.ListCreateAPIView):
    queryset = Area.objects.all().order_by('id')
    serializer_class = AreaSerializer
    permission_classes = [permissions.IsAuthenticated]


class AreaDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Area.objects.all()
    serializer_class = AreaSerializer
    permission_classes = [permissions.IsAuthenticated]


class BranchListCreateView(generics.ListCreateAPIView):
    queryset = Branch.objects.all().order_by('id')
    serializer_class = BranchSerializer
    permission_classes = [permissions.IsAuthenticated]


class BranchDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Branch.objects.all()
    serializer_class = BranchSerializer
    permission_classes = [permissions.IsAuthenticated]

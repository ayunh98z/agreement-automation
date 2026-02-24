from django.contrib import admin
from .models import Region, Area, Branch


@admin.register(Region)
class RegionAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'code')


@admin.register(Area)
class AreaAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'code', 'region')


@admin.register(Branch)
class BranchAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'code', 'area')

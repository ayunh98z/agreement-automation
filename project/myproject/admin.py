from django.contrib import admin
from .models import DownloadLog

@admin.register(DownloadLog)
class DownloadLogAdmin(admin.ModelAdmin):
    list_display = ('id', 'username', 'user_id', 'file_type', 'file_identifier', 'filename', 'timestamp', 'ip_address', 'file_size')
    list_filter = ('file_type', 'timestamp')
    search_fields = ('username', 'email', 'file_identifier', 'filename', 'ip_address')
    readonly_fields = ('user_id', 'username', 'email', 'file_type', 'file_identifier', 'filename', 'timestamp', 'ip_address', 'user_agent', 'success', 'file_size', 'method')

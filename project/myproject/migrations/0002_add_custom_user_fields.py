# Generated migration - adds custom fields to existing auth_user table

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('myproject', '0001_custom_user'),
    ]

    operations = [
        migrations.AddField(
            model_name='customuser',
            name='phone',
            field=models.CharField(blank=True, max_length=20, null=True),
        ),
        migrations.AddField(
            model_name='customuser',
            name='employee_id',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='customuser',
            name='role',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='customuser',
            name='region_id',
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='customuser',
            name='area_id',
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='customuser',
            name='branch_id',
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='customuser',
            name='full_name',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
    ]

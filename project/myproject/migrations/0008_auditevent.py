from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('myproject', '0007_agreementaccess'),
    ]

    operations = [
        migrations.CreateModel(
            name='AuditEvent',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('contract_number', models.CharField(max_length=255, db_index=True)),
                ('user_id', models.BigIntegerField(blank=True, null=True)),
                ('username', models.CharField(blank=True, max_length=150, null=True)),
                ('action', models.CharField(max_length=50)),
                ('details', models.TextField(blank=True, null=True)),
                ('timestamp', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'db_table': 'agreement_audit_event',
            },
        ),
    ]

from django.core.management.base import BaseCommand

from myproject.master_data.models import Region, Area, Branch


class Command(BaseCommand):
    help = 'Seed sample master data (regions, areas, branches) for development'

    def handle(self, *args, **options):
        samples = [
            {
                'region': 'Region A',
                'areas': [
                    {'name': 'Area A1', 'branches': ['Branch A1-1', 'Branch A1-2']},
                    {'name': 'Area A2', 'branches': ['Branch A2-1']},
                ],
            },
            {
                'region': 'Region B',
                'areas': [
                    {'name': 'Area B1', 'branches': ['Branch B1-1', 'Branch B1-2', 'Branch B1-3']},
                ],
            },
        ]

        created = 0
        for s in samples:
            region_obj, _ = Region.objects.get_or_create(name=s['region'])
            for a in s['areas']:
                area_obj, _ = Area.objects.get_or_create(name=a['name'], region=region_obj)
                for bname in a['branches']:
                    Branch.objects.get_or_create(name=bname, area=area_obj)
                    created += 1

        self.stdout.write(self.style.SUCCESS(f'Seed complete. Created/ensured {created} branches.'))

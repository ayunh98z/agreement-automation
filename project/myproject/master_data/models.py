from django.db import models


class Region(models.Model):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, blank=True, null=True)

    def __str__(self):
        return self.name


class Area(models.Model):
    region = models.ForeignKey(Region, related_name='areas', on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, blank=True, null=True)

    def __str__(self):
        return self.name


class Branch(models.Model):
    area = models.ForeignKey(Area, related_name='branches', on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, blank=True, null=True)
    branch_name = models.CharField(max_length=255, blank=True, null=True)
    phone_number_branch = models.CharField(max_length=20, blank=True, default='')

    def __str__(self):
        return self.name

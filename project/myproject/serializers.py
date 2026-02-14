from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'password', 'email', 'phone', 'employee_id', 'role', 'region_id', 'area_id', 'branch_id', 'full_name', 'is_active', 'is_staff']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        # pop custom fields if present
        phone = validated_data.pop('phone', None)
        employee_id = validated_data.pop('employee_id', None)
        role = validated_data.pop('role', None)
        region_id = validated_data.pop('region_id', None)
        area_id = validated_data.pop('area_id', None)
        branch_id = validated_data.pop('branch_id', None)
        full_name = validated_data.pop('full_name', None)

        user = User.objects.create_user(**validated_data)
        if password:
            user.set_password(password)
        # set extra fields if model supports them
        for attr, val in [('phone', phone), ('employee_id', employee_id), ('role', role), ('region_id', region_id), ('area_id', area_id), ('branch_id', branch_id), ('full_name', full_name)]:
            if val is not None and hasattr(user, attr):
                setattr(user, attr, val)
        user.save()
        return user

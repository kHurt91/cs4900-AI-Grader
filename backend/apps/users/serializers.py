# apps/users/serializers.py
from rest_framework import serializers
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from .models import CustomUser


class UserSerializer(serializers.ModelSerializer):
    """Serializer for user details"""

    class Meta:
        model = CustomUser
        fields = ["id", "username", "email", "win_number", "first_name", "last_name", "date_joined", "role"]
        read_only_fields = ["id", "date_joined"]


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration"""

    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = CustomUser
        fields = ["username", "email", "password", "first_name", "last_name", "role"]

    def validate_email(self, email):
        try:
            validate_email(email)
        except ValidationError:
            raise serializers.ValidationError("Invalid email.")

        if len(CustomUser.objects.filter(email=email)) > 0:
            raise serializers.ValidationError("A user with that email already exists.")
        return email

    def create(self, validated_data):
        user = CustomUser.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
            role=validated_data.get("role", "student")
        )
        return user

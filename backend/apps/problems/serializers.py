# apps/problems/serializers.py
"""
Serializers for Problem Management API
"""

from rest_framework import serializers
from .models import (
    ProblemCategory,
    Problem,
    ProblemPart,
    ProblemTag,
    ProblemTagging,
    ProblemTemplate,
)


class ProblemCategorySerializer(serializers.ModelSerializer):
    """Serializer for ProblemCategory"""

    class Meta:
        model = ProblemCategory
        fields = "__all__"


class ProblemTagSerializer(serializers.ModelSerializer):
    """Serializer for ProblemTag"""

    class Meta:
        model = ProblemTag
        fields = "__all__"


class ProblemPartSerializer(serializers.ModelSerializer):
    """Serializer for ProblemPart (multi-part problems)"""

    class Meta:
        model = ProblemPart
        fields = "__all__"


class ProblemListSerializer(serializers.ModelSerializer):
    """Serializer for listing problems (summary view)"""

    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = Problem
        fields = [
            "id",
            "title",
            "category",
            "category_name",
            "difficulty",
            "created_at",
        ]


class ProblemDetailSerializer(serializers.ModelSerializer):
    """Serializer for detailed problem view"""

    parts = ProblemPartSerializer(many=True, read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = Problem
        fields = "__all__"


class ProblemCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating problems"""

    class Meta:
        model = Problem
        fields = "__all__"

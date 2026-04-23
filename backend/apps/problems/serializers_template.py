"""
Serializers for Problem Templates and Instances
"""

from rest_framework import serializers
from apps.problems.models import ProblemTemplate, ProblemInstance


class ProblemTemplateSerializer(serializers.ModelSerializer):
    """Serializer for Problem Templates with variable parameters"""

    created_by_name = serializers.CharField(
        source="created_by.get_full_name", read_only=True
    )
    usage_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = ProblemTemplate
        fields = [
            "id",
            "name",
            "description",
            "template_data",
            "usage_count",
            "is_public",
            "created_by",
            "created_by_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "usage_count"]

    def validate_template_data(self, value):
        """Validate template_data structure"""
        required_keys = [
            "question_text",
            "parameters",
            "solution_template",
            "answer_type",
        ]

        for key in required_keys:
            if key not in value:
                raise serializers.ValidationError(f"template_data must contain '{key}'")

        # Validate parameters structure
        if not isinstance(value["parameters"], dict):
            raise serializers.ValidationError("parameters must be a dictionary")

        for param_name, param_def in value["parameters"].items():
            required_param_keys = ["type", "min", "max"]
            for key in required_param_keys:
                if key not in param_def:
                    raise serializers.ValidationError(
                        f"Parameter '{param_name}' must contain '{key}'"
                    )

        return value


class ProblemTemplateCreateSerializer(serializers.ModelSerializer):
    """Simplified serializer for creating templates"""

    class Meta:
        model = ProblemTemplate
        fields = ["name", "description", "template_data", "is_public"]

    def create(self, validated_data):
        # Add created_by from request context
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)


class ProblemInstanceSerializer(serializers.ModelSerializer):
    """Serializer for Problem Instances"""

    template_name = serializers.CharField(source="template.name", read_only=True)
    student_username = serializers.CharField(source="student.username", read_only=True)
    parameter_display = serializers.CharField(
        source="get_parameter_display", read_only=True
    )

    class Meta:
        model = ProblemInstance
        fields = [
            "id",
            "template",
            "template_name",
            "student",
            "student_username",
            "assignment",
            "parameter_values",
            "rendered_text",
            "expected_answer",
            "parameter_display",
            "generated_at",
            "seed",
        ]
        read_only_fields = [
            "id",
            "parameter_values",
            "rendered_text",
            "expected_answer",
            "generated_at",
        ]


class ProblemInstanceDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for viewing a problem instance"""

    template = ProblemTemplateSerializer(read_only=True)

    class Meta:
        model = ProblemInstance
        fields = ["id", "template", "rendered_text", "parameter_values", "generated_at"]

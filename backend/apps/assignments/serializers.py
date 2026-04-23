"""
Serializers for Assignment Management
"""

from rest_framework import serializers
from apps.assignments.models import Assignment
from apps.problems.serializers_template import ProblemTemplateSerializer


class AssignmentSerializer(serializers.ModelSerializer):
    """Serializer for Assignments"""

    created_by_name = serializers.CharField(
        source="created_by.get_full_name", read_only=True
    )
    assignment_type_display = serializers.CharField(
        source="get_assignment_type_display", read_only=True
    )
    problem_templates_detail = ProblemTemplateSerializer(
        source="problem_templates", many=True, read_only=True
    )
    template_count = serializers.SerializerMethodField()

    # Status fields
    is_open = serializers.SerializerMethodField()
    is_past_due = serializers.SerializerMethodField()
    can_submit = serializers.SerializerMethodField()
    can_reveal = serializers.SerializerMethodField()

    class Meta:
        model = Assignment
        fields = [
            "id",
            "name",
            "description",
            "assignment_type",
            "assignment_type_display",
            "open_date",
            "due_date",
            "reveal_date",
            "allow_late",
            "late_penalty_percent",
            "max_late_days",
            "max_attempts",
            "show_score_immediately",
            "show_correct_answer",
            "show_feedback",
            "problem_templates",
            "problem_templates_detail",
            "template_count",
            "randomize_order",
            "total_points",
            "created_by",
            "created_by_name",
            "created_at",
            "is_active",
            "is_open",
            "is_past_due",
            "can_submit",
            "can_reveal",
        ]
        read_only_fields = ["id", "created_at"]

    def get_template_count(self, obj):
        return obj.problem_templates.count()

    def get_is_open(self, obj):
        return obj.is_open()

    def get_is_past_due(self, obj):
        return obj.is_past_due()

    def get_can_submit(self, obj):
        return obj.can_submit()

    def get_can_reveal(self, obj):
        return obj.can_reveal_results()


class AssignmentCreateSerializer(serializers.ModelSerializer):
    """Simplified serializer for creating assignments"""

    class Meta:
        model = Assignment
        fields = [
            "name",
            "description",
            "assignment_type",
            "open_date",
            "due_date",
            "reveal_date",
            "allow_late",
            "late_penalty_percent",
            "max_late_days",
            "max_attempts",
            "show_score_immediately",
            "show_correct_answer",
            "show_feedback",
            "problem_templates",
            "randomize_order",
            "total_points",
        ]

    def create(self, validated_data):
        problem_templates = validated_data.pop("problem_templates", [])
        validated_data["created_by"] = self.context["request"].user
        assignment = Assignment.objects.create(**validated_data)
        assignment.problem_templates.set(problem_templates)
        return assignment


class AssignmentStudentViewSerializer(serializers.ModelSerializer):
    """Serializer for student view of assignment (limited info)"""

    assignment_type_display = serializers.CharField(
        source="get_assignment_type_display", read_only=True
    )
    problem_count = serializers.SerializerMethodField()
    time_remaining = serializers.SerializerMethodField()

    class Meta:
        model = Assignment
        fields = [
            "id",
            "name",
            "description",
            "assignment_type",
            "assignment_type_display",
            "open_date",
            "due_date",
            "problem_count",
            "total_points",
            "max_attempts",
            "time_remaining",
        ]

    def get_problem_count(self, obj):
        return obj.problem_templates.count()

    def get_time_remaining(self, obj):
        from django.utils import timezone

        if obj.is_past_due():
            return 0
        delta = obj.due_date - timezone.now()
        return delta.total_seconds()

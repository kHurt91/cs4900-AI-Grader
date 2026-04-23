# apps/grading/serializers.py
from rest_framework import serializers
from .models import Submission, GradingResult


class GradingResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = GradingResult
        fields = ["ai_result"]


class SubmissionSerializer(serializers.ModelSerializer):
    problem_title = serializers.CharField(source="problem.title", read_only=True)
    student_username = serializers.CharField(source="student.username", read_only=True)
    result = GradingResultSerializer(read_only=True)

    class Meta:
        model = Submission
        fields = [
            "submission_id",
            "student_id",
            "quiz",
            "content",
            "problem_title",
            "student_username",
            "student_answer",
            "expected_answer",
            "is_correct",
            "score",
            "grading_method",
            "submitted_at",
            "status",
            "attempt_number",
            "result",
        ]

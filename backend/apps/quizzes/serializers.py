# apps/quizzes/serializers.py
"""
Serializers for Quiz Management API
"""

from rest_framework import serializers
from .models import (
    Course,
    CourseEnrollment,
    Quiz,
    QuizProblem,
    QuizAttempt,
    QuizStatistics,
    AnswerBox,
    AnswerSubmission,
)
from ..users.models import CustomUser
from ..problems.models import Problem, ProblemPart


class CourseSerializer(serializers.ModelSerializer):
    """Serializer for Course"""

    instructor_id = serializers.IntegerField()

    class Meta:
        model = Course
        fields = [
            "id",
            "title",
            "course_code",
            "semester",
            "instructor_id",
        ]

    def create(self, validated_data):
        instructor = CustomUser.objects.get(id=validated_data["instructor_id"])
        course = Course.objects.create(
            title=validated_data["title"],
            course_code=validated_data["course_code"],
            semester=validated_data["semester"],
            description="",
            year=2026,  # TODO: get year
            instructor=instructor,
        )
        return course

    def update(self, instance, validated_data):
        """Allow course editing
        serializer = CourseSerializer(instance, data=data)
        """
        # TODO: Update course info
        ...


class CourseEnrollmentSerializer(serializers.ModelSerializer):
    """Serializer for CourseEnrollment"""

    class Meta:
        model = CourseEnrollment
        fields = "__all__"


class QuizProblemCreateSerializer(serializers.Serializer):
    title = serializers.CharField()
    question_text = serializers.CharField()
    question_latex = serializers.CharField(required=False, allow_blank=True, default="")
    correct_answer = serializers.CharField(required=False, allow_blank=True, default="")
    problem_order = serializers.IntegerField()
    points = serializers.FloatField(required=False, default=1.0)
    custom_instructions = serializers.CharField(
        required=False, allow_blank=True, default=""
    )
    time_limit_override = serializers.IntegerField(required=False, allow_null=True)
    parameter_overrides = serializers.JSONField(required=False, default=dict)
    figure = serializers.CharField(required=False, allow_blank=True, default="")
    parts = serializers.ListField(required=False, default=list)


class QuizSerializer(serializers.ModelSerializer):
    problems = QuizProblemCreateSerializer(many=True, write_only=True, required=False)

    class Meta:
        model = Quiz
        fields = [
            "id",
            "title",
            "course",
            "created_by",
            "quiz_type",
            "problems",
            "time_limit",
            "available_from",
            "available_until",
            "max_attempts",
            "allow_review",
            "total_points",
        ]

    def create(self, validated_data):
        problems_data = validated_data.pop("problems", [])
        quiz = Quiz.objects.create(**validated_data)

        for item in problems_data:
            figure = item.get("figure", "")

            problem = Problem.objects.create(
                title=item["title"],
                question_text=item["question_text"],
                question_latex=item.get("question_latex", ""),
                author=quiz.created_by,
                supplementary_files=[figure] if figure else [],
            )

            parts_data = item.get("parts", [])

            for index, part in enumerate(parts_data):
                ProblemPart.objects.create(
                    problem=problem,
                    part_number=part.get("part_number", index + 1) or index + 1,
                    part_text=part.get("part_text", ""),
                    expected_answer=part.get("expected_answer", ""),
                    points=part.get("points", 1),
                    allow_partial_credit=part.get("allow_partial_credit", True),
                    answer_format=part.get("answer_format", "mathematical_expression"),
                )

            QuizProblem.objects.create(
                quiz=quiz,
                problem=problem,
                problem_order=item["problem_order"],
                points=item.get("points", 1.0),
                custom_instructions=item.get("custom_instructions", ""),
                time_limit_override=item.get("time_limit_override"),
                parameter_overrides=item.get("parameter_overrides", {}),
            )

        quiz.calculate_total_points()
        return quiz


class QuizProblemSerializer(serializers.ModelSerializer):
    """Serializer for QuizProblem"""

    question_text = serializers.SerializerMethodField()

    class Meta:
        model = QuizProblem
        fields = "__all__"

        extra_fields = ["question_text"]

    def get_question_text(self, obj):
        return obj.problem.question_text


class QuizListSerializer(serializers.ModelSerializer):
    """Serializer for listing quizzes"""

    course_name = serializers.CharField(source="course.title", read_only=True)
    problem_count = serializers.SerializerMethodField()

    class Meta:
        model = Quiz
        fields = [
            "id",
            "title",
            "course",
            "course_name",
            "time_limit",
            "max_attempts",
            "is_published",
            "available_until",
            "problem_count",
        ]

    def get_problem_count(self, obj):
        return obj.quiz_problems.count()


class QuizDetailSerializer(serializers.ModelSerializer):
    """Serializer for detailed quiz view"""

    problems = QuizProblemSerializer(many=True, read_only=True, source="quiz_problems")
    course_name = serializers.CharField(source="course.title", read_only=True)

    class Meta:
        model = Quiz
        fields = "__all__"


class QuizAttemptSerializer(serializers.ModelSerializer):
    """Serializer for QuizAttempt"""

    class Meta:
        model = QuizAttempt
        fields = "__all__"


class QuizStatisticsSerializer(serializers.ModelSerializer):
    """Serializer for QuizStatistics"""

    class Meta:
        model = QuizStatistics
        fields = "__all__"


class AnswerBoxSerializer(serializers.ModelSerializer):
    """Serializer for Answer Boxes"""

    class Meta:
        model = AnswerBox
        fields = [
            "id",
            "box_number",
            "box_label",
            "placeholder_text",
            "expected_answer",
            "allow_approximation",
            "approximation_tolerance",
            "points",
            "answer_template",  # NEW
            "is_readonly",  # NEW
        ]


class AnswerSubmissionSerializer(serializers.ModelSerializer):
    """Serializer for Answer Submissions"""

    class Meta:
        model = AnswerSubmission
        fields = [
            "id",
            "answer_box",
            "student_answer",
            "is_correct",
            "ai_feedback",
            "points_earned",
            "graded_at",
            "submitted_at",
        ]


class QuizProblemDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for QuizProblem with answer boxes"""

    problem_text = serializers.CharField(source="problem.question_text", read_only=True)
    problem_title = serializers.CharField(source="problem.title", read_only=True)
    answer_boxes = AnswerBoxSerializer(many=True, read_only=True)
    figure = serializers.SerializerMethodField()
    parts = serializers.SerializerMethodField()

    class Meta:
        model = QuizProblem
        fields = [
            "id",
            "problem_order",
            "points",
            "custom_instructions",
            "time_limit_override",
            "parameter_overrides",
            "quiz",
            "problem",
            "problem_text",
            "problem_title",
            "answer_boxes",
            "figure",
            "parts",
        ]

    def get_figure(self, obj):
        files = obj.problem.supplementary_files or []
        return files[0] if files else None

    def get_parts(self, obj):
        return [
            {
                "id": part.id,
                "part_number": part.part_number,
                "part_text": part.part_text,
                "expected_answer": part.expected_answer,
                "points": part.points,
                "allow_partial_credit": part.allow_partial_credit,
                "answer_format": part.answer_format,
            }
            for part in obj.problem.parts.all().order_by("part_number")
        ]

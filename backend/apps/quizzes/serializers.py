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
    instructor_name = serializers.SerializerMethodField()

    def get_instructor_name(self, obj) -> str:
        return obj.instructor.get_full_name() or obj.instructor.username

    class Meta:
        model= Course
        fields= [
            "id",
            "title",
            "course_code",
            "semester",
            "instructor_id",
            "instructor_name",
        ]

    def create(self, validated_data):
        instructor = CustomUser.objects.get(id=validated_data["instructor_id"])
        course = Course.objects.create(
            title=validated_data["title"],
            course_code=validated_data["course_code"],
            semester=validated_data["semester"],
            description="",
            year=2026,  #TODO: get year
            instructor=instructor

        )
        return course

    def update(self, instance, validated_data):
        """ Allow course editing
        serializer = CourseSerializer(instance, data=data)
        """
        #TODO: Update course info
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
    custom_instructions = serializers.CharField(required=False, allow_blank=True, default="")
    time_limit_override = serializers.IntegerField(required=False, allow_null=True)
    parameter_overrides = serializers.JSONField(required=False, default=dict)
    figure = serializers.CharField(required=False, allow_blank=True, default="")
    parts = serializers.ListField(required=False, default=list)
    answer_boxes = serializers.ListField(required=False, default=list)
    grading_strategy = serializers.ChoiceField(
        choices=[choice[0] for choice in AnswerBox.GRADING_STRATEGIES],
        required=False,
        default="auto",
    )
    rubric = serializers.CharField(required=False, allow_blank=True, default="")
    feedback_style = serializers.CharField(required=False, allow_blank=True, default="")
    case_sensitive = serializers.BooleanField(required=False, default=False)

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
                description=item.get("custom_instructions", ""),
                question_text=item["question_text"],
                question_latex=item.get("question_latex", ""),
                solution_expression=item.get("correct_answer", ""),
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
                    answer_format=part.get("answer_format", "expression"),
                )

            quiz_problem = QuizProblem.objects.create(
                quiz=quiz,
                problem=problem,
                problem_order=item["problem_order"],
                points=item.get("points", 1.0),
                custom_instructions=item.get("custom_instructions", ""),
                time_limit_override=item.get("time_limit_override"),
                parameter_overrides=item.get("parameter_overrides", {}),
            )
            _create_answer_boxes_for_quiz_problem(quiz_problem, item)

        quiz.calculate_total_points()
        return quiz

    def update(self, instance, validated_data):
        problems_data = validated_data.pop("problems", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if problems_data is not None:
            old_problem_ids = list(
                instance.quiz_problems.values_list("problem_id", flat=True)
            )
            instance.quiz_problems.all().delete()
            from ..problems.models import Problem, ProblemPart
            Problem.objects.filter(id__in=old_problem_ids).delete()

            for item in problems_data:
                figure = item.get("figure", "")
                problem = Problem.objects.create(
                    title=item["title"],
                    description=item.get("custom_instructions", ""),
                    question_text=item["question_text"],
                    question_latex=item.get("question_latex", ""),
                    solution_expression=item.get("correct_answer", ""),
                    author=instance.created_by,
                    supplementary_files=[figure] if figure else [],
                )
                for index, part in enumerate(item.get("parts", [])):
                    ProblemPart.objects.create(
                        problem=problem,
                        part_number=part.get("part_number", index + 1) or index + 1,
                        part_text=part.get("part_text", ""),
                        expected_answer=part.get("expected_answer", ""),
                        points=part.get("points", 1),
                        allow_partial_credit=part.get("allow_partial_credit", True),
                        answer_format=part.get("answer_format", "expression"),
                    )
                quiz_problem = QuizProblem.objects.create(
                    quiz=instance,
                    problem=problem,
                    problem_order=item["problem_order"],
                    points=item.get("points", 1.0),
                    custom_instructions=item.get("custom_instructions", ""),
                    time_limit_override=item.get("time_limit_override"),
                    parameter_overrides=item.get("parameter_overrides", {}),
                )
                _create_answer_boxes_for_quiz_problem(quiz_problem, item)
            instance.calculate_total_points()

        return instance

class QuizProblemSerializer(serializers.ModelSerializer):
    """Serializer for QuizProblem"""
    question_text = serializers.SerializerMethodField()

    class Meta:
        model = QuizProblem
        fields = "__all__"

        extra_fields = ['question_text']

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
            'id',
            'box_number',
            'box_label',
            'placeholder_text',
            'expected_answer',
            'allow_approximation',
            'approximation_tolerance',
            'points',
            'grading_strategy',
            'rubric',
            'feedback_style',
            'case_sensitive',
            'answer_template',  # NEW
            'is_readonly',      # NEW
        ]

class AnswerSubmissionSerializer(serializers.ModelSerializer):
    """Serializer for Answer Submissions"""
    class Meta:
        model = AnswerSubmission
        fields = [
            'id',
            'answer_box',
            'student_answer',
            'is_correct',
            'ai_feedback',
            'feedback',
            'grading_method',
            'confidence',
            'needs_review',
            'grader_trace',
            'raw_ai_response',
            'points_earned',
            'graded_at',
            'submitted_at',
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


def _create_answer_boxes_for_quiz_problem(quiz_problem, item):
    answer_boxes = item.get("answer_boxes") or []
    if answer_boxes:
        for index, box in enumerate(answer_boxes):
            AnswerBox.objects.create(
                quiz_problem=quiz_problem,
                box_number=box.get("box_number", index + 1) or index + 1,
                box_label=box.get("box_label", ""),
                placeholder_text=box.get("placeholder_text", "Enter your answer"),
                expected_answer=box.get("expected_answer", ""),
                allow_approximation=box.get("allow_approximation", False),
                approximation_tolerance=box.get("approximation_tolerance"),
                points=box.get("points", item.get("points", 1.0)),
                grading_strategy=box.get("grading_strategy", "auto"),
                rubric=box.get("rubric", ""),
                feedback_style=box.get("feedback_style", ""),
                case_sensitive=box.get("case_sensitive", False),
            )
        return

    parts = item.get("parts") or []
    if parts:
        for index, part in enumerate(parts):
            AnswerBox.objects.create(
                quiz_problem=quiz_problem,
                box_number=part.get("part_number", index + 1) or index + 1,
                box_label=f"Part {part.get('part_number', index + 1) or index + 1}",
                placeholder_text="Enter your answer",
                expected_answer=part.get("expected_answer", ""),
                points=part.get("points", 1),
                grading_strategy=part.get("grading_strategy", item.get("grading_strategy", "auto")),
                rubric=part.get("rubric", item.get("rubric", "")),
                feedback_style=part.get("feedback_style", item.get("feedback_style", "")),
                case_sensitive=part.get("case_sensitive", item.get("case_sensitive", False)),
            )
        return

    AnswerBox.objects.create(
        quiz_problem=quiz_problem,
        box_number=1,
        box_label="Answer",
        placeholder_text="Enter your answer",
        expected_answer=item.get("correct_answer", ""),
        points=item.get("points", 1.0),
        grading_strategy=item.get("grading_strategy", "auto"),
        rubric=item.get("rubric", ""),
        feedback_style=item.get("feedback_style", ""),
        case_sensitive=item.get("case_sensitive", False),
    )
        

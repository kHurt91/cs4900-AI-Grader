# apps/grading/models.py
from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
import uuid

User = get_user_model()


class GradingEngine(models.Model):
    """
    Configuration for different grading engines (CAS, AI, Hybrid)
    """

    ENGINE_TYPES = (
        ("cas", "Computer Algebra System"),
        ("ai", "Artificial Intelligence"),
        ("hybrid", "CAS + AI Fallback"),
        ("manual", "Manual Grading"),
    )

    name = models.CharField(max_length=100)
    engine_type = models.CharField(max_length=20, choices=ENGINE_TYPES)
    version = models.CharField(max_length=20)
    description = models.TextField(blank=True)

    # Configuration settings
    config_parameters = models.JSONField(default=dict)

    # Performance metrics
    accuracy_rate = models.FloatField(
        default=0.0, validators=[MinValueValidator(0.0), MaxValueValidator(1.0)]
    )
    average_response_time = models.FloatField(default=0.0)  # in seconds

    # Status
    is_active = models.BooleanField(default=True)
    is_default = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "grading_engines"
        verbose_name = "Grading Engine"
        verbose_name_plural = "Grading Engines"
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.get_engine_type_display()})"


class Submission(models.Model):
    """
    Individual student submissions for problems
    """

    SUBMISSION_STATUS = (
        ("pending", "Pending Evaluation"),
        ("grading", "Currently Grading"),
        ("completed", "Grading Completed"),
        ("error", "Grading Error"),
        ("manual_review", "Needs Manual Review"),
    )

    # IDs
    submission_id = models.UUIDField(
        default=uuid.uuid4, unique=True, editable=False, auto_created=True
    )
    student_id = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="submissions"
    )

    # Submission content
    content = models.JSONField(default=dict, help_text="User submission content")

    problem = models.ForeignKey(
        "problems.Problem",
        on_delete=models.CASCADE,
        related_name="submissions",
        null=True,
    )

    quiz = models.ForeignKey(
        "quizzes.Quiz",
        on_delete=models.CASCADE,
        related_name="submissions",
    )

    # Submission content
    student_answer = models.TextField(help_text="Student's answer in LaTeX format")
    raw_input = models.TextField(
        help_text="Original student input before processing", blank=True
    )

    # Problem instance data
    problem_parameters = models.JSONField(
        default=dict,
        help_text="Parameter values used for this specific problem instance",
        blank=True,
    )
    expected_answer = models.TextField(
        help_text="Calculated expected answer for these parameters", blank=True
    )

    # Grading results
    is_correct = models.BooleanField(null=True, blank=True)
    score = models.FloatField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0.0), MaxValueValidator(100.0)],
    )

    # Grading process information
    grading_engine = models.ForeignKey(
        GradingEngine, on_delete=models.SET_NULL, null=True, blank=True
    )
    grading_method = models.CharField(
        max_length=20,
        choices=(
            ("cas_only", "CAS Only"),
            ("ai_only", "AI Only"),
            ("cas_ai_fallback", "CAS with AI Fallback"),
            ("manual", "Manual Review"),
        ),
        default="cas_ai_fallback",
    )

    # Timing information
    submitted_at = models.DateTimeField(auto_now_add=True)
    grading_started_at = models.DateTimeField(null=True, blank=True)
    grading_completed_at = models.DateTimeField(null=True, blank=True)

    # Status and metadata
    status = models.CharField(
        max_length=20, choices=SUBMISSION_STATUS, default="pending"
    )

    # compare with Quiz.max_attempts
    attempt_number = models.PositiveIntegerField(default=1)

    time_spent = models.FloatField(
        null=True, blank=True, help_text="Time spent on problem in seconds"
    )

    # Session information
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    session_key = models.CharField(max_length=40, blank=True)

    class Meta:
        db_table = "submissions"
        verbose_name = "Submission"
        verbose_name_plural = "Submissions"
        ordering = ["-submitted_at"]
        indexes = [
            models.Index(fields=["student_id", "quiz_id"]),
            models.Index(fields=["status", "submitted_at"]),
            models.Index(fields=["grading_engine", "grading_method"]),
        ]

    def __str__(self):
        return f"{self.student_id.username} → {self.quiz.title} (Attempt {self.attempt_number})"

    @property
    def grading_duration(self):
        """Calculate time taken for grading."""
        if self.grading_started_at and self.grading_completed_at:
            return (self.grading_completed_at - self.grading_started_at).total_seconds()
        return None

    def start_grading(self):
        """Mark submission as starting grading process."""
        self.status = "grading"
        self.grading_started_at = timezone.now()
        self.save(update_fields=["status", "grading_started_at"])

    def complete_grading(self, is_correct, score, grading_engine=None):
        """Mark submission as completed with results."""
        self.is_correct = is_correct
        self.score = score
        self.status = "completed"
        self.grading_completed_at = timezone.now()
        if grading_engine:
            self.grading_engine = grading_engine
        self.save(
            update_fields=[
                "is_correct",
                "score",
                "status",
                "grading_completed_at",
                "grading_engine",
            ]
        )


# class StudentSubmission(models.Model):
#     """
#     Individual student submissions for problems
#     """

#     SUBMISSION_STATUS = (
#         ("pending", "Pending Evaluation"),
#         ("grading", "Currently Grading"),
#         ("completed", "Grading Completed"),
#         ("error", "Grading Error"),
#         ("manual_review", "Needs Manual Review"),
#     )

#     # Basic information
#     submission_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
#     student = models.ForeignKey(
#         User, on_delete=models.CASCADE, related_name="submissions"
#     )
#     problem = models.ForeignKey(
#         "problems.Problem", on_delete=models.CASCADE, related_name="submissions"
#     )

#     # Submission content
#     student_answer = models.TextField(help_text="Student's answer in LaTeX format")
#     raw_input = models.TextField(help_text="Original student input before processing")

#     # Problem instance data
#     problem_parameters = models.JSONField(
#         default=dict,
#         help_text="Parameter values used for this specific problem instance",
#     )
#     expected_answer = models.TextField(
#         help_text="Calculated expected answer for these parameters"
#     )

#     # Grading results
#     is_correct = models.BooleanField(null=True, blank=True)
#     score = models.FloatField(
#         null=True,
#         blank=True,
#         validators=[MinValueValidator(0.0), MaxValueValidator(100.0)],
#     )
#     partial_credit = models.FloatField(
#         default=0.0, validators=[MinValueValidator(0.0), MaxValueValidator(100.0)]
#     )

#     # Grading process information
#     grading_engine = models.ForeignKey(
#         GradingEngine, on_delete=models.SET_NULL, null=True, blank=True
#     )
#     grading_method = models.CharField(
#         max_length=20,
#         choices=(
#             ("cas_only", "CAS Only"),
#             ("ai_only", "AI Only"),
#             ("cas_ai_fallback", "CAS with AI Fallback"),
#             ("manual", "Manual Review"),
#         ),
#         default="cas_ai_fallback",
#     )

#     # Timing information
#     submitted_at = models.DateTimeField(auto_now_add=True)
#     grading_started_at = models.DateTimeField(null=True, blank=True)
#     grading_completed_at = models.DateTimeField(null=True, blank=True)

#     # Status and metadata
#     status = models.CharField(
#         max_length=20, choices=SUBMISSION_STATUS, default="pending"
#     )
#     attempt_number = models.PositiveIntegerField(default=1)
#     time_spent = models.FloatField(
#         null=True, blank=True, help_text="Time spent on problem in seconds"
#     )

#     # Session information
#     ip_address = models.GenericIPAddressField(null=True, blank=True)
#     user_agent = models.TextField(blank=True)
#     session_key = models.CharField(max_length=40, blank=True)

#     class Meta:
#         db_table = "student_submissions"
#         verbose_name = "Student Submission"
#         verbose_name_plural = "Student Submissions"
#         ordering = ["-submitted_at"]
#         indexes = [
#             models.Index(fields=["student", "problem"]),
#             models.Index(fields=["status", "submitted_at"]),
#             models.Index(fields=["grading_engine", "grading_method"]),
#         ]

#     def __str__(self):
#         return f"{self.student.username} → {self.problem.title} (Attempt {self.attempt_number})"

#     @property
#     def grading_duration(self):
#         """Calculate time taken for grading."""
#         if self.grading_started_at and self.grading_completed_at:
#             return (self.grading_completed_at - self.grading_started_at).total_seconds()
#         return None

#     def start_grading(self):
#         """Mark submission as starting grading process."""
#         self.status = "grading"
#         self.grading_started_at = timezone.now()
#         self.save(update_fields=["status", "grading_started_at"])

#     def complete_grading(self, is_correct, score, grading_engine=None):
#         """Mark submission as completed with results."""
#         self.is_correct = is_correct
#         self.score = score
#         self.status = "completed"
#         self.grading_completed_at = timezone.now()
#         if grading_engine:
#             self.grading_engine = grading_engine
#         self.save(
#             update_fields=[
#                 "is_correct",
#                 "score",
#                 "status",
#                 "grading_completed_at",
#                 "grading_engine",
#             ]
#         )


# class SubmissionPart(models.Model):
#     """
#     Individual parts of multi-part problem submissions
#     """

#     submission = models.ForeignKey(
#         StudentSubmission, on_delete=models.CASCADE, related_name="parts"
#     )
#     problem_part = models.ForeignKey("problems.ProblemPart", on_delete=models.CASCADE)

#     # Part-specific answer
#     student_answer = models.TextField(help_text="Student answer for this part")
#     expected_answer = models.TextField(help_text="Expected answer for this part")

#     # Part-specific grading
#     is_correct = models.BooleanField(null=True, blank=True)
#     score = models.FloatField(
#         null=True,
#         blank=True,
#         validators=[MinValueValidator(0.0), MaxValueValidator(100.0)],
#     )

#     # Feedback
#     feedback_message = models.TextField(blank=True)

#     created_at = models.DateTimeField(auto_now_add=True)

#     class Meta:
#         db_table = "submission_parts"
#         verbose_name = "Submission Part"
#         verbose_name_plural = "Submission Parts"
#         unique_together = ["submission", "problem_part"]
#         ordering = ["problem_part__part_number"]

#     def __str__(self):
#         return f"{self.submission} - Part {self.problem_part.part_number}"


class GradingResult(models.Model):
    """
    Detailed grading results and feedback
    """

    submission = models.OneToOneField(
        Submission, on_delete=models.CASCADE, related_name="result"
    )
    # Detailed grading information
    cas_result = models.JSONField(
        null=True, blank=True, help_text="Results from CAS evaluation"
    )
    ai_result = models.TextField(
        null=True, blank=True, help_text="Results from AI evaluation"
    )

    # Equivalency checking details
    equivalency_steps = models.JSONField(
        default=list,
        help_text="Step-by-step equivalency checking process",
        blank=True,
        null=True,
    )

    # Feedback generation
    feedback_message = models.TextField(blank=True)
    hint_message = models.TextField(blank=True)
    solution_steps = models.JSONField(default=list, blank=True)

    # Confidence scores
    cas_confidence = models.FloatField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)],
    )
    ai_confidence = models.FloatField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)],
    )

    # Performance metrics
    processing_time = models.FloatField(
        help_text="Total processing time in seconds", blank=True, null=True
    )
    memory_usage = models.FloatField(
        null=True, blank=True, help_text="Peak memory usage in MB"
    )

    # Review status
    needs_review = models.BooleanField(default=False)
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_submissions",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "grading_results"
        verbose_name = "Grading Result"
        verbose_name_plural = "Grading Results"

    def __str__(self):
        return f"Result for {self.submission}"

# apps/quizzes/models.py
from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from datetime import timedelta
import uuid

User = get_user_model()


class Course(models.Model):
    """
    Academic courses that contain quizzes and assignments
    """

    # Course identification
    course_code = models.CharField(
        max_length=20, help_text="e.g., MATH 1220, ENGR 2130"
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    # Academic term
    semester = models.CharField(
        max_length=20,
        choices=(
            ("fall", "Fall"),
            ("winter", "Winter"),
            ("spring", "Spring"),
            ("summer", "Summer"),
        ),
    )
    year = models.PositiveIntegerField()

    # Course management
    instructor = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="taught_courses",
        limit_choices_to={"role": "instructor"},
    )
    teaching_assistants = models.ManyToManyField(
        User,
        blank=True,
        related_name="assisted_courses",
        limit_choices_to={"role__in": ["instructor", "admin"]},
    )

    # Enrollment
    enrolled_students = models.ManyToManyField(
        User,
        blank=True,
        through="CourseEnrollment",
        related_name="enrolled_courses",
        limit_choices_to={"role": "student"},
    )

    # Course settings
    is_active = models.BooleanField(default=True)
    allow_late_submissions = models.BooleanField(default=True)
    late_penalty_percent = models.FloatField(
        default=10.0, validators=[MinValueValidator(0.0), MaxValueValidator(100.0)]
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "courses"
        verbose_name = "Course"
        verbose_name_plural = "Courses"
        unique_together = ["course_code", "semester", "year", "instructor"]
        ordering = ["-year", "-semester", "course_code"]

    def __str__(self):
        return (
            f"{self.course_code} - {self.title} ({self.semester.title()} {self.year})"
        )

    @property
    def enrollment_count(self):
        """Get number of enrolled students."""
        return self.enrolled_students.count()


class CourseEnrollment(models.Model):
    """
    Student enrollment in courses with additional metadata
    """

    student = models.ForeignKey(User, on_delete=models.CASCADE)
    course = models.ForeignKey(Course, on_delete=models.CASCADE)

    # Enrollment details
    enrollment_date = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    # Academic standing
    current_grade = models.CharField(max_length=5, blank=True)  # A, B+, C-, etc.
    grade_percentage = models.FloatField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0.0), MaxValueValidator(100.0)],
    )

    class Meta:
        db_table = "course_enrollments"
        verbose_name = "Course Enrollment"
        verbose_name_plural = "Course Enrollments"
        unique_together = ["student", "course"]

    def __str__(self):
        return f"{self.student.username} → {self.course.course_code}"


class Quiz(models.Model):
    """
    Quizzes containing multiple mathematical problems
    """

    QUIZ_TYPES = (
        ("practice", "Practice Quiz"),
        ("homework", "Homework Assignment"),
        ("exam", "Examination"),
        ("quiz", "Graded Quiz"),
    )

    # Basic information
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="quizzes")
    quiz_type = models.CharField(max_length=20, choices=QUIZ_TYPES, default="quiz")

    # Quiz configuration
    problems = models.ManyToManyField(
        "problems.Problem", through="QuizProblem", related_name="quizzes"
    )

    # Timing settings
    time_limit = models.PositiveIntegerField(
        null=True, blank=True, help_text="Time limit in minutes (null for no limit)"
    )
    available_from = models.DateTimeField(help_text="When quiz becomes available")
    available_until = models.DateTimeField(help_text="When quiz becomes unavailable")

    # Attempt settings
    max_attempts = models.PositiveIntegerField(
        default=1, validators=[MinValueValidator(1), MaxValueValidator(10)]
    )
    allow_review = models.BooleanField(
        default=True, help_text="Allow students to review after submission"
    )
    show_correct_answers = models.BooleanField(default=True)
    show_solution_after = models.DateTimeField(null=True, blank=True)

    # Randomization settings
    randomize_problems = models.BooleanField(default=False)
    randomize_parameters = models.BooleanField(default=True)

    # Grading settings
    total_points = models.FloatField(default=0.0)
    passing_score = models.FloatField(
        default=70.0, validators=[MinValueValidator(0.0), MaxValueValidator(100.0)]
    )

    # Security settings
    require_password = models.BooleanField(default=False)
    password = models.CharField(max_length=50, blank=True)
    ip_restrictions = models.TextField(
        blank=True, help_text="Comma-separated IP addresses or ranges"
    )

    # Status
    is_published = models.BooleanField(default=False)
    is_practice_mode = models.BooleanField(default=False)

    # Authoring information
    created_by = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="created_quizzes"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "quizzes"
        verbose_name = "Quiz"
        verbose_name_plural = "Quizzes"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["course", "is_published"]),
            models.Index(fields=["available_from", "available_until"]),
        ]

    def __str__(self):
        return f"{self.title} ({self.course.course_code})"

    def is_available(self):
        """Check if quiz is currently available."""
        now = timezone.now()
        return self.is_published and self.available_from <= now <= self.available_until

    def time_remaining(self):
        """Get time remaining until quiz closes."""
        if not self.available_until:
            return None
        now = timezone.now()
        if now > self.available_until:
            return timedelta(0)
        return self.available_until - now

    def calculate_total_points(self):
        """Calculate total points for all problems in quiz."""
        total = sum(qp.points for qp in self.quiz_problems.all())
        if total != self.total_points:
            self.total_points = total
            self.save(update_fields=["total_points"])
        return total


class QuizProblem(models.Model):
    """
    Many-to-many relationship between quizzes and problems with additional settings
    """

    quiz = models.ForeignKey(
        Quiz, on_delete=models.CASCADE, related_name="quiz_problems"
    )
    problem = models.ForeignKey("problems.Problem", on_delete=models.CASCADE)

    # Problem configuration within quiz
    problem_order = models.PositiveIntegerField()
    points = models.FloatField(default=1.0, validators=[MinValueValidator(0.1)])

    # Problem-specific overrides
    custom_instructions = models.TextField(blank=True)
    time_limit_override = models.PositiveIntegerField(null=True, blank=True)

    # Variable parameter overrides
    parameter_overrides = models.JSONField(
        default=dict,
        blank=True,
        help_text="Override default parameter ranges for this quiz",
    )

    @property
    def question_text(self):
        return self.problem.question_text

    class Meta:
        db_table = "quiz_problems"
        verbose_name = "Quiz Problem"
        verbose_name_plural = "Quiz Problems"
        unique_together = ["quiz", "problem"]
        ordering = ["quiz", "problem_order"]

    def __str__(self):
        return f"{self.quiz.title} - {self.problem.title} (#{self.problem_order})"


class QuizAttempt(models.Model):
    """
    Individual student attempts at quizzes
    """

    ATTEMPT_STATUS = (
        ("in_progress", "In Progress"),
        ("submitted", "Submitted"),
        ("auto_submitted", "Auto-submitted (Time Expired)"),
        ("abandoned", "Abandoned"),
        ("grading", "Being Graded"),
        ("completed", "Grading Complete"),
    )

    # Basic information
    attempt_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    student = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="quiz_attempts"
    )
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="attempts")

    # Attempt tracking
    attempt_number = models.PositiveIntegerField()
    status = models.CharField(
        max_length=20, choices=ATTEMPT_STATUS, default="in_progress"
    )

    # Timing information
    started_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    time_spent = models.PositiveIntegerField(
        default=0, help_text="Time spent in seconds"
    )

    # Scoring
    raw_score = models.FloatField(null=True, blank=True)
    percentage_score = models.FloatField(null=True, blank=True)
    is_passing = models.BooleanField(null=True, blank=True)

    # Problem randomization for this attempt
    problem_order = models.JSONField(
        default=list, help_text="Randomized problem order for this attempt"
    )
    problem_parameters = models.JSONField(
        default=dict, help_text="Generated parameters for each problem"
    )

    # Security and session information
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    session_data = models.JSONField(default=dict, blank=True)

    # Proctoring information (for future use)
    proctoring_data = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "quiz_attempts"
        verbose_name = "Quiz Attempt"
        verbose_name_plural = "Quiz Attempts"
        unique_together = ["student", "quiz", "attempt_number"]
        ordering = ["-started_at"]
        indexes = [
            models.Index(fields=["student", "quiz"]),
            models.Index(fields=["status", "started_at"]),
        ]

    def __str__(self):
        return f"{self.student.username} → {self.quiz.title} (Attempt #{self.attempt_number})"

    @property
    def is_active(self):
        """Check if attempt is still active."""
        return self.status == "in_progress"

    @property
    def time_remaining(self):
        """Calculate time remaining for this attempt."""
        if not self.quiz.time_limit or self.status != "in_progress":
            return None

        elapsed = (timezone.now() - self.started_at).total_seconds()
        remaining = (self.quiz.time_limit * 60) - elapsed
        return max(0, remaining)

    def submit_attempt(self):
        """Mark attempt as submitted and start grading."""
        self.status = "submitted"
        self.submitted_at = timezone.now()
        self.time_spent = (self.submitted_at - self.started_at).total_seconds()
        self.save(update_fields=["status", "submitted_at", "time_spent"])

    def calculate_score(self):
        """Calculate final score based on all submissions."""
        from apps.grading.models import StudentSubmission

        submissions = StudentSubmission.objects.filter(
            student=self.student,
            problem__in=self.quiz.problems.all(),
            submitted_at__gte=self.started_at,
        )

        if self.submitted_at:
            submissions = submissions.filter(submitted_at__lte=self.submitted_at)

        total_points = 0
        earned_points = 0

        for submission in submissions:
            quiz_problem = QuizProblem.objects.get(
                quiz=self.quiz, problem=submission.problem
            )
            total_points += quiz_problem.points
            if submission.score is not None:
                earned_points += (submission.score / 100) * quiz_problem.points

        if total_points > 0:
            self.raw_score = earned_points
            self.percentage_score = (earned_points / total_points) * 100
            self.is_passing = self.percentage_score >= self.quiz.passing_score
            self.save(update_fields=["raw_score", "percentage_score", "is_passing"])

        return self.percentage_score


class QuizStatistics(models.Model):
    """
    Statistical summary for quiz performance
    """

    quiz = models.OneToOneField(
        Quiz, on_delete=models.CASCADE, related_name="statistics"
    )

    # Participation metrics
    total_attempts = models.PositiveIntegerField(default=0)
    unique_students = models.PositiveIntegerField(default=0)
    completed_attempts = models.PositiveIntegerField(default=0)

    # Performance metrics
    average_score = models.FloatField(default=0.0)
    median_score = models.FloatField(default=0.0)
    highest_score = models.FloatField(default=0.0)
    lowest_score = models.FloatField(default=0.0)
    standard_deviation = models.FloatField(default=0.0)

    # Time metrics
    average_completion_time = models.FloatField(default=0.0)  # in minutes
    median_completion_time = models.FloatField(default=0.0)

    # Grade distribution
    grade_distribution = models.JSONField(
        default=dict, help_text="Grade distribution: {'A': count, 'B': count, ...}"
    )

    # Last calculated
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "quiz_statistics"
        verbose_name = "Quiz Statistics"
        verbose_name_plural = "Quiz Statistics"

    def __str__(self):
        return f"Stats for {self.quiz.title}"

    @property
    def pass_rate(self):
        """Calculate percentage of students who passed."""
        if self.completed_attempts == 0:
            return 0.0
        passing_count = QuizAttempt.objects.filter(
            quiz=self.quiz, is_passing=True, status="completed"
        ).count()
        return (passing_count / self.completed_attempts) * 100

class AnswerBox(models.Model):
    """Individual answer box within a problem (for multi-box problems like Problem 8.3)"""
    GRADING_STRATEGIES = (
        ("auto", "Auto-detect"),
        ("exact", "Exact Match"),
        ("numeric", "Numeric"),
        ("symbolic", "Symbolic"),
        ("ai", "AI"),
        ("hybrid", "Hybrid"),
        ("manual", "Manual Review"),
    )

    quiz_problem = models.ForeignKey(
        QuizProblem, on_delete=models.CASCADE, related_name="answer_boxes"
    )
    box_number = models.PositiveIntegerField()
    box_label = models.CharField(max_length=100, blank=True)
    placeholder_text = models.CharField(max_length=200, blank=True)
    expected_answer = models.TextField()  # Professor's solution in LaTeX
    allow_approximation = models.BooleanField(default=False)
    approximation_tolerance = models.FloatField(null=True, blank=True)
    points = models.FloatField(default=1.0)
    grading_strategy = models.CharField(
        max_length=20,
        choices=GRADING_STRATEGIES,
        default="auto",
        help_text="How this answer box should be graded.",
    )
    rubric = models.TextField(blank=True)
    feedback_style = models.CharField(max_length=50, blank=True)
    case_sensitive = models.BooleanField(default=False)
    
    # NEW FIELD: Template showing equation structure with [BLANK] for fill-in parts
    answer_template = models.TextField(blank=True, help_text="LaTeX template with [BLANK] markers, e.g., '\\Omega_p = \\int [BLANK] d\\Omega'")
    
    # NEW FIELD: Mark as read-only (for "is given" answers)
    is_readonly = models.BooleanField(default=False, help_text="If true, show answer but don't allow editing")
    
    class Meta:
        db_table = 'answer_boxes'
        verbose_name = 'Answer Box'
        verbose_name_plural = 'Answer Boxes'
        ordering = ['box_number']
        unique_together = ['quiz_problem', 'box_number']
    
    def __str__(self):
        return f"{self.quiz_problem} - Box #{self.box_number}"


class AnswerSubmission(models.Model):
    #"""Student's answer to a specific answer box"""
    attempt = models.ForeignKey(
    QuizAttempt, on_delete=models.CASCADE, related_name="answer_submissions"
    )
    answer_box = models.ForeignKey(AnswerBox, on_delete=models.CASCADE)
    student_answer = models.TextField()  # Student's answer in LaTeX or text
    is_correct = models.BooleanField(null=True, blank=True)
    ai_feedback = models.TextField(blank=True)  # Feedback from Claude/GPT
    feedback = models.TextField(blank=True)
    grading_method = models.CharField(max_length=20, blank=True)
    confidence = models.FloatField(default=0.0)
    needs_review = models.BooleanField(default=False)
    grader_trace = models.JSONField(default=dict, blank=True)
    raw_ai_response = models.TextField(blank=True)
    points_earned = models.FloatField(default=0.0)
    graded_at = models.DateTimeField(null=True, blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'answer_submissions'
        verbose_name = 'Answer Submission'
        verbose_name_plural = 'Answer Submissions'
        unique_together = ['attempt', 'answer_box']
        ordering = ['submitted_at']
    
    def __str__(self):
        return f"{self.attempt.student.username} - Box #{self.answer_box.box_number}"
    

"""
Assignment Management Models
"""

from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta

User = get_user_model()


class Assignment(models.Model):
    """
    Assignment (Homework, Quiz, or Exam) that contains multiple problems
    """

    # Basic Information
    name = models.CharField(
        max_length=200, help_text="e.g., 'HW#1: Boolean Algebra' or 'Midterm Exam'"
    )
    description = models.TextField(blank=True)

    # Assignment Type
    ASSIGNMENT_TYPES = [
        ("homework", "Homework"),
        ("quiz", "Quiz"),
        ("exam", "Exam"),
    ]
    assignment_type = models.CharField(
        max_length=20, choices=ASSIGNMENT_TYPES, default="homework"
    )

    # Scheduling
    open_date = models.DateTimeField(help_text="When students can start the assignment")
    due_date = models.DateTimeField(help_text="Deadline for submission")
    reveal_date = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When to reveal results. Leave blank for default.",
    )

    # Late Submission Policy
    allow_late = models.BooleanField(default=False)
    late_penalty_percent = models.IntegerField(default=10)
    max_late_days = models.IntegerField(default=7)

    # Attempt Policy
    max_attempts = models.IntegerField(null=True, blank=True)

    # Results Display
    show_score_immediately = models.BooleanField(default=False)
    show_correct_answer = models.BooleanField(default=False)
    show_feedback = models.BooleanField(default=True)

    # Problems
    problem_templates = models.ManyToManyField(
        "problems.ProblemTemplate", related_name="assignments", blank=True
    )
    randomize_order = models.BooleanField(default=False)

    # Total Points
    total_points = models.DecimalField(max_digits=6, decimal_places=2, default=100)

    # Metadata
    created_by = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="created_assignments"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "assignments"
        verbose_name = "Assignment"
        verbose_name_plural = "Assignments"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name}"

    def is_open(self):
        """Check if assignment is currently available"""
        now = timezone.now()
        return self.open_date <= now <= self.due_date

    def is_past_due(self):
        """Check if assignment deadline has passed"""
        return timezone.now() > self.due_date

    def can_submit(self):
        """Check if students can still submit"""
        if not self.is_past_due():
            return True
        return self.allow_late

    def can_reveal_results(self):
        """Check if results can be shown to students"""
        if self.show_score_immediately:
            return True

        if self.reveal_date:
            return timezone.now() >= self.reveal_date

        return self.is_past_due()

    def generate_instances_for_student(self, student):
        """Generate all problem instances for a student"""
        from apps.problems.models import ProblemInstance

        instances = []
        for template in self.problem_templates.all():
            instance = template.generate_instance(student, self)
            instances.append(instance)

        return instances

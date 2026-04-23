"""
ProblemInstance model for student-specific problem instances
"""

from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class ProblemInstance(models.Model):
    """
    Specific instance of a problem template for a student.
    Each student gets unique parameter values.
    """

    template = models.ForeignKey(
        "ProblemTemplate", on_delete=models.CASCADE, related_name="instances"
    )
    student = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="problem_instances"
    )
    assignment = models.ForeignKey(
        "assignments.Assignment",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="problem_instances",
    )

    # Generated Data
    parameter_values = models.JSONField(
        default=dict, help_text="Actual parameter values for this instance"
    )
    rendered_text = models.TextField(help_text="Problem text with values filled in")
    expected_answer = models.TextField(
        help_text="Calculated correct answer for this instance"
    )

    # Metadata
    generated_at = models.DateTimeField(auto_now_add=True)
    seed = models.IntegerField(
        null=True, blank=True, help_text="Random seed for reproducibility"
    )

    class Meta:
        db_table = "problem_instances"
        verbose_name = "Problem Instance"
        verbose_name_plural = "Problem Instances"
        unique_together = ["template", "student", "assignment"]
        ordering = ["-generated_at"]

    def __str__(self):
        return f"{self.template.name} - {self.student.username}"

    def get_parameter_display(self):
        """Get human-readable parameter values"""
        display = []
        template_data = self.template.template_data
        template_params = template_data.get("parameters", {})

        for param_name, value in self.parameter_values.items():
            param_def = template_params.get(param_name, {})
            display_name = param_def.get("name", param_name)
            unit = param_def.get("unit", "")
            display.append(f"{display_name}: {value} {unit}".strip())

        return ", ".join(display)

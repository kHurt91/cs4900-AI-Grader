# Generated manually for hybrid per-answer-box grading.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("quizzes", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="answerbox",
            name="case_sensitive",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="answerbox",
            name="feedback_style",
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.AddField(
            model_name="answerbox",
            name="grading_strategy",
            field=models.CharField(
                choices=[
                    ("auto", "Auto-detect"),
                    ("exact", "Exact Match"),
                    ("numeric", "Numeric"),
                    ("symbolic", "Symbolic"),
                    ("ai", "AI"),
                    ("hybrid", "Hybrid"),
                    ("manual", "Manual Review"),
                ],
                default="auto",
                help_text="How this answer box should be graded.",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="answerbox",
            name="rubric",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="answersubmission",
            name="confidence",
            field=models.FloatField(default=0.0),
        ),
        migrations.AddField(
            model_name="answersubmission",
            name="feedback",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="answersubmission",
            name="grader_trace",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name="answersubmission",
            name="grading_method",
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.AddField(
            model_name="answersubmission",
            name="needs_review",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="answersubmission",
            name="raw_ai_response",
            field=models.TextField(blank=True),
        ),
    ]

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.quizzes.models import Course, Quiz, QuizProblem, AnswerBox
from apps.problems.models import Problem
from django.utils import timezone
from datetime import timedelta

User = get_user_model()


class Command(BaseCommand):
    help = "Create Problem 8.4 CORRECT - 1 question, 4 attempts allowed"

    def handle(self, *args, **options):
        instructor, _ = User.objects.get_or_create(
            username="instructor",
            defaults={
                "email": "instructor@example.com",
                "role": "instructor",
                "first_name": "Test",
                "last_name": "Instructor",
            },
        )
        if not instructor.check_password("password123"):
            instructor.set_password("password123")
            instructor.save()

        course = Course.objects.get(
            course_code="ECE5950", semester="spring", year=2026, instructor=instructor
        )

        # Delete old quiz if exists
        old_quiz = Quiz.objects.filter(
            title="Problem 8.4 - Beam Pattern Derivation", course=course
        ).first()
        if old_quiz:
            old_quiz.delete()

        # Create quiz with max_attempts = 4 (SPONSOR REQUIREMENT)
        quiz = Quiz.objects.create(
            title="Problem 8.4 - Beam Pattern Derivation",
            course=course,
            description="Multi-step derivation. Students can attempt 4 times.",
            quiz_type="homework",
            time_limit=60,
            available_from=timezone.now(),
            available_until=timezone.now() + timedelta(days=30),
            max_attempts=4,  # CHANGED: 4 attempts instead of 10
            show_correct_answers=True,
            is_published=True,
            created_by=instructor,
            total_points=25.0,  # CHANGED: 25 points (5 steps × 5 points)
        )

        # Create ONE problem with all 5 steps (NOT 4 questions!)
        problem = Problem.objects.create(
            title="Beam Pattern Derivation",
            difficulty="advanced",
            author=instructor,
            question_text="""Complete the derivation steps indicated below to show that

Ωₚ = 4π/Dₘₐₓ

where Ωₚ is the antenna beam pattern and Dₘₐₓ is the directivity.

1. Write the definition for Ωₚ, in terms of Pₙ(θ,φ):

[ANSWER_BOX_1]

2. Express the integrand in step 1 in terms of P(R,θ,φ):

[ANSWER_BOX_2]

3. Express Ωₚ now in terms of U(Ω):

[ANSWER_BOX_3]

4. Express the integral in step 3 as two fractions as shown:

(−)∫[U(Ω)/U₀]dΩ

[ANSWER_BOX_4]

5. Apply the directivity relationships to give the following integral form:

[ANSWER_BOX_5]

This integral then evaluates to give the final form desired.""",
            solution_expression="",
            solution_explanation="Progressive learning through multiple attempts",
        )

        # Create ONE quiz problem (not 4!)
        qp = QuizProblem.objects.create(
            quiz=quiz, problem=problem, problem_order=1, points=25.0
        )

        # Create 5 answer boxes (one for each step)
        AnswerBox.objects.create(
            quiz_problem=qp,
            box_number=1,
            box_label="Ωₚ = ",
            expected_answer=r"\int P_n(\theta,\phi) \, d\Omega",
            points=5.0,
        )
        AnswerBox.objects.create(
            quiz_problem=qp,
            box_number=2,
            box_label="Ωₚ = ",
            expected_answer=r"\int \frac{P(R,\theta,\phi)}{P_{\max}} \, d\Omega",
            points=5.0,
        )
        AnswerBox.objects.create(
            quiz_problem=qp,
            box_number=3,
            box_label="Ωₚ = ",
            expected_answer=r"\int \frac{U(\Omega)}{U_{\max}} \, d\Omega",
            points=5.0,
        )
        AnswerBox.objects.create(
            quiz_problem=qp,
            box_number=4,
            box_label="Ωₚ = ",
            expected_answer=r"\frac{U_{\max}}{U_0} \int \frac{U(\Omega)}{U_{\max}} \, d\Omega",
            points=5.0,
        )
        AnswerBox.objects.create(
            quiz_problem=qp,
            box_number=5,
            box_label="Ωₚ = ",
            expected_answer=r"\frac{4\pi}{D_{\max}}",
            points=5.0,
        )

        self.stdout.write(self.style.SUCCESS("\n=== Problem 8.4 CORRECTED ==="))
        self.stdout.write(f"Quiz ID: {quiz.id}")
        self.stdout.write(f"Questions: 1 (with 5 steps)")
        self.stdout.write(f"Answer boxes: 5")
        self.stdout.write(f"Max attempts: 4")
        self.stdout.write(f"Total points: 25")

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.quizzes.models import Course, Quiz, QuizProblem, AnswerBox
from apps.problems.models import Problem
from django.utils import timezone
from datetime import timedelta

User = get_user_model()


class Command(BaseCommand):
    help = "Create Problem 8.3 CORRECT - 1 question, 7 attempts allowed"

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

        course, _ = Course.objects.get_or_create(
            course_code="ECE5950",
            semester="spring",
            year=2026,
            instructor=instructor,
            defaults={
                "title": "Telecommunications",
                "description": "Advanced Telecommunications Course",
            },
        )

        # Delete old Problem 8.3 if exists
        old_quiz = Quiz.objects.filter(
            title="Problem 8.3 - Antenna Definitions", course=course
        ).first()
        if old_quiz:
            old_quiz.delete()

        # Create the corrected quiz - 1 question, 7 attempts
        quiz = Quiz.objects.create(
            title="Problem 8.3 - Antenna Definitions",
            course=course,
            description="Single-step question with 2 answer boxes. Students can attempt 7 times.",
            quiz_type="homework",
            time_limit=30,
            available_from=timezone.now(),
            available_until=timezone.now() + timedelta(days=30),
            max_attempts=7,  # SPONSOR REQUIREMENT: 7 attempts
            show_correct_answers=True,
            is_published=True,
            created_by=instructor,
            total_points=10.0,
        )

        # Create ONE problem (not 6!)
        problem = Problem.objects.create(
            title="Antenna Definitions",
            difficulty="intermediate",
            author=instructor,
            question_text="""Write expressions for the following antenna relationships in Chapter 8. Note: for power density terms, irradiance P is [W/m²] while intensity U is [W/rad²]. Also, write any multiple integrals just as a single integral.

1. Antenna beam pattern Ωₚ in terms of normalized irradiance Pₙ(θ,φ)

[ANSWER_BOX_1]

2. Average radiation intensity U₀ in terms of radiated power Wᵣ

[ANSWER_BOX_2]""",
            solution_expression="",
            solution_explanation="Students learn through multiple attempts",
        )

        qp = QuizProblem.objects.create(
            quiz=quiz, problem=problem, problem_order=1, points=10.0
        )

        # Create 2 answer boxes (always the same boxes for each attempt)
        AnswerBox.objects.create(
            quiz_problem=qp,
            box_number=1,
            box_label="Ωₚ = ",
            placeholder_text="Enter your LaTeX expression",
            expected_answer=r"\int P_n(\theta,\phi) \, d\Omega",
            points=5.0,
        )

        AnswerBox.objects.create(
            quiz_problem=qp,
            box_number=2,
            box_label="U₀ = ",
            placeholder_text="Enter your LaTeX expression",
            expected_answer=r"\frac{W_r}{4\pi}",
            points=5.0,
        )

        self.stdout.write(self.style.SUCCESS("\n=== Problem 8.3 CORRECTED ==="))
        self.stdout.write(f"Quiz ID: {quiz.id}")
        self.stdout.write(f"Questions: 1")
        self.stdout.write(f"Answer boxes: 2")
        self.stdout.write(f"Max attempts: 7")
        self.stdout.write(f"Total points: 10")

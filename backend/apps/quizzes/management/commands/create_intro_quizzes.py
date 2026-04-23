from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.quizzes.models import Course, Quiz, QuizProblem, AnswerBox
from apps.problems.models import Problem
from django.utils import timezone
from datetime import timedelta

User = get_user_model()


class Command(BaseCommand):
    help = "Create Introduction to ECE quizzes with answer boxes"

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
            course_code="ECE1234",
            semester="fall",
            year=2024,
            instructor=instructor,
            defaults={
                "title": "Introduction to ECE",
                "description": "Introduction to Electrical and Computer Engineering",
            },
        )

        # Delete old quizzes and problems for this course
        Quiz.objects.filter(course=course).delete()

        # QUIZ 1: Week 1 Quiz
        quiz1, _ = Quiz.objects.get_or_create(
            title="Week 1 Quiz",
            course=course,
            defaults={
                "description": "Basic math problems",
                "quiz_type": "quiz",
                "time_limit": 30,
                "available_from": timezone.now(),
                "available_until": timezone.now() + timedelta(days=30),
                "max_attempts": 3,
                "show_correct_answers": True,
                "is_published": True,
                "created_by": instructor,
                "total_points": 10.0,
            },
        )

        # Problem 1: Addition
        p1 = Problem.objects.create(
            title="Addition Problem",
            difficulty="beginner",
            author=instructor,
            question_text="""What is 2 + 2?

[ANSWER_BOX_1]""",
            solution_expression="4",
            solution_explanation="2 + 2 = 4",
        )
        qp1 = QuizProblem.objects.create(
            quiz=quiz1, problem=p1, problem_order=1, points=5.0
        )
        AnswerBox.objects.create(
            quiz_problem=qp1,
            box_number=1,
            box_label="Answer: ",
            expected_answer="4",
            points=5.0,
        )

        # Problem 2: Square Root
        p2 = Problem.objects.create(
            title="Square Root Problem",
            difficulty="beginner",
            author=instructor,
            question_text="""What is the square root of 16?

[ANSWER_BOX_1]""",
            solution_expression="4",
            solution_explanation="√16 = 4",
        )
        qp2 = QuizProblem.objects.create(
            quiz=quiz1, problem=p2, problem_order=2, points=5.0
        )
        AnswerBox.objects.create(
            quiz_problem=qp2,
            box_number=1,
            box_label="Answer: ",
            expected_answer="4",
            points=5.0,
        )

        self.stdout.write(self.style.SUCCESS(f"Created Quiz 1: {quiz1.title}"))

        # QUIZ 2: Midterm Quiz
        quiz2, _ = Quiz.objects.get_or_create(
            title="Midterm Quiz",
            course=course,
            defaults={
                "description": "Midterm exam covering algebra and calculus",
                "quiz_type": "exam",
                "time_limit": 60,
                "available_from": timezone.now(),
                "available_until": timezone.now() + timedelta(days=30),
                "max_attempts": 1,
                "show_correct_answers": False,
                "is_published": True,
                "created_by": instructor,
                "total_points": 10.0,
            },
        )

        # Problem 1: Algebra
        p3 = Problem.objects.create(
            title="Algebra Problem",
            difficulty="intermediate",
            author=instructor,
            question_text="""Solve for x: 2x + 5 = 15

[ANSWER_BOX_1]""",
            solution_expression="x = 5",
            solution_explanation="2x + 5 = 15, 2x = 10, x = 5",
        )
        qp3 = QuizProblem.objects.create(
            quiz=quiz2, problem=p3, problem_order=1, points=5.0
        )
        AnswerBox.objects.create(
            quiz_problem=qp3,
            box_number=1,
            box_label="x = ",
            expected_answer="5",
            points=5.0,
        )

        # Problem 2: Calculus
        p4 = Problem.objects.create(
            title="Calculus Problem",
            difficulty="intermediate",
            author=instructor,
            question_text="""What is the derivative of x²?

[ANSWER_BOX_1]""",
            solution_expression="2x",
            solution_explanation="d/dx(x²) = 2x",
        )
        qp4 = QuizProblem.objects.create(
            quiz=quiz2, problem=p4, problem_order=2, points=5.0
        )
        AnswerBox.objects.create(
            quiz_problem=qp4,
            box_number=1,
            box_label="Answer: ",
            expected_answer="2x",
            points=5.0,
        )

        self.stdout.write(self.style.SUCCESS(f"Created Quiz 2: {quiz2.title}"))
        self.stdout.write(
            self.style.SUCCESS("\n=== Introduction to ECE Quizzes Complete ===")
        )
        self.stdout.write(f"Course: {course.course_code}")
        self.stdout.write(f"Quiz 1 ID: {quiz1.id}")
        self.stdout.write(f"Quiz 2 ID: {quiz2.id}")

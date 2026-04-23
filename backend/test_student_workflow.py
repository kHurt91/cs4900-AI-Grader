# backend/test_student_workflow.py
import sys
import os
import django

sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.problems.models import Problem
from apps.users.models import CustomUser
from apps.grading.models import Submission, GradingEngine
from apps.grading.services.cas_grader import CASGrader


def simulate_student_submission():
    """Simulate a realistic student submission workflow"""
    print("=" * 70)
    print("STUDENT WORKFLOW SIMULATION")
    print("=" * 70)

    # Get data
    problem = Problem.objects.get(title__icontains="Antenna")
    student = CustomUser.objects.get(username="john_smith")
    grading_engine = GradingEngine.objects.filter(is_default=True).first()

    # Generate parameters
    parameters = {"L": 16, "delta": 0.25}  # Fixed for testing

    print(f"\n📚 Problem: {problem.title}")
    print(f"👤 Student: {student.get_full_name()}")
    print(f"🎲 Parameters: L={parameters['L']}, δ={parameters['delta']}")

    # Show rendered question
    question = problem.render_with_parameters(parameters)
    print(f"\n📝 Student sees:")
    print("-" * 70)
    print(question)
    print("-" * 70)

    # Student attempts - realistic answers
    attempts = [
        {
            "answer": "4",  # Just the coefficient
            "description": "Student only entered coefficient",
        },
        {
            "answer": "16/4",  # L/4 with actual value
            "description": "Student substituted L=16 into L/4",
        },
        {
            "answer": "L/4",  # Symbolic correct
            "description": "Student entered symbolic expression L/4",
        },
    ]

    grader = CASGrader()

    for i, attempt in enumerate(attempts, 1):
        print(f"\n{'='*70}")
        print(f"Attempt {i}: {attempt['description']}")
        print(f"{'='*70}")
        print(f"Student Answer: {attempt['answer']}")

        # For testing, use a simple expected answer
        expected = "L/4"  # Simplified expected answer

        # Grade it
        result = grader.grade_expression(attempt["answer"], expected, parameters)

        is_correct = result.get("is_correct", False)
        score = 100.0 if is_correct else 0.0

        # Create submission record
        submission = Submission.objects.create(
            student=student,
            problem=problem,
            student_answer=attempt["answer"],
            raw_input=attempt["answer"],
            problem_parameters=parameters,
            expected_answer=expected,
            is_correct=is_correct,
            score=score,
            grading_method="cas_only",
            attempt_number=i,
            status="completed",
            grading_engine=grading_engine,
        )

        print(f"\n📊 Grading Result:")
        print(f"   Submission ID: {submission.submission_id}")
        print(f"   Correct: {'✓ YES' if is_correct else '✗ NO'}")
        print(f"   Score: {score:.1f}/100")
        print(f"   Confidence: {result.get('confidence', 0):.2%}")
        print(f"   Reasoning: {result.get('reasoning', 'N/A')[:100]}")

    print(f"\n{'='*70}")
    print("✅ STUDENT WORKFLOW TEST COMPLETE")
    print(f"{'='*70}")

    # Show summary
    all_submissions = Submission.objects.filter(
        student=student, problem=problem
    ).order_by("-submitted_at")[:5]

    print(f"\n📈 Recent Submissions for {student.username}:")
    for sub in all_submissions:
        status = "✓" if sub.is_correct else "✗"
        print(
            f"   {status} Attempt #{sub.attempt_number}: {sub.student_answer[:30]} = {sub.score:.0f}/100"
        )


if __name__ == "__main__":
    simulate_student_submission()

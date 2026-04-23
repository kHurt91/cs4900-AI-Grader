# backend/test_complete_grading.py
import sys
import os
import django

sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.problems.models import Problem
from apps.users.models import CustomUser
from apps.grading.models import Submission, GradingResult, GradingEngine
from apps.grading.services.cas_grader import CASGrader
from django.utils import timezone


def create_test_submission():
    """Test complete grading workflow"""
    print("=" * 70)
    print("COMPLETE GRADING WORKFLOW TEST")
    print("=" * 70)

    # Get test data
    problem = Problem.objects.get(title__icontains="Antenna")
    student = CustomUser.objects.get(username="john_smith")
    grading_engine = GradingEngine.objects.filter(is_default=True).first()

    print(f"\n📚 Problem: {problem.title}")
    print(f"👤 Student: {student.get_full_name()}")

    # Generate unique parameters for this student
    parameters = problem.generate_parameters()
    print(f"\n🎲 Generated Parameters: {parameters}")

    # Show the problem as student sees it
    question = problem.render_with_parameters(parameters)
    print(f"\n📝 Student sees this question:")
    print("-" * 70)
    print(question[:400] + "...")
    print("-" * 70)

    # Calculate expected answer with these parameters
    expected = problem.calculate_expected_answer(parameters)
    print(f"\n✓ Expected Answer: {expected}")

    # Test different student answers
    test_answers = [
        ("L/4*sinc(k*L*sin(phi)/8)", "Correct answer"),
        ("0.25*L*sinc(k*L*sin(phi)/8)", "Equivalent form"),
        ("L*sinc(k*L*sin(phi)/8)/4", "Different arrangement"),
        ("L/2*sinc(k*L*sin(phi)/8)", "Wrong coefficient"),
    ]

    grader = CASGrader()

    for i, (student_answer, description) in enumerate(test_answers, 1):
        print(f"\n{'='*70}")
        print(f"Test Case {i}: {description}")
        print(f"{'='*70}")
        print(f"Student Answer: {student_answer}")

        # Create submission
        submission = StudentSubmission.objects.create(
            student=student,
            problem=problem,
            student_answer=student_answer,
            raw_input=student_answer,
            problem_parameters=parameters,
            expected_answer=expected,
            grading_method="cas_ai_fallback",
            attempt_number=i,
            status="pending",
        )

        print(f"📥 Submission ID: {submission.submission_id}")

        # Start grading
        submission.start_grading()

        # Grade the answer
        grading_result = grader.grade_expression(student_answer, expected, parameters)

        # Update submission with results
        is_correct = grading_result.get("is_correct", False)
        score = 100.0 if is_correct else 0.0

        submission.complete_grading(
            is_correct=is_correct, score=score, grading_engine=grading_engine
        )

        # Create detailed result
        result = GradingResult.objects.create(
            submission=submission,
            cas_result=grading_result,
            feedback_message=grading_result.get("reasoning", ""),
            cas_confidence=grading_result.get("confidence", 0.0),
            processing_time=0.5,
        )

        # Display results
        print(f"\n📊 Grading Results:")
        print(f"   Correct: {'✓ YES' if is_correct else '✗ NO'}")
        print(f"   Score: {score}/100")
        print(f"   Confidence: {grading_result.get('confidence', 0):.2%}")
        print(f"   Method: {grading_result.get('method', 'unknown').upper()}")
        print(f"   Reasoning: {grading_result.get('reasoning', 'N/A')}")
        print(f"   Processing Time: {submission.grading_duration:.3f}s")

    print(f"\n{'='*70}")
    print("✅ COMPLETE WORKFLOW TEST FINISHED")
    print(f"{'='*70}")

    # Summary
    total = StudentSubmission.objects.filter(student=student, problem=problem).count()
    correct = StudentSubmission.objects.filter(
        student=student, problem=problem, is_correct=True
    ).count()

    print(f"\n📈 Summary for {student.username}:")
    print(f"   Total Attempts: {total}")
    print(f"   Correct: {correct}")
    print(f"   Incorrect: {total - correct}")
    print(f"   Success Rate: {(correct/total*100):.1f}%")


if __name__ == "__main__":
    create_test_submission()

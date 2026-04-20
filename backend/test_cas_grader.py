# backend/test_cas_grader.py
import sys
import os
import django

# Setup Django
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.grading.services.cas_grader import CASGrader


def test_grader():
    grader = CASGrader()

    print("=" * 60)
    print("Testing CAS Grader")
    print("=" * 60)

    test_cases = [
        # (student_answer, correct_answer, parameters, expected_result)
        ("0.5*x", "x/2", None, True),
        ("1/2*x", "0.5*x", None, True),
        ("sin(x)**2 + cos(x)**2", "1", None, True),
        ("x**2", "x", None, False),
        ("2*x + 3*x", "5*x", None, True),
        ("e**(-x)*cos(2*x)", "cos(2*x)/e**x", None, True),
        # Antenna problem style
        ("L/4", "0.25*L", None, True),
        # Constant value test - hits the boundary condition path
        ("1", "1", None, True),
        ("2", "3", None, False),
    ]

    passed = 0
    failed = 0

    for i, (student, correct, params, expected) in enumerate(test_cases, 1):
        print(f"\nTest {i}:")
        print(f"  Student: {student}")
        print(f"  Correct: {correct}")

        result = grader.grade_expression(student, correct, params)

        if result["is_correct"] is not None:
            print(f"  Result: {'✓ CORRECT' if result['is_correct'] else '✗ INCORRECT'}")
            print(f"  Confidence: {result['confidence']:.2f}")
            print(f"  Method: {result['method']}")
            print(f"  Reasoning: {result['reasoning']}")

            if result["is_correct"] == expected:
                print(f"  Test Status: ✓ PASS")
                passed += 1
            else:
                print(f"  Test Status: ✗ FAIL")
                failed += 1
        else:
            print(f"  Error: {result.get('error', 'Unknown error')}")
            print(f"  Test Status: ✗ FAIL (Error)")
            failed += 1

    print("\n" + "=" * 60)
    print(f"Results: {passed} passed, {failed} failed out of {len(test_cases)} tests")
    print("=" * 60)


if __name__ == "__main__":
    test_grader()

from types import SimpleNamespace
from unittest.mock import patch

from django.test import TestCase, SimpleTestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.grading.services.answer_box_grader import grade_answer_box, infer_grading_strategy
from apps.problems.models import Problem
from apps.quizzes.models import AnswerBox, AnswerSubmission, Course, Quiz, QuizAttempt, QuizProblem
from apps.users.models import CustomUser


def box(**overrides):
    defaults = {
        "id": 1,
        "box_number": 1,
        "expected_answer": "",
        "rubric": "",
        "grading_strategy": "auto",
        "case_sensitive": False,
        "approximation_tolerance": None,
        "points": 5.0,
    }
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


class TestAnswerBoxStrategyInference(SimpleTestCase):
    def test_numeric_expected_answer_infers_numeric(self):
        self.assertEqual(infer_grading_strategy(box(expected_answer="13.7 K")), "numeric")

    def test_symbolic_expected_answer_infers_symbolic(self):
        self.assertEqual(infer_grading_strategy(box(expected_answer="x^2 + sin(x)")), "symbolic")

    def test_plain_text_expected_answer_infers_exact(self):
        self.assertEqual(infer_grading_strategy(box(expected_answer="binary tree")), "exact")

    def test_empty_answer_without_rubric_infers_manual(self):
        self.assertEqual(infer_grading_strategy(box(expected_answer="")), "manual")

    def test_empty_answer_with_rubric_infers_ai(self):
        self.assertEqual(infer_grading_strategy(box(expected_answer="", rubric="Grade reasoning")), "ai")


class TestAnswerBoxDeterministicGrading(SimpleTestCase):
    def test_exact_match_respects_case_setting(self):
        result = grade_answer_box(
            box(expected_answer="ABC", grading_strategy="exact", case_sensitive=False),
            "abc",
        )

        self.assertTrue(result["is_correct"])
        self.assertEqual(result["grading_method"], "exact")

    def test_numeric_uses_configured_tolerance(self):
        result = grade_answer_box(
            box(
                expected_answer="100",
                grading_strategy="numeric",
                approximation_tolerance=0.02,
            ),
            "101",
        )

        self.assertTrue(result["is_correct"])
        self.assertEqual(result["points_earned"], 5.0)

    def test_hybrid_does_not_call_ai_when_deterministic_is_confident(self):
        with patch("apps.grading.services.answer_box_grader._call_anthropic") as call:
            result = grade_answer_box(
                box(expected_answer="4", grading_strategy="hybrid"),
                "4",
            )

        call.assert_not_called()
        self.assertTrue(result["is_correct"])

    def test_hybrid_calls_ai_when_deterministic_cannot_parse(self):
        with patch(
            "apps.grading.services.answer_box_grader._call_anthropic",
            return_value='{"score": 75, "is_correct": false, "feedback": "Partially right", "confidence": 0.8, "needs_review": false}',
        ) as call:
            result = grade_answer_box(
                box(expected_answer="100", grading_strategy="hybrid"),
                "not a number",
            )

        call.assert_called_once()
        self.assertEqual(result["points_earned"], 3.75)
        self.assertFalse(result["needs_review"])


class TestSubmitAnswerBoxGrading(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.instructor = CustomUser.objects.create_user(
            username="instructor", role="instructor"
        )
        self.student = CustomUser.objects.create_user(username="student", role="student")
        self.course = Course.objects.create(
            course_code="CS4900",
            title="AI Grader",
            semester="spring",
            year=2026,
            instructor=self.instructor,
        )
        self.quiz = Quiz.objects.create(
            title="Quiz",
            course=self.course,
            quiz_type="quiz",
            available_from=timezone.now(),
            available_until=timezone.now(),
            max_attempts=2,
            created_by=self.instructor,
            total_points=5,
        )
        self.problem = Problem.objects.create(
            title="Problem",
            description="",
            question_text="What is 2+2?",
            solution_expression="4",
            author=self.instructor,
        )
        self.quiz_problem = QuizProblem.objects.create(
            quiz=self.quiz,
            problem=self.problem,
            problem_order=1,
            points=5,
        )
        self.answer_box = AnswerBox.objects.create(
            quiz_problem=self.quiz_problem,
            box_number=1,
            expected_answer="4",
            points=5,
            grading_strategy="exact",
        )

    def test_submit_creates_attempt_and_answer_submission(self):
        response = self.client.post(
            "/api/grading/submit/",
            {
                "quiz_id": self.quiz.id,
                "student_id": self.student.id,
                "content": {"answer_boxes": {str(self.answer_box.id): "4"}},
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(QuizAttempt.objects.count(), 1)
        answer_submission = AnswerSubmission.objects.get()
        self.assertTrue(answer_submission.is_correct)
        self.assertEqual(answer_submission.points_earned, 5)
        self.assertEqual(response.data["summary"]["percentage"], 100)

    def test_manual_box_needs_review_without_ai(self):
        self.answer_box.grading_strategy = "manual"
        self.answer_box.save(update_fields=["grading_strategy"])

        with patch("apps.grading.services.answer_box_grader._call_anthropic") as call:
            response = self.client.post(
                "/api/grading/submit/",
                {
                    "quiz_id": self.quiz.id,
                    "student_id": self.student.id,
                    "content": {"answer_boxes": {str(self.answer_box.id): "Needs review"}},
                },
                format="json",
            )

        call.assert_not_called()
        self.assertEqual(response.status_code, 200)
        self.assertTrue(AnswerSubmission.objects.get().needs_review)

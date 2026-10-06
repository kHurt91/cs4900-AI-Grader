# apps/grading/views.py
"""
API Views for Grading System
"""
import html
import re

from rest_framework import viewsets, status, serializers as drf_serializers
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.db import transaction
from drf_spectacular.utils import extend_schema, inline_serializer

from .models import Submission, GradingResult
from apps.quizzes.models import AnswerBox, AnswerSubmission, Quiz, QuizAttempt
from apps.problems.models import Problem
from apps.users.models import CustomUser
from .engines import GradingCoordinator
from .serializers import SubmissionSerializer, GradingResultSerializer

from .services.answer_box_grader import grade_answer_box
from .services.anthropic_grader import GradingServiceError, grade_submission



class GradingViewSet(viewsets.ViewSet):
    """
    ViewSet for grading operations
    """

    permission_classes = [AllowAny]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.grading_coordinator = GradingCoordinator()

    @extend_schema(
        request=inline_serializer("SubmitRequest", fields={
            "quiz_id": drf_serializers.IntegerField(),
            "student_id": drf_serializers.IntegerField(),
            "content": drf_serializers.DictField(child=drf_serializers.CharField()),
        }),
        responses={200: inline_serializer("SubmitResponse", fields={
            "submission_datetime": drf_serializers.CharField(),
            "attempt_number": drf_serializers.IntegerField(),
            "results": drf_serializers.JSONField(),
            "summary": drf_serializers.CharField(),
        })},
    )
    @action(detail=False, methods=["post"])
    def submit(self, request):
        """
        Submit an answer for grading

        POST /api/grading/submit/
        {
            "problem_id": 3,
            "answer": "sinc^2(phi)",
            "student_id": 1
        }
        """
        quiz_id = request.data.get("quiz_id")
        student_id = request.data.get("student_id", 1)
        content = request.data.get("content", {})

        # if not problem_id or not answer:
        #     return Response(
        #         {"error": "problem_id and answer are required"},
        #         status=status.HTTP_400_BAD_REQUEST,
        #     )

        # try:
        #     problem = Problem.objects.get(id=problem_id)
        # except Problem.DoesNotExist:
        #     return Response(
        #         {"error": "Problem not found"}, status=status.HTTP_404_NOT_FOUND
        #     )

        try:
            student = CustomUser.objects.get(id=student_id)
            quiz = Quiz.objects.get(id=quiz_id)
        except CustomUser.DoesNotExist:
            return Response(
                {"error": "Student not found"}, status=status.HTTP_404_NOT_FOUND
            )
        except Quiz.DoesNotExist:
            return Response(
                {"error": "Quiz not found"}, status=status.HTTP_404_NOT_FOUND
            )

        existing_attempts = QuizAttempt.objects.filter(student=student, quiz=quiz).count()
        if existing_attempts >= quiz.max_attempts:
            return Response(
                {"error": f"Maximum attempts ({quiz.max_attempts}) reached"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            attempt = QuizAttempt.objects.create(
                student=student,
                quiz=quiz,
                attempt_number=existing_attempts + 1,
                status="grading",
            )

            submission = Submission.objects.create(
                student_id=student,
                quiz=quiz,
                content=content,
                student_answer=str(content),
                raw_input=str(content),
                attempt_number=attempt.attempt_number,
                status="grading",
                grading_started_at=timezone.now(),
            )

        answer_boxes = _get_or_create_answer_boxes_for_quiz(quiz)
        box_results = []

        for answer_box in answer_boxes:
            student_answer = _extract_answer_for_box(content, answer_box)
            result = grade_answer_box(answer_box, student_answer)
            AnswerSubmission.objects.update_or_create(
                attempt=attempt,
                answer_box=answer_box,
                defaults={
                    "student_answer": student_answer,
                    "is_correct": result["is_correct"],
                    "ai_feedback": result["feedback"],
                    "feedback": result["feedback"],
                    "points_earned": result["points_earned"],
                    "graded_at": timezone.now(),
                    "grading_method": result["grading_method"],
                    "confidence": result["confidence"],
                    "needs_review": result["needs_review"],
                    "grader_trace": result["grader_trace"],
                    "raw_ai_response": result["raw_ai_response"],
                },
            )
            box_results.append(result)

        total_possible = sum(item["points_possible"] for item in box_results)
        total_earned = sum(item["points_earned"] for item in box_results)
        percentage = (total_earned / total_possible * 100) if total_possible else 0.0
        needs_review = any(item["needs_review"] for item in box_results)

        attempt.status = "completed" if not needs_review else "grading"
        attempt.submitted_at = timezone.now()
        attempt.raw_score = total_earned
        attempt.percentage_score = percentage
        attempt.is_passing = percentage >= quiz.passing_score
        attempt.save(
            update_fields=[
                "status",
                "submitted_at",
                "raw_score",
                "percentage_score",
                "is_passing",
            ]
        )

        submission.status = "manual_review" if needs_review else "completed"
        submission.grading_completed_at = timezone.now()
        submission.score = percentage
        submission.is_correct = percentage >= 99.5
        submission.grading_method = "cas_ai_fallback"
        submission.save(
            update_fields=[
                "status",
                "grading_completed_at",
                "score",
                "is_correct",
                "grading_method",
            ]
        )

        GradingResult.objects.create(
            submission=submission,
            ai_result="",
            feedback_message="Per-answer-box grading completed.",
            needs_review=needs_review,
            cas_result={
                "attempt_id": str(attempt.attempt_id),
                "results": box_results,
                "total_earned": total_earned,
                "total_possible": total_possible,
                "percentage": percentage,
            },
        )

        return Response(
            {
                "submission_id": str(submission.submission_id),
                "attempt_id": str(attempt.attempt_id),
                "submission_datetime": str(submission.submitted_at),
                "attempt_number": attempt.attempt_number,
                "results": box_results,
                "summary": {
                    "total_earned": total_earned,
                    "total_possible": total_possible,
                    "percentage": percentage,
                    "needs_review": needs_review,
                    "status": submission.status,
                },
            }
        )

    @extend_schema(
        request=inline_serializer("TestGradeRequest", fields={
            "question_text": drf_serializers.CharField(required=False, default=""),
            "expected_answer": drf_serializers.CharField(required=False, default=""),
            "grading_strategy": drf_serializers.CharField(required=False, default="auto"),
            "rubric": drf_serializers.CharField(required=False, default=""),
            "case_sensitive": drf_serializers.BooleanField(required=False, default=False),
            "approximation_tolerance": drf_serializers.FloatField(required=False, allow_null=True),
            "test_answer": drf_serializers.CharField(required=False, default=""),
        }),
        responses={200: inline_serializer("TestGradeResponse", fields={
            "grading_method": drf_serializers.CharField(),
            "is_correct": drf_serializers.BooleanField(allow_null=True),
            "score_percent": drf_serializers.FloatField(),
            "feedback": drf_serializers.CharField(),
            "confidence": drf_serializers.FloatField(),
            "needs_review": drf_serializers.BooleanField(),
            "grader_trace": drf_serializers.JSONField(),
        })},
    )
    @action(detail=False, methods=["post"])
    def test_grade(self, request):
        """
        Stateless grading preview for instructors.

        POST /api/grading/test_grade/
        Returns how a test_answer would be graded given a problem config.
        No DB writes.
        """
        from types import SimpleNamespace

        data = request.data
        question_text = data.get("question_text", "")
        mock_box = SimpleNamespace(
            expected_answer=data.get("expected_answer", ""),
            grading_strategy=data.get("grading_strategy", "auto"),
            rubric=data.get("rubric", ""),
            case_sensitive=bool(data.get("case_sensitive", False)),
            approximation_tolerance=data.get("approximation_tolerance"),
            points=1,
            id=None,
            box_number=0,
            box_label=question_text,
            quiz_problem=SimpleNamespace(
                problem=SimpleNamespace(question_text=question_text)
            ),
        )
        test_answer = data.get("test_answer", "")

        result = grade_answer_box(mock_box, test_answer)

        return Response({
            "grading_method": result.get("grading_method"),
            "is_correct": result.get("is_correct"),
            "score_percent": result.get("score_percent"),
            "feedback": result.get("feedback"),
            "confidence": result.get("confidence"),
            "needs_review": result.get("needs_review"),
            "grader_trace": result.get("grader_trace"),
        })

    def legacy_submit(self, request):
        """Old whole-quiz Anthropic grading path kept for reference during migration."""
        quiz_id = request.data.get("quiz_id")
        student_id = request.data.get("student_id", 1)
        content = request.data.get("content", {})

        try:
            student = CustomUser.objects.get(id=student_id)
            quiz = Quiz.objects.get(id=quiz_id)
            attempt_number = (
                Submission.objects.filter(student_id=student, quiz_id=quiz).count()
                + 1
            )

            submission = Submission.objects.create(
                student_id=student,
                quiz=quiz,
                content=content,
                student_answer=str(content),
                raw_input=str(content),
                attempt_number=attempt_number,
                status="grading",
            )
        except CustomUser.DoesNotExist:
            return Response(
                {"error": "Student not found"}, status=status.HTTP_404_NOT_FOUND
            )
        except Quiz.DoesNotExist:
            return Response(
                {"error": "Quiz not found"}, status=status.HTTP_404_NOT_FOUND
            )
        try:
            results_json, summary = grade_submission(submission)
        except GradingServiceError as exc:
            submission.status = "manual_review"
            submission.grading_completed_at = timezone.now()
            submission.save(update_fields=["status", "grading_completed_at"])
            GradingResult.objects.create(
                submission=submission,
                ai_result=str(exc),
                feedback_message="AI grading response could not be processed.",
                needs_review=True,
            )
            return Response(
                {
                    "error": "AI grading response could not be processed.",
                    "submission_id": str(submission.submission_id),
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        GradingResult.objects.create(
            submission=submission,
            ai_result=summary,
        )

        submission.status = "completed"
        submission.grading_completed_at = timezone.now()
        submission.save(update_fields=["status", "grading_completed_at"])

        return Response(
            {
                "submission_datetime": str(submission.submitted_at),
                "attempt_number": attempt_number,
                "results": results_json,
                "summary": summary,
            }
        )


    @extend_schema(
        parameters=[inline_serializer("GetCourseSubmissionsQuery", fields={
            "course": drf_serializers.IntegerField(),
        })],
        responses={200: inline_serializer("CourseSubmission", fields={
            "submission_id": drf_serializers.UUIDField(),
            "student_id": drf_serializers.IntegerField(),
            "quiz": drf_serializers.IntegerField(),
            "status": drf_serializers.CharField(),
            "score": drf_serializers.FloatField(allow_null=True),
            "attempt_number": drf_serializers.IntegerField(),
            "submitted_at": drf_serializers.DateTimeField(allow_null=True),
            "grading_started_at": drf_serializers.DateTimeField(allow_null=True),
            "student": drf_serializers.CharField(),
            "quiz_title": drf_serializers.CharField(),
        }, many=True)},
    )
    @action(detail=False, methods=["get"])
    def get_course_submissions(self, request):
        course_id = request.query_params.get("course", None)
        print(f"course id: {course_id}")
        if not course_id:
            return Response(
                {"error": "course query parameter is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        course_submissions = []
        for sub in Submission.objects.all():
            if int(sub.quiz.course.id) == int(course_id):
                data = SubmissionSerializer(sub).data
                student = CustomUser.objects.get(id=data["student_id"])
                quiz = Quiz.objects.get(id=data["quiz"])
                course_submissions.append(dict(data) | {
                    "student": student.get_full_name() or student.username, "quiz_title": quiz.title
                    }
                )

        if not course_submissions:
            return Response(
                {"error": "No submissions found for this course"},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(course_submissions, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"])
    def submit_steps(self, request):
        """
        Submit multi-step answer for grading

        POST /api/grading/submit-steps/
        {
            "problem_id": 6,
            "answers": {
                "step_1": "answer for step 1",
                "step_2": "answer for step 2"
            },
            "student_id": 1
        }
        """
        problem_id = request.data.get("problem_id")
        step_answers = request.data.get("answers", {})
        student_id = request.data.get("student_id", 1)

        try:
            problem = Problem.objects.get(id=problem_id)
            student = CustomUser.objects.get(id=student_id)
        except Problem.DoesNotExist:
            return Response(
                {"error": "Problem not found"}, status=status.HTTP_404_NOT_FOUND
            )
        except CustomUser.DoesNotExist:
            return Response(
                {"error": "Student not found"}, status=status.HTTP_404_NOT_FOUND
            )

        # Count attempts
        attempt_number = (
            Submission.objects.filter(student=student, problem=problem).count()
            + 1
        )

        # Create submission
        submission = Submission.objects.create(
            student=student,
            problem=problem,
            student_answer=str(step_answers),
            raw_input=str(step_answers),
            expected_answer=problem.solution_expression,
            attempt_number=attempt_number,
            status="grading",
        )

        submission.start_grading()

        # Grade multi-step submission
        grading_result = self.grading_coordinator.grade_multi_step(
            problem, step_answers
        )

        # Update submission
        submission.complete_grading(
            is_correct=grading_result["correct"], score=grading_result["total_score"]
        )
        submission.grading_method = "multi_step"
        submission.save(update_fields=["grading_method"])

        # Create detailed result
        GradingResult.objects.create(
            submission=submission,
            feedback_message=f"Multi-step grading: {len(grading_result['steps'])} steps",
            processing_time=0.2,
            cas_result={"steps": grading_result["steps"]},
        )

        return Response(
            {
                "submission_id": str(submission.submission_id),
                "total_score": grading_result["total_score"],
                "steps": grading_result["steps"],
                "correct": grading_result["correct"],
                "attempt_number": attempt_number,
            }
        )

    @action(detail=False, methods=["post"])
    def hint(self, request):
        """
        Get a hint for a problem

        POST /api/grading/hint/
        {
            "problem_id": 3,
            "current_answer": "sinc(phi)"
        }
        """
        problem_id = request.data.get("problem_id")
        current_answer = request.data.get("current_answer", "")

        try:
            problem = Problem.objects.get(id=problem_id)
        except Problem.DoesNotExist:
            return Response(
                {"error": "Problem not found"}, status=status.HTTP_404_NOT_FOUND
            )

        hint = self.grading_coordinator.ai_grader.provide_hint(problem, current_answer)

        return Response({"hint": hint})

    @action(detail=False, methods=["get"])
    def my_submissions(self, request):
        """Get submissions for a student"""
        student_id = request.query_params.get("student_id", 1)

        submissions = Submission.objects.filter(student_id=student_id).order_by(
            "-submitted_at"
        )[:10]

        serializer = SubmissionSerializer(submissions, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=["POST"])
    def ai_result_submit(self, request):
        "Submit AI results to backend"

        submission_id = request.data.get("submission_id")
        result = request.data.get("result")

        submission_obj = get_object_or_404(Submission, submission_id=submission_id)
       
        created = GradingResult.objects.update_or_create(
            submission = submission_obj,
            defaults={'ai_result': result}
        )
        return Response({"status": "success"}, status=201 if created else 200)
    
    @action(detail=False, methods=["GET"])
    def get_results(self, request):
        win_number = request.query_params.get("win_number")
        results = GradingResult.objects.filter(submission__student_id__win_number = win_number)

        serializer = GradingResultSerializer(results, many=True)
        return Response(serializer.data)        


@api_view(["GET"])
@permission_classes([AllowAny])
def grading_statistics(request):
    """Get grading statistics"""
    total_submissions = Submission.objects.count()
    correct_submissions = Submission.objects.filter(is_correct=True).count()

    accuracy = (
        (correct_submissions / total_submissions * 100) if total_submissions > 0 else 0
    )

    # Grading method breakdown
    method_stats = {}
    for method, _ in Submission._meta.get_field("grading_method").choices:
        count = Submission.objects.filter(grading_method=method).count()
        method_stats[method] = count

    return Response(
        {
            "total_submissions": total_submissions,
            "correct_submissions": correct_submissions,
            "incorrect_submissions": total_submissions - correct_submissions,
            "accuracy": round(accuracy, 2),
            "by_method": method_stats,
            "pending": Submission.objects.filter(status="pending").count(),
            "completed": Submission.objects.filter(status="completed").count(),
        }
    )


def _get_or_create_answer_boxes_for_quiz(quiz):
    boxes = []
    for quiz_problem in quiz.quiz_problems.select_related("problem").prefetch_related(
        "answer_boxes", "problem__parts"
    ):
        existing = list(quiz_problem.answer_boxes.all())
        if existing:
            boxes.extend(existing)
            continue

        parts = list(quiz_problem.problem.parts.all().order_by("part_number"))
        if parts:
            for part in parts:
                box, _created = AnswerBox.objects.get_or_create(
                    quiz_problem=quiz_problem,
                    box_number=part.part_number,
                    defaults={
                        "box_label": f"Part {part.part_number}",
                        "placeholder_text": "Enter your answer",
                        "expected_answer": part.expected_answer,
                        "points": part.points,
                        "grading_strategy": "auto",
                    },
                )
                boxes.append(box)
        else:
            box, _created = AnswerBox.objects.get_or_create(
                quiz_problem=quiz_problem,
                box_number=1,
                defaults={
                    "box_label": "Answer",
                    "placeholder_text": "Enter your answer",
                    "expected_answer": quiz_problem.problem.solution_expression or "",
                    "points": quiz_problem.points,
                    "grading_strategy": "auto",
                },
            )
            boxes.append(box)

    return sorted(boxes, key=lambda item: (item.quiz_problem.problem_order, item.box_number))


def _extract_answer_for_box(content, answer_box):
    answer_box_id = str(answer_box.id)
    quiz_problem_id = str(answer_box.quiz_problem_id)
    problem_id = str(answer_box.quiz_problem.problem_id)
    box_number = str(answer_box.box_number)

    candidates = [
        ("answer_boxes", answer_box_id),
        ("answerBoxes", answer_box_id),
        ("text", answer_box_id),
        ("text", f"box_{answer_box_id}"),
        ("text", f"{quiz_problem_id}_{answer_box_id}"),
        ("text", f"{problem_id}_{answer_box_id}"),
        ("text", f"{problem_id}_{box_number}"),
        ("multiple", answer_box_id),
        ("multiple", f"{problem_id}_{box_number}"),
    ]

    for section, key in candidates:
        value = (content or {}).get(section, {}).get(key)
        if value not in (None, ""):
            return _clean_student_answer(value)

    return ""


def _clean_student_answer(value):
    text = str(value)
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"</div>\s*<div>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    return html.unescape(text).strip()

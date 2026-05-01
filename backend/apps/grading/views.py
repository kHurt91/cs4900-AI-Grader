# apps/grading/views.py
"""
API Views for Grading System
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.utils import timezone
from django.shortcuts import get_object_or_404

from .models import Submission, GradingResult
from apps.quizzes.models import Quiz
from apps.problems.models import Problem
from apps.users.models import CustomUser
from .engines import GradingCoordinator
from .serializers import SubmissionSerializer, GradingResultSerializer

#Import class for grading submission
import asyncio, sys 
from pathlib import Path
root_path = Path(__file__).resolve().parents[3] 
sys.path.append(str(root_path))
from mcp_logic.submission_test import QuizGraderClient



class GradingViewSet(viewsets.ViewSet):
    """
    ViewSet for grading operations
    """

    permission_classes = [AllowAny]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.grading_coordinator = GradingCoordinator()

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
                    # Count attempts
            attempt_number = (
                Submission.objects.filter(student_id=student, quiz_id=quiz).count()
                + 1
            )

            # Create submission
            submission = Submission.objects.create(
                student_id=student,
                quiz=quiz,
                content=content,
                attempt_number=attempt_number,
                status="grading",
            )
        except CustomUser.DoesNotExist:
            return Response(
                {"error": "Student not found"}, status=status.HTTP_404_NOT_FOUND
            )
        grader = QuizGraderClient()
        results = asyncio.run(grader.run_grading_workflow(student_id=student_id))
        results_json, summary = asyncio.run(grader.run_grading_workflow(student_id=student_id))


        # # set grading [status, started_at] fields
        # submission.start_grading()

        # # Grade the submission
        # #   May need to process json before passing to func
        # grading_result = self.grading_coordinator.grade(content)

        # # Update submission with results
        # submission.complete_grading(
        #     is_correct=grading_result["correct"], score=grading_result["score"]
        # )
        # submission.grading_method = grading_result.get("method", "unknown")
        # submission.save(update_fields=["grading_method"])

        # # Create grading result
        # GradingResult.objects.create(
        #     submission=submission,
        #     feedback_message=grading_result.get("feedback", ""),
        #     processing_time=0.1,  # Placeholder
        #     cas_result=grading_result.get("details", {}),
        # )

        # Return result
        return Response(
            {
                "submission_datetime": str(submission.submitted_at),
                "attempt_number": attempt_number,
                "results": results,
            }
        )


    @action(detail=False, methods=["get"])
    def get_course_submissions(self, request):
        course_id = request.query_params.get("course", None)
        if not course_id:
            return Response("")

        course_submissions = []
        for sub in Submission.objects.all():
            if int(sub.quiz.course.id) == int(course_id):
                data = SubmissionSerializer(sub).data
                student = CustomUser.objects.get(id=data["student_id"])
                quiz = Quiz.objects.get(id=data["quiz"])
                course_submissions.append(dict(data) | {"student": student.username, "quiz_title": quiz.title})
        return Response(course_submissions)


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
       
        created = GradingResult.objects.create(
            submission = submission_obj,
            ai_result = result
        )
        return Response({"status": "success"}, status=201 if created else 200)
    
    @action(detail=False, methods=["GET"])
    def get_results(self, request):
        win_number = request.query_params.get("win_number")
        results = GradingResult.objects.filter(submission__student__win_number = win_number)

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

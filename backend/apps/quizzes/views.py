# apps/quizzes/views.py
"""
API Views for Quiz Management
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.utils import timezone
from datetime import timedelta

from .models import Course, Quiz, QuizProblem, QuizAttempt, QuizStatistics
from .serializers import (
    CourseSerializer,
    QuizListSerializer,
    QuizDetailSerializer,
    QuizProblemSerializer,
    QuizProblemDetailSerializer,
    QuizAttemptSerializer,
    QuizStatisticsSerializer,
)

class CourseViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Courses

    Endpoints:
    - POST /api/course/ - Create course
    - GET /api/courses/ - List all courses
    - GET /api/courses/{id}/ - Get course details
    """

    queryset = Course.objects.all()
    serializer_class = CourseSerializer
    permission_classes = [AllowAny]

    @action(detail=False, methods=["post"])
    def create_course(self, request):
        request.data["semester"] = request.data.pop("term")
        serializer = CourseSerializer(data=request.data)
        if serializer.is_valid():
            try:
                course = serializer.save()
                print(f"course: {course}")
                return Response([], status=status.HTTP_200_OK)
            except:
                print("serial failed")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["get"])
    def list_courses(self, request):
        ...

    @action(detail=False, methods=["get"])
    def details(self, request):
        ...


class QuizViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Quizzes

    Endpoints:
    - GET /api/quizzes/ - List all quizzes
    - POST /api/quizzes/ - Create quiz
    - GET /api/quizzes/{id}/ - Get quiz details
    - PUT /api/quizzes/{id}/ - Update quiz
    - DELETE /api/quizzes/{id}/ - Delete quiz
    """

    queryset = Quiz.objects.all()
    permission_classes = [AllowAny]

    def get_serializer_class(self):
        if self.action == "list":
            return QuizListSerializer
        return QuizDetailSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by course
        course_id = self.request.query_params.get("course", None)
        if course_id:
            queryset = queryset.filter(course_id=course_id)

        # Filter by published status
        is_published = self.request.query_params.get("published", None)
        if is_published is not None:
            queryset = queryset.filter(is_published=is_published.lower() == "true")

        return queryset

    @action(detail=True, methods=["get"])
    def problems(self, request, pk=None):
        """Get problems for a quiz - returns selected variation if attempt_id provided"""
        quiz = self.get_object()
        attempt_id = request.query_params.get('attempt_id')
        
        if attempt_id:
            # Get the specific variation for this attempt
            try:
                attempt = QuizAttempt.objects.get(attempt_id=attempt_id, quiz=quiz)
                selected_problem_id = attempt.problem_parameters.get('selected_problem_id')
                
                if selected_problem_id:
                    # Return only the selected variation
                    problem_qp = quiz.quiz_problems.filter(problem_id=selected_problem_id).first()
                    if problem_qp:
                        serializer = QuizProblemDetailSerializer([problem_qp], many=True)
                        return Response(serializer.data)
            except QuizAttempt.DoesNotExist:
                pass
        
        # Fallback: return all problems (for admin/instructor view)
        problems = quiz.quiz_problems.all()
        serializer = QuizProblemDetailSerializer(problems, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def start_attempt(self, request, pk=None):
        """Start a new quiz attempt with random problem selection"""
        import random
        
        print(f"DEBUG: start_attempt called for quiz {pk}")
        
        quiz = self.get_object()
        print(f"DEBUG: Quiz loaded: {quiz.title}")
        
        user = request.user if request.user.is_authenticated else None
        
        # For testing, use a default user if not authenticated
        if not user:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            user, _ = User.objects.get_or_create(username='test_student', defaults={'email': 'test@example.com'})
        
        print(f"DEBUG: User: {user.username}")
        
        # Count existing attempts
        attempt_count = QuizAttempt.objects.filter(
            quiz=quiz, 
            student=user
        ).count()
        
        print(f"DEBUG: Existing attempts: {attempt_count}, Max: {quiz.max_attempts}")
        
        # Check if max attempts reached
        if attempt_count >= quiz.max_attempts:
            return Response(
                {'error': f'Maximum attempts ({quiz.max_attempts}) reached'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get all problem variations for this quiz
        problem_variations = quiz.quiz_problems.all().order_by('problem_order')
        print(f"DEBUG: Found {problem_variations.count()} problem variations")
        
        # Randomly select one variation
        if problem_variations.exists():
            selected_variation = random.choice(list(problem_variations))
            print(f"DEBUG: Selected variation {selected_variation.problem_order}")
            problem_params = {
                'selected_problem_id': selected_variation.problem.id,
                'variation_number': selected_variation.problem_order
            }
        else:
            problem_params = {}
            print("DEBUG: No variations found!")
        
        # Create new attempt
        attempt = QuizAttempt.objects.create(
            quiz=quiz,
            student=user,
            attempt_number=attempt_count + 1,
            status='in_progress',
            problem_parameters=problem_params
        )
        
        print(f"DEBUG: Created attempt {attempt.attempt_id}")
        
        return Response({
            'attempt_id': str(attempt.attempt_id),
            'attempt_number': attempt.attempt_number,
            'max_attempts': quiz.max_attempts,
            'attempts_remaining': quiz.max_attempts - attempt.attempt_number,
            'selected_variation': problem_params.get('variation_number', 1)
        }, status=status.HTTP_201_CREATED)
        
    
    @action(detail=True, methods=["get"])
    def my_attempts(self, request, pk=None):
        """Get all attempts for current user on this quiz"""
        quiz = self.get_object()
        user = request.user if request.user.is_authenticated else None
        
        #if not user:
            #return Response({
               # 'attempts': [],
                #'total_attempts': 0,
                #'max_attempts': quiz.max_attempts,
                #'attempts_remaining': quiz.max_attempts
           # })

        # For testing, use a default user if not authenticated
        if not user:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            user, _ = User.objects.get_or_create(username='test_student', defaults={'email': 'test@example.com'})
        
        attempts = QuizAttempt.objects.filter(
            quiz=quiz,
            student=user
        ).order_by('-attempt_number')
        
        attempt_data = [{
            'attempt_number': a.attempt_number,
            'status': a.status,
            'started_at': a.started_at,
            'submitted_at': a.submitted_at,
            'score': a.raw_score,
            'percentage': a.percentage_score
        } for a in attempts]
        
        return Response({
            'attempts': attempt_data,
            'total_attempts': len(attempt_data),
            'max_attempts': quiz.max_attempts,
            'attempts_remaining': quiz.max_attempts - len(attempt_data)
        })
    @action(detail=True, methods=["post"])
    def submit_attempt(self, request, pk=None):
        """Submit a quiz attempt"""
        quiz = self.get_object()
        attempt_id = request.data.get('attempt_id')
        answers = request.data.get('answers', {})
        
        try:
            attempt = QuizAttempt.objects.get(attempt_id=attempt_id, quiz=quiz)
            attempt.status = 'submitted'
            attempt.submitted_at = timezone.now()
            
            # Calculate time spent
            if attempt.started_at:
                time_delta = timezone.now() - attempt.started_at
                attempt.time_spent = int(time_delta.total_seconds())
            
            # TODO: Calculate score based on answers
            # For now, just mark as submitted
            attempt.save()
            
            return Response({
                'message': 'Attempt submitted successfully',
                'attempt_number': attempt.attempt_number,
                'status': attempt.status
            })
        except QuizAttempt.DoesNotExist:
            return Response(
                {'error': 'Attempt not found'},
                status=status.HTTP_404_NOT_FOUND
            )



    @action(detail=False, methods=["post"])
    def create_full_quiz(self, request):
        """Create a quiz with problems and answer boxes in one request."""
        from apps.problems.models import Problem
        from .models import AnswerBox
        data = request.data
        try:
            course = Course.objects.get(id=data['course_id'])
        except Course.DoesNotExist:
            return Response({'error': 'Course not found'}, status=status.HTTP_404_NOT_FOUND)
        instructor = request.user if request.user.is_authenticated else course.instructor
        total_pts = sum(sum(b.get('points', 5) for b in prob.get('answer_boxes', [])) for prob in data.get('problems', [])) or 10.0
        quiz = Quiz.objects.create(
            title=data.get('title', 'Untitled Quiz'),
            description=data.get('description', ''),
            course=course,
            quiz_type='homework',
            time_limit=data.get('time_limit', 30),
            available_from=timezone.now(),
            available_until=timezone.now() + timedelta(days=365),
            max_attempts=data.get('max_attempts', 9999),
            show_correct_answers=True,
            is_published=True,
            created_by=instructor,
            total_points=float(total_pts),
        )
        for prob_idx, prob_data in enumerate(data.get('problems', []), start=1):
            problem = Problem.objects.create(
                title=prob_data.get('title', f'Question {prob_idx}'),
                difficulty='intermediate',
                author=instructor,
                question_text=prob_data.get('question_text', ''),
                solution_expression='',
                solution_explanation=f'Question {prob_idx} of quiz: {quiz.title}',
            )
            qp = QuizProblem.objects.create(
                quiz=quiz, problem=problem, problem_order=prob_idx,
                points=float(sum(b.get('points', 5) for b in prob_data.get('answer_boxes', []))) or 10.0,
            )
            for box_idx, box_data in enumerate(prob_data.get('answer_boxes', []), start=1):
                AnswerBox.objects.create(
                    quiz_problem=qp, box_number=box_idx,
                    box_label=box_data.get('label', f'Answer {box_idx}'),
                    placeholder_text='Enter your LaTeX expression',
                    expected_answer=box_data.get('expected_answer', ''),
                    answer_template='', is_readonly=False,
                    points=float(box_data.get('points', 5)),
                )
        return Response({'quiz_id': quiz.id, 'title': quiz.title, 'problem_count': len(data.get('problems', []))}, status=status.HTTP_201_CREATED)

@api_view(["GET"])
@permission_classes([AllowAny])
def quiz_statistics(request):
    """
    Get statistics about quizzes

    GET /api/quizzes/statistics/
    """
    total_quizzes = Quiz.objects.count()
    published_quizzes = Quiz.objects.filter(is_published=True).count()
    total_attempts = QuizAttempt.objects.count()

    return Response(
        {
            "total_quizzes": total_quizzes,
            "published_quizzes": published_quizzes,
            "draft_quizzes": total_quizzes - published_quizzes,
            "total_attempts": total_attempts,
            "total_courses": Course.objects.count(),
        }
    )

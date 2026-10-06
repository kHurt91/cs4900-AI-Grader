# apps/quizzes/views.py
"""
API Views for Quiz Management
"""
from rest_framework import viewsets, status, serializers as drf_serializers
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from drf_spectacular.utils import extend_schema, inline_serializer

from .models import Course, Quiz, QuizProblem, QuizAttempt, QuizStatistics
from .serializers import (
    CourseSerializer,
    QuizListSerializer,
    QuizDetailSerializer,
    QuizProblemSerializer,
    QuizProblemDetailSerializer,
    QuizAttemptSerializer,
    QuizSerializer,
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

    @extend_schema(
        request=inline_serializer("CreateCourseRequest", fields={
            "title": drf_serializers.CharField(),
            "course_code": drf_serializers.CharField(),
            "term": drf_serializers.ChoiceField(choices=["fall", "winter", "spring", "summer"]),
            "instructor_name": drf_serializers.CharField(),
            "instructor_id": drf_serializers.IntegerField(),
        }),
        responses={200: CourseSerializer},
    )
    @action(detail=False, methods=["post"])
    def create_course(self, request):
        request.data["semester"] = request.data.pop("term")
        serializer = CourseSerializer(data=request.data)
        if serializer.is_valid():
            try:
                serializer.save()
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

    @extend_schema(parameters=[
        inline_serializer("QuizListQuery", fields={
            "course": drf_serializers.IntegerField(required=False),
            "published": drf_serializers.BooleanField(required=False),
        }),
    ])
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    def get_serializer_class(self):
        if self.action == "list":
            return QuizListSerializer
        if self.action in ("create", "update", "partial_update"):
            return QuizSerializer
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

    @action(detail=False, methods=["post"])
    def create_quiz(self, request):
        serializer = QuizSerializer(data=request.data)
        if serializer.is_valid():
            try:
                course = serializer.save()
                print(f"course: {course}")
                return Response([], status=status.HTTP_200_OK)
            except:
                print("serial failed")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["get"])
    def get_course_quizzes(self, request):
        course_id = request.data.get("course_id", None)
        if course_id:
            course_quizzes = Quiz.objects.filter(course=course_id)
            if not len(course_quizzes) > 0:
                return Response([], status=status.HTTP_200_OK)
            return Response(course_quizzes)

    @action(detail=True, methods=["get"])
    def problems(self, request, pk=None):
        """Get all problems for a quiz with answer boxes"""
        quiz = self.get_object()
        problems = quiz.quiz_problems.all()
        serializer = QuizProblemDetailSerializer(problems, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def start_attempt(self, request, pk=None):
        """Start a new quiz attempt"""
        quiz = self.get_object()
        user = request.user if request.user.is_authenticated else None
        
        #if not user:
            #return Response(
                #{'error': 'Authentication required'},
                #status=status.HTTP_401_UNAUTHORIZED
            #)
        # For testing, use a default user if not authenticated
        if not user:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            user, _ = User.objects.get_or_create(username='test_student', defaults={'email': 'test@example.com'})
        
        
        # Count existing attempts
        attempt_count = QuizAttempt.objects.filter(
            quiz=quiz, 
            student=user
        ).count()
        
        # Check if max attempts reached
        if attempt_count >= quiz.max_attempts:
            return Response(
                {'error': f'Maximum attempts ({quiz.max_attempts}) reached'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create new attempt
        attempt = QuizAttempt.objects.create(
            quiz=quiz,
            student=user,
            attempt_number=attempt_count + 1,
            status='in_progress'
        )
        
        return Response({
            'attempt_id': str(attempt.attempt_id),
            'attempt_number': attempt.attempt_number,
            'max_attempts': quiz.max_attempts,
            'attempts_remaining': quiz.max_attempts - attempt.attempt_number
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
            'attempt_id': str(a.attempt_id),
            'attempt_number': a.attempt_number,
            'status': a.status,
            'started_at': a.started_at,
            'submitted_at': a.submitted_at,
            'score': a.raw_score,
            'percentage': a.percentage_score,
            'session_data': a.session_data,
        } for a in attempts]

        return Response({
            'attempts': attempt_data,
            'total_attempts': len(attempt_data),
            'max_attempts': quiz.max_attempts,
            'attempts_remaining': quiz.max_attempts - len(attempt_data)
        })

    @action(detail=True, methods=["post"])
    def save_draft(self, request, pk=None):
        """Save in-progress answers without submitting"""
        quiz = self.get_object()
        attempt_id = request.data.get('attempt_id')
        answers = request.data.get('answers', {})

        try:
            attempt = QuizAttempt.objects.get(
                attempt_id=attempt_id, quiz=quiz, status='in_progress'
            )
            attempt.session_data = {'answers': answers}
            attempt.save(update_fields=['session_data'])
            return Response({'message': 'Draft saved'})
        except (QuizAttempt.DoesNotExist, DjangoValidationError):
            return Response(
                {'error': 'In-progress attempt not found'},
                status=status.HTTP_404_NOT_FOUND
            )
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
        except (QuizAttempt.DoesNotExist, DjangoValidationError):
            return Response(
                {'error': 'Attempt not found'},
                status=status.HTTP_404_NOT_FOUND
            )


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

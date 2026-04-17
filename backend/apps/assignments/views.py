"""
API Views for Assignment Management
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

from apps.assignments.models import Assignment
from apps.assignments.serializers import (
    AssignmentSerializer,
    AssignmentCreateSerializer,
    AssignmentStudentViewSerializer,
)
from apps.problems.serializers_template import ProblemInstanceSerializer


class AssignmentViewSet(viewsets.ModelViewSet):
    """
    API endpoint for Assignments
    """

    queryset = Assignment.objects.all()
    permission_classes = [AllowAny]

    def get_serializer_class(self):
        if self.action == "create":
            return AssignmentCreateSerializer
        elif self.action == "student_view":
            return AssignmentStudentViewSerializer
        return AssignmentSerializer

    def get_queryset(self):
        queryset = Assignment.objects.filter(is_active=True)

        # Filter by type
        assignment_type = self.request.query_params.get("type")
        if assignment_type:
            queryset = queryset.filter(assignment_type=assignment_type)

        # Filter by created_by
        created_by = self.request.query_params.get("created_by")
        if created_by:
            queryset = queryset.filter(created_by__username=created_by)

        return queryset.order_by("-created_at")

    @action(detail=True, methods=["get"])
    def student_view(self, request, pk=None):
        """
        Get assignment from student perspective

        GET /api/assignments/{id}/student_view/?student_id=1
        """
        assignment = self.get_object()
        student_id = request.query_params.get("student_id")

        if not student_id:
            return Response(
                {"error": "student_id is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        # Check if assignment is open
        if not assignment.is_open():
            return Response(
                {"error": "Assignment not open yet", "open_date": assignment.open_date},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from apps.users.models import CustomUser

        try:
            student = CustomUser.objects.get(id=student_id)
        except CustomUser.DoesNotExist:
            return Response(
                {"error": "Student not found"}, status=status.HTTP_404_NOT_FOUND
            )

        # Generate instances for student
        instances = assignment.generate_instances_for_student(student)

        # Serialize
        assignment_data = AssignmentStudentViewSerializer(assignment).data
        instance_data = ProblemInstanceSerializer(instances, many=True).data

        return Response({"assignment": assignment_data, "problems": instance_data})

    @action(detail=True, methods=["get"])
    def problems(self, request, pk=None):
        """
        Get all problems in this assignment

        GET /api/assignments/{id}/problems/
        """
        assignment = self.get_object()
        templates = assignment.problem_templates.all()

        from apps.problems.serializers_template import ProblemTemplateSerializer

        serializer = ProblemTemplateSerializer(templates, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def active(self, request):
        """
        Get currently active assignments

        GET /api/assignments/active/
        """
        from django.utils import timezone

        now = timezone.now()

        active = Assignment.objects.filter(
            is_active=True, open_date__lte=now, due_date__gte=now
        )

        serializer = self.get_serializer(active, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def upcoming(self, request):
        """
        Get upcoming assignments

        GET /api/assignments/upcoming/
        """
        from django.utils import timezone

        now = timezone.now()

        upcoming = Assignment.objects.filter(
            is_active=True, open_date__gt=now
        ).order_by("open_date")

        serializer = self.get_serializer(upcoming, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["post"])
    def create_assignment(self, request):
        """Create a new assignment for a course"""
        from apps.quizzes.models import Course
        from django.utils import timezone
        from datetime import timedelta
        data = request.data
        instructor = request.user if request.user.is_authenticated else None
        if not instructor:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            instructor = User.objects.filter(role='instructor').first()
        due = data.get('due_date') or (timezone.now() + timedelta(days=7)).isoformat()
        assignment = Assignment.objects.create(
            name=data.get('title', 'Untitled Assignment'),
            description=data.get('description', ''),
            assignment_type='homework',
            open_date=timezone.now(),
            due_date=due,
            total_points=data.get('total_points', 100),
            created_by=instructor,
        )
        return Response({'id': assignment.id, 'name': assignment.name}, status=status.HTTP_201_CREATED)


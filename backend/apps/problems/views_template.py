"""
API Views for Problem Templates and Instances
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404

from apps.problems.models import ProblemTemplate, ProblemInstance
from apps.problems.serializers_template import (
    ProblemTemplateSerializer,
    ProblemTemplateCreateSerializer,
    ProblemInstanceSerializer,
    ProblemInstanceDetailSerializer,
)
from apps.users.models import CustomUser


class ProblemTemplateViewSet(viewsets.ModelViewSet):
    """
    API endpoint for Problem Templates

    List, Create, Retrieve, Update, Delete problem templates
    """

    queryset = ProblemTemplate.objects.all()
    permission_classes = [AllowAny]  # Change to IsAuthenticated in production

    def get_serializer_class(self):
        if self.action == "create":
            return ProblemTemplateCreateSerializer
        return ProblemTemplateSerializer

    def get_queryset(self):
        queryset = ProblemTemplate.objects.all()

        # Filter by created_by
        created_by = self.request.query_params.get("created_by")
        if created_by:
            queryset = queryset.filter(created_by__username=created_by)

        # Filter by public
        is_public = self.request.query_params.get("is_public")
        if is_public:
            queryset = queryset.filter(is_public=True)

        return queryset.order_by("-created_at")

    @action(detail=True, methods=["post"])
    def generate_preview(self, request, pk=None):
        """
        Generate a preview instance of the template

        POST /api/templates/{id}/generate_preview/
        {
            "seed": 12345  // optional, for reproducible preview
        }
        """
        template = self.get_object()
        seed = request.data.get("seed", 12345)

        # Generate instance with fixed seed for preview
        instance = template.generate_instance(
            student=request.user, assignment=None, seed=seed
        )

        serializer = ProblemInstanceDetailSerializer(instance)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def generate_instance(self, request, pk=None):
        """
        Generate a unique instance for a student

        POST /api/templates/{id}/generate_instance/
        {
            "student_id": 1,
            "assignment_id": 2  // optional
        }
        """
        template = self.get_object()
        student_id = request.data.get("student_id")
        assignment_id = request.data.get("assignment_id")

        if not student_id:
            return Response(
                {"error": "student_id is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            student = CustomUser.objects.get(id=student_id)
        except CustomUser.DoesNotExist:
            return Response(
                {"error": "Student not found"}, status=status.HTTP_404_NOT_FOUND
            )

        # Get or create instance
        from apps.assignments.models import Assignment

        assignment = None
        if assignment_id:
            try:
                assignment = Assignment.objects.get(id=assignment_id)
            except Assignment.DoesNotExist:
                pass

        instance = template.generate_instance(student, assignment)

        serializer = ProblemInstanceSerializer(instance)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def instances(self, request, pk=None):
        """
        Get all instances of this template

        GET /api/templates/{id}/instances/
        """
        template = self.get_object()
        instances = ProblemInstance.objects.filter(template=template)

        serializer = ProblemInstanceSerializer(instances, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def my_templates(self, request):
        """
        Get templates created by current user

        GET /api/templates/my_templates/
        """
        templates = ProblemTemplate.objects.filter(created_by=request.user)
        serializer = self.get_serializer(templates, many=True)
        return Response(serializer.data)


class ProblemInstanceViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for Problem Instances (read-only)
    """

    queryset = ProblemInstance.objects.all()
    serializer_class = ProblemInstanceSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = ProblemInstance.objects.all()

        # Filter by student
        student_id = self.request.query_params.get("student_id")
        if student_id:
            queryset = queryset.filter(student_id=student_id)

        # Filter by assignment
        assignment_id = self.request.query_params.get("assignment_id")
        if assignment_id:
            queryset = queryset.filter(assignment_id=assignment_id)

        # Filter by template
        template_id = self.request.query_params.get("template_id")
        if template_id:
            queryset = queryset.filter(template_id=template_id)

        return queryset.order_by("-generated_at")

    @action(detail=True, methods=["get"])
    def detail_view(self, request, pk=None):
        """
        Get detailed view of instance (for students)
        Shows the rendered problem but not the answer
        """
        instance = self.get_object()

        # Check if student can see answer
        show_answer = request.query_params.get("show_answer", "false").lower() == "true"

        data = {
            "id": instance.id,
            "rendered_text": instance.rendered_text,
            "parameter_display": instance.get_parameter_display(),
            "generated_at": instance.generated_at,
        }

        if show_answer:
            data["expected_answer"] = instance.expected_answer

        return Response(data)

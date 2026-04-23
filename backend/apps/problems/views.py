# apps/problems/views.py
"""
API Views for Problem Management
"""

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

from .models import Problem, ProblemCategory, ProblemPart, ProblemTag
from .serializers import (
    ProblemListSerializer,
    ProblemDetailSerializer,
    ProblemCreateSerializer,
    ProblemCategorySerializer,
    ProblemPartSerializer,
    ProblemTagSerializer,
)


class ProblemCategoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Problem Categories

    Endpoints:
    - GET /api/problems/categories/ - List all categories
    - POST /api/problems/categories/ - Create category
    - GET /api/problems/categories/{id}/ - Get category details
    """

    queryset = ProblemCategory.objects.all()
    serializer_class = ProblemCategorySerializer
    permission_classes = [AllowAny]


class ProblemViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Problems

    Endpoints:
    - GET /api/problems/ - List all problems
    - POST /api/problems/ - Create problem
    - GET /api/problems/{id}/ - Get problem details
    - PUT /api/problems/{id}/ - Update problem
    - DELETE /api/problems/{id}/ - Delete problem
    """

    queryset = Problem.objects.all()
    permission_classes = [AllowAny]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["title", "description"]
    ordering_fields = ["created_at", "title", "difficulty"]
    ordering = ["-created_at"]

    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == "list":
            return ProblemListSerializer
        elif self.action == "create":
            return ProblemCreateSerializer
        return ProblemDetailSerializer

    def get_queryset(self):
        """Filter queryset based on query parameters"""
        queryset = super().get_queryset()

        # Filter by category
        category_id = self.request.query_params.get("category", None)
        if category_id:
            queryset = queryset.filter(category_id=category_id)

        # Filter by difficulty
        difficulty = self.request.query_params.get("difficulty", None)
        if difficulty:
            queryset = queryset.filter(difficulty=difficulty)

        return queryset

    @action(detail=True, methods=["get"])
    def parts(self, request, pk=None):
        """Get all parts of a multi-part problem"""
        problem = self.get_object()
        parts = problem.problempart_set.all()
        serializer = ProblemPartSerializer(parts, many=True)
        return Response(serializer.data)


@api_view(["GET"])
@permission_classes([AllowAny])
def problem_statistics(request):
    """
    Get statistics about problems

    GET /api/problems/statistics/
    """
    total_problems = Problem.objects.count()

    return Response(
        {
            "total_problems": total_problems,
            "total_categories": ProblemCategory.objects.count(),
            "total_tags": ProblemTag.objects.count(),
        }
    )

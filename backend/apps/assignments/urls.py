"""
URL Configuration for Assignments
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.assignments.views import AssignmentViewSet

app_name = "assignments"

router = DefaultRouter()
router.register(r"", AssignmentViewSet, basename="assignment")

urlpatterns = [
    path("", include(router.urls)),
]

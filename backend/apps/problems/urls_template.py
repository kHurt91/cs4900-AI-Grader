"""
URL Configuration for Problem Templates and Instances
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.problems.views_template import ProblemTemplateViewSet, ProblemInstanceViewSet

app_name = "templates"

router = DefaultRouter()
router.register(r"templates", ProblemTemplateViewSet, basename="template")
router.register(r"instances", ProblemInstanceViewSet, basename="instance")

urlpatterns = [
    path("", include(router.urls)),
]

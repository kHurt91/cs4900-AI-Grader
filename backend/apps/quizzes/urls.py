# apps/quizzes/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = "quizzes"

router = DefaultRouter()
router.register(r"courses", views.CourseViewSet, basename="course")
router.register(r"quizzes", views.QuizViewSet, basename="quiz")

urlpatterns = [
    path("courses/<int:course_id>/submissions/", views.course_submissions, name="course-submissions"),
    path("statistics/", views.quiz_statistics, name="statistics"),
    path("", include(router.urls)),
]

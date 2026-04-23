from django.contrib import admin
from .models import GradingEngine, Submission, GradingResult

admin.site.register(GradingEngine)
admin.site.register(Submission)
# admin.site.register(SubmissionPart)
admin.site.register(GradingResult)

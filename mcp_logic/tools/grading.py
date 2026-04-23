from domain.api_client import post_grade
from domain.models import Grade
import traceback


def submit_grade(submission_id: str, result: str):
    try:
        grade = Grade(submission_id, result)
        post_grade(grade.submission_id, result)
        return 0

    except Exception as e:
        print("PROCESSING ERROR: ")
        print(e)
        traceback.print_exc()

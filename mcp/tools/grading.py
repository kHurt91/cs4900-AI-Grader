from domain.api_client import post_grade
from domain.models import Grade
import traceback


def submit_grade(result: str):
    try:
        grade = Grade(result)
        post_grade(grade.result)

    except Exception as e:
        print("PROCESSING ERROR: ")
        print(e)
        traceback.print_exc()

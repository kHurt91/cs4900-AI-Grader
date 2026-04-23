from domain.api_client import get_quiz
from domain.models import Quiz
import traceback


def fetch_quiz(quiz_id: int):
    data = get_quiz(quiz_id)
    try:
        quiz = Quiz(data["id"], data["problems"], data["title"], data["course"])

    except:
        print("Processing Error")
        traceback.print_exc()

    return quiz

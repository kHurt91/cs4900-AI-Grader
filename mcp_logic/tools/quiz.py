from domain.api_client import get_quiz, get_problem
from domain.models import Quiz
import traceback


def fetch_quiz(quiz_id: int):
    quiz_data = get_quiz(quiz_id)
    try:
        nested_problems = []
        for p in quiz_data["problems"]:
            problem_info = get_problem(p["id"])
            nested_problems.append({"problem": p, "parts": problem_info["parts"]})

        quiz = Quiz(
            quiz_data["id"], nested_problems, quiz_data["title"], quiz_data["course"]
        )

    except:
        print("Processing Error")
        traceback.print_exc()

    return quiz

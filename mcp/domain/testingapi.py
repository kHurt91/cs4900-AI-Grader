from api_client import get_submission, get_quiz, get_user
import requests

BASE_URL = "http://127.0.0.1:4000/api"  # placeholder url


def main(student_id: int, quiz_id: int):
    submission = get_submission(student_id)
    quiz = get_quiz(quiz_id)
    user = get_user(student_id)

    print("SUBMISSION:", submission[0]["submission_id"])
    print("\nQUIZ:", quiz)
    print("\nUSER:", user)

    return 0


main(4, 2)

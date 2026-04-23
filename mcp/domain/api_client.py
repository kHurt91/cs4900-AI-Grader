import requests

BASE_URL = "http://127.0.0.1:4000/api"  # placeholder url

# potential functions. These will talk to Django to get information


def get_submission(student_id: int):
    endpoint = "/grading/my_submissions/?student_id="
    response = requests.get(f"{BASE_URL}{endpoint}{student_id}")
    return response.json()


def get_quiz(quiz_id: int):
    endpoint = "/quizzes/"
    response = requests.get(f"{BASE_URL}{endpoint}{quiz_id}")
    return response.json()


def get_user(student_id: int):
    endpoint = "/users/info/?student_id="
    response = requests.get(f"{BASE_URL}{endpoint}{student_id}")
    return response.json()


def post_grade(result: str):
    endpoint = "grading/results/"
    response = requests.post(
        f"{BASE_URL}{endpoint}{result}"
    )  # API for backend post would go here
    return response

import requests

BASE_URL = "http://127.0.0.1:8000/api"  # placeholder url

# potential functions. These will talk to Django to get information


def get_submission(student_id: int):
    endpoint = "/grading/my_submissions/?student_id="
    response = requests.get(f"{BASE_URL}{endpoint}{student_id}")
    return response.json()


def get_quiz(quiz_id: int):
    endpoint = "/quizzes/"
    response = requests.get(f"{BASE_URL}{endpoint}{quiz_id}")
    return response.json()


def get_problem(problem_id: int):
    endpoint = "/problems/"
    response = requests.get(f"{BASE_URL}{endpoint}{problem_id}")
    return response.json()


def get_user(student_id: int):
    endpoint = "/users/info/?student_id="
    response = requests.get(f"{BASE_URL}{endpoint}{student_id}")
    return response.json()


def post_grade(submission_id: str, result: str):
    endpoint = "/grading/ai_result_submit/"
    data = {"submission_id": submission_id, "result": result}
    response = requests.post(
        f"{BASE_URL}{endpoint}", json=data
    )  # API for backend post would go here
    return response

from domain.api_client import get_problem
from domain.models import Problem


def fetch_problem(student_id: int):
    data = get_problem(problem_id)

    problem = Problem(
        student_id=data["student_id"],
        contents=data["contents"],
    )
    return problem


def fetch_problem_parts(problem_id: int):
    data = get_problem_parts(problem_id)

    problem_parts = Problem_Parts(
        student_id=data["student_id"],
        contents=data["contents"],
    )

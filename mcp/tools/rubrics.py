from domain.api_client import get_rubric
from domain.models import Rubric


def fetch_rubric(assignment_title: str):
    data = get_rubric(assignment_title)

    rubric = Rubric(
        id=data[id],
        title=data["title"],
        criteria=data["criteria"],
    )
    return rubric

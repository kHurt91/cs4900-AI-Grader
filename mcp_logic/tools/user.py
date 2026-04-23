from domain.api_client import get_user
from domain.models import User
import traceback


def fetch_user(student_id: int):
    data = get_user(student_id)
    try:
        user = User(data["id"], data["email"], data["win_number"])

    except:
        print("Processing Error")
        traceback.print_exc()

    return user

from domain.api_client import get_submission
from domain.models import Submission
import traceback


def fetch_submission(student_id: int):
    data = get_submission(student_id)
    try:
        submission = Submission(
            data[0]["submission_id"],
            data[0]["student_id"],
            data[0]["quiz"],
            data[0]["content"],
        )

    except Exception as e:
        print(f"Processing Error: {e}")
        traceback.print_exc()

    return submission

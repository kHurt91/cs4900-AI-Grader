import re

from .cas_grader import CASGrader


class MultiStepGrader:
    """Small deterministic multi-step grader used by legacy tests and flows."""

    def __init__(self):
        self.cas_grader = CASGrader()

    def grade_submission(self, submission, problem_data, parameters=None):
        expected = problem_data.get("solution_expression", "")
        final_answer = self._extract_final_answer(submission)
        cas_result = self.cas_grader.grade_expression(
            final_answer,
            expected,
            None,
        )

        score = 0
        if cas_result.get("is_correct"):
            score += 60
        elif cas_result.get("confidence", 0) >= 0.7:
            score += 30

        step_markers = len(re.findall(r"\bstep\s*\d+|final", submission, flags=re.IGNORECASE))
        score += min(40, step_markers * 10)

        return {
            "total_score": min(100, score),
            "correct": score >= 70,
            "method": "multi_step",
            "cas_result": cas_result,
        }

    def _extract_final_answer(self, submission):
        matches = re.findall(r"final(?:\s+answer)?\s*:\s*([^\n]+)", submission, flags=re.IGNORECASE)
        if matches:
            return matches[-1].strip()
        return submission.strip()

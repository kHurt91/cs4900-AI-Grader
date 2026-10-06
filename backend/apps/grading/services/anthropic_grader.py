import json
import logging
import os
import re

from anthropic import Anthropic

logger = logging.getLogger(__name__)


class GradingServiceError(Exception):
    """Raised when AI grading cannot produce usable grading output."""


def grade_submission(submission):
    """
    Grade a quiz submission using Claude. Fetches quiz/user data directly from
    the Django ORM and returns (results_json, summary) matching the old
    QuizGraderClient.run_grading_workflow() return shape.
    """
    submission_struct = _build_submission_struct(submission)
    quiz_struct = _build_quiz_struct(submission.quiz)
    user_struct = _build_user_struct(submission.student_id)

    prompt = _build_prompt(submission_struct, quiz_struct, user_struct)

    try:
        client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}],
        )
        return _parse_response(response.content[0].text)
    except Exception as e:
        logger.exception("Anthropic grading error")
        raise GradingServiceError(str(e)) from e


def _build_submission_struct(submission):
    return {
        "submission_id": str(submission.submission_id),
        "quiz_id": submission.quiz.id,
        "student_id": submission.student_id.id,
        "student_answers": submission.content,
    }


def _build_quiz_struct(quiz):
    nested_problems = []
    for problem in quiz.problems.all():
        parts = [
            {
                "part_number": p.part_number,
                "part_text": p.part_text,
                "expected_answer": p.expected_answer,
                "points": p.points,
            }
            for p in problem.parts.order_by("part_number")
        ]
        nested_problems.append({"problem": {
            "id": problem.id,
            "title": problem.title,
            "question_text": problem.question_text,
            "solution_expression": problem.solution_expression,
        }, "parts": parts})

    return {
        "quiz_id": quiz.id,
        "title": quiz.title,
        "course": quiz.course_id,
        "problems": nested_problems,
    }


def _build_user_struct(user):
    return {
        "student_id": user.id,
        "student_email": user.email,
        "student_WIN": user.win_number,
    }


def _build_prompt(submission_struct, quiz_struct, user_struct):
    return f"""Please grade the following quiz submission. \
Solve the problems based on question_text and grade student answers.
Return a JSON array first. Do not wrap it in Markdown fences.
For each problem, use this format:

quiz_number: number,
student_answer: student's answer,
expected_answer: your answer,

Student Submission:
{json.dumps(submission_struct, indent=2)}

Quiz Problems:
{json.dumps(quiz_struct, indent=2)}

User Info:
{json.dumps(user_struct, indent=2)}

Include this at the end of your response on a new line:
"quiz_title,win_number,earned_points,overall_feedback,"
"""


def _parse_response(text):
    json_str, json_end = _extract_json_prefix(text)
    results = _loads_json(json_str)
    summary = text[json_end:].strip()
    if summary.startswith("```"):
        summary = summary[3:].lstrip()
    return results, summary


def _extract_json_prefix(text):
    stripped = text.lstrip()
    offset = len(text) - len(stripped)

    fence_match = re.match(r"```(?:json)?\s*", stripped, re.IGNORECASE)
    if fence_match:
        offset += fence_match.end()
        stripped = text[offset:]

    starts = [pos for pos in (stripped.find("["), stripped.find("{")) if pos != -1]
    if not starts:
        raise GradingServiceError("AI response did not contain JSON")

    start = min(starts)
    absolute_start = offset + start
    opening = text[absolute_start]
    closing = "]" if opening == "[" else "}"
    end = _find_balanced_json_end(text, absolute_start)

    if end is None:
        end = text.rfind(closing, absolute_start) + 1
    if end <= absolute_start:
        raise GradingServiceError("AI response JSON was incomplete")

    return text[absolute_start:end].strip(), end


def _find_balanced_json_end(text, start):
    pairs = {"[": "]", "{": "}"}
    stack = []
    in_string = False
    escaped = False

    for index in range(start, len(text)):
        char = text[index]

        if in_string:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == "\"":
                in_string = False
            continue

        if char == "\"":
            in_string = True
        elif char in pairs:
            stack.append(pairs[char])
        elif stack and char == stack[-1]:
            stack.pop()
            if not stack:
                return index + 1

    return None


def _loads_json(json_str):
    try:
        return json.loads(json_str)
    except json.JSONDecodeError as original_error:
        repaired = _repair_common_json_issues(json_str)
        if repaired != json_str:
            try:
                return json.loads(repaired)
            except json.JSONDecodeError:
                pass

        raise GradingServiceError(
            f"Could not parse AI response JSON: {original_error}"
        ) from original_error


def _repair_common_json_issues(json_str):
    repaired = json_str.strip()
    repaired = re.sub(r"(?<=[}\]\"0-9eE])\s*\n\s*(?=[{\"-])", ",\n", repaired)
    repaired = re.sub(r",\s*([}\]])", r"\1", repaired)
    return repaired

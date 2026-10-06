import json
import logging
import os
import re

from anthropic import Anthropic

from apps.grading.engines.numerical_grader import NumericalGrader
from apps.grading.engines.pattern_grader import PatternGrader
from apps.grading.services.cas_grader import CASGrader

logger = logging.getLogger(__name__)

MATH_TOKENS = (
    "\\",
    "^",
    "_",
    "frac",
    "int",
    "sum",
    "sqrt",
    "sin",
    "cos",
    "tan",
    "log",
    "theta",
    "phi",
    "omega",
    "Omega",
    "pi",
    "*",
    "/",
)


def infer_grading_strategy(answer_box):
    expected = (answer_box.expected_answer or "").strip()
    rubric = (answer_box.rubric or "").strip()

    if not expected:
        return "ai" if rubric else "manual"

    if _looks_numeric(expected):
        return "numeric"

    if any(token in expected for token in MATH_TOKENS):
        return "symbolic"

    return "exact"


def grade_answer_box(answer_box, student_answer):
    strategy = answer_box.grading_strategy or "auto"
    if strategy == "auto":
        strategy = infer_grading_strategy(answer_box)

    if strategy == "manual":
        return _manual_result(answer_box, student_answer, strategy)

    if strategy == "ai":
        return _grade_with_ai(answer_box, student_answer, strategy)

    if strategy == "hybrid":
        inferred = infer_grading_strategy(answer_box)
        if inferred in ("manual", "ai"):
            return _grade_with_ai(answer_box, student_answer, strategy)

        deterministic = _grade_deterministic(answer_box, student_answer, inferred)
        if (
            deterministic["confidence"] >= 0.85
            and deterministic["is_correct"] is not None
            and not deterministic["grader_trace"].get("needs_ai_fallback")
        ):
            deterministic["grading_method"] = "hybrid"
            return deterministic

        ai_result = _grade_with_ai(answer_box, student_answer, strategy)
        ai_result["grader_trace"]["deterministic_attempt"] = deterministic
        return ai_result

    return _grade_deterministic(answer_box, student_answer, strategy)


def _grade_deterministic(answer_box, student_answer, strategy):
    if strategy == "exact":
        return _grade_exact(answer_box, student_answer)
    if strategy == "numeric":
        return _grade_numeric(answer_box, student_answer)
    if strategy == "symbolic":
        return _grade_symbolic(answer_box, student_answer)

    return _manual_result(answer_box, student_answer, strategy)


def _grade_exact(answer_box, student_answer):
    result = PatternGrader().grade(
        student_answer,
        answer_box.expected_answer,
        case_sensitive=answer_box.case_sensitive,
        allow_partial=False,
    )
    return _normalize_result(
        answer_box=answer_box,
        method="exact",
        score_percent=result["score"],
        is_correct=result["correct"],
        feedback=result["feedback"],
        confidence=1.0,
        trace=result,
    )


def _grade_numeric(answer_box, student_answer):
    tolerance = (
        answer_box.approximation_tolerance
        if answer_box.approximation_tolerance is not None
        else 0.01
    )
    result = NumericalGrader().grade(
        student_answer,
        answer_box.expected_answer,
        tolerance=tolerance,
    )
    parse_failed = result["feedback"].lower().startswith("could not parse")
    return _normalize_result(
        answer_box=answer_box,
        method="numeric",
        score_percent=result["score"],
        is_correct=result["correct"] if not parse_failed else None,
        feedback=result["feedback"],
        confidence=0.0 if parse_failed else 1.0,
        trace=result | {"needs_ai_fallback": parse_failed},
    )


def _grade_symbolic(answer_box, student_answer):
    result = CASGrader(
        tolerance=answer_box.approximation_tolerance or 1e-6
    ).grade_expression(student_answer, answer_box.expected_answer)
    is_correct = result.get("is_correct")
    confidence = float(result.get("confidence") or 0.0)
    return _normalize_result(
        answer_box=answer_box,
        method="symbolic",
        score_percent=100 if is_correct else 0,
        is_correct=is_correct,
        feedback=result.get("reasoning") or result.get("error") or "",
        confidence=confidence,
        trace=result,
    )


def _grade_with_ai(answer_box, student_answer, strategy):
    try:
        raw_text = _call_anthropic(answer_box, student_answer)
        parsed = _parse_ai_box_response(raw_text)
        score_percent = float(parsed.get("score", 0))
        score_percent = max(0.0, min(100.0, score_percent))
        is_correct = parsed.get("is_correct")
        if is_correct is None:
            is_correct = score_percent >= 99.5
        return _normalize_result(
            answer_box=answer_box,
            method=strategy,
            score_percent=score_percent,
            is_correct=bool(is_correct),
            feedback=str(parsed.get("feedback", "")),
            confidence=float(parsed.get("confidence", 0.5) or 0.0),
            trace={"ai": parsed},
            raw_ai_response=raw_text,
            needs_review=bool(parsed.get("needs_review", False)),
        )
    except Exception as exc:
        logger.exception("AI answer-box grading failed")
        return _normalize_result(
            answer_box=answer_box,
            method=strategy,
            score_percent=0,
            is_correct=None,
            feedback="AI grading could not be completed. Needs manual review.",
            confidence=0.0,
            trace={"error": str(exc), "needs_ai_fallback": True},
            needs_review=True,
        )


def _call_anthropic(answer_box, student_answer):
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY is not configured")

    prompt = _build_ai_prompt(answer_box, student_answer)
    client = Anthropic(api_key=api_key)
    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=500,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text


def _build_ai_prompt(answer_box, student_answer):
    quiz_problem = answer_box.quiz_problem
    problem = quiz_problem.problem
    return f"""Grade one answer box. Return only JSON with keys:
score: number from 0 to 100,
is_correct: boolean,
feedback: short student-facing feedback,
confidence: number from 0 to 1,
needs_review: boolean.

Problem:
{problem.question_text}

Answer box label:
{answer_box.box_label}

Expected answer:
{answer_box.expected_answer}

Rubric:
{answer_box.rubric}

Student answer:
{student_answer}
"""


def _parse_ai_box_response(text):
    stripped = text.strip()
    if stripped.startswith("```"):
        stripped = re.sub(r"^```(?:json)?\s*", "", stripped, flags=re.IGNORECASE)
        stripped = re.sub(r"\s*```$", "", stripped)

    match = re.search(r"\{.*\}", stripped, flags=re.DOTALL)
    if not match:
        raise ValueError("AI response did not contain a JSON object")

    return json.loads(match.group(0))


def _manual_result(answer_box, student_answer, method):
    return _normalize_result(
        answer_box=answer_box,
        method=method,
        score_percent=0,
        is_correct=None,
        feedback="This answer requires manual review.",
        confidence=0.0,
        trace={"reason": "manual_review"},
        needs_review=True,
    )


def _normalize_result(
    answer_box,
    method,
    score_percent,
    is_correct,
    feedback,
    confidence,
    trace,
    raw_ai_response="",
    needs_review=False,
):
    score_percent = max(0.0, min(100.0, float(score_percent or 0)))
    return {
        "answer_box_id": answer_box.id,
        "box_number": answer_box.box_number,
        "grading_method": method,
        "is_correct": is_correct,
        "score_percent": score_percent,
        "points_earned": (score_percent / 100.0) * float(answer_box.points or 0),
        "points_possible": float(answer_box.points or 0),
        "feedback": feedback,
        "confidence": max(0.0, min(1.0, float(confidence or 0.0))),
        "needs_review": needs_review,
        "grader_trace": trace,
        "raw_ai_response": raw_ai_response,
    }


def _looks_numeric(value):
    return bool(re.fullmatch(r"\s*[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?\s*[A-Za-z°%]*\s*", value))

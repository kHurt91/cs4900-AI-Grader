from .cas_grader import CASGrader
import sympy as sp


class AISymbolicGrader:
    """
    Compatibility symbolic grader.

    Despite the historical name, this implementation is deterministic and uses
    SymPy via CASGrader. The AI fallback now lives in answer_box_grader.py.
    """

    def __init__(self):
        self.cas_grader = CASGrader(tolerance=1e-5)

    def grade_expression(self, student_answer, correct_answer, variables=None):
        result = self.cas_grader.grade_expression(
            student_answer=student_answer,
            correct_answer=correct_answer,
            parameters=None,
        )
        if result.get("is_correct") or not variables:
            return result

        try:
            student_expr = self.cas_grader._parse_expression(student_answer)
            correct_expr = self.cas_grader._parse_expression(correct_answer)
            substitutions = {
                symbol: variables[str(symbol)]
                for symbol in student_expr.free_symbols | correct_expr.free_symbols
                if str(symbol) in variables
            }
            substitutions.update({
                symbol: sp.E
                for symbol in student_expr.free_symbols | correct_expr.free_symbols
                if str(symbol) == "e"
            })
            student_value = float(student_expr.subs(substitutions).evalf())
            correct_value = float(correct_expr.subs(substitutions).evalf())
            tolerance = 1e-5 * max(1.0, abs(correct_value))
            if abs(student_value - correct_value) <= tolerance:
                result["is_correct"] = True
                result["confidence"] = 0.95
                result["reasoning"] = "Expression is numerically equivalent within tolerance."
        except Exception:
            pass

        return result

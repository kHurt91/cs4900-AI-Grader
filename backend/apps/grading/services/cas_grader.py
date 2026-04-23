# backend/apps/grading/services/cas_grader.py
import sympy as sp
from sympy.parsing.latex import parse_latex
import re
from typing import Dict, Any, Tuple
import random


class CASGrader:
    """
    Computer Algebra System grader using SymPy
    Primary grading engine for mathematical expressions
    """

    def __init__(self, tolerance: float = 1e-6):
        self.tolerance = tolerance

    def grade_expression(
        self,
        student_answer: str,
        correct_answer: str,
        parameters: Dict[str, Any] = None,
    ) -> Dict[str, Any]:
        """
        Grade a mathematical expression
        """
        try:
            # Parse both expressions
            student_expr = self._parse_expression(student_answer)
            correct_expr = self._parse_expression(correct_answer)

            # Substitute parameters if provided
            if parameters:
                correct_expr = self._substitute_parameters(correct_expr, parameters)

            # Check equivalency
            is_equivalent, confidence = self._check_equivalency(
                student_expr, correct_expr
            )

            return {
                "is_correct": is_equivalent,
                "confidence": confidence,
                "method": "cas",
                "student_parsed": str(student_expr),
                "expected_parsed": str(correct_expr),
                "reasoning": self._generate_reasoning(
                    student_expr, correct_expr, is_equivalent
                ),
            }

        except Exception as e:
            return {
                "is_correct": None,
                "confidence": 0.0,
                "method": "cas",
                "error": str(e),
                "needs_ai_fallback": True,
            }

    def _parse_expression(self, expr: str) -> sp.Expr:
        """Parse mathematical expression from LaTeX or plain text"""
        expr = expr.strip()

        # If LaTeX detected:
        if "\\" in expr:
            try:
                # Normalize LaTeX exponent syntax: ^2 → ^{2} if missing braces
                expr = re.sub(r"\^(\d+)", r"^{\1}", expr)
                expr = expr.replace("**", "^")
                return parse_latex(expr)
            except Exception as e:
                raise ValueError(
                    f"Could not parse LaTeX expression: {expr}. Error: {e}"
                )

        # Otherwise plain text: SymPy syntax
        try:
            expr = expr.replace("^", "**")  # Power notation
            expr = expr.replace("×", "*")
            expr = expr.replace("÷", "/")
            return sp.sympify(expr)
        except Exception:
            raise ValueError(f"Could not parse expression: {expr}")

    def _substitute_parameters(
        self, expr: sp.Expr, parameters: Dict[str, Any]
    ) -> sp.Expr:
        """Substitute parameter values into expression"""
        substitutions = {}
        for var_name, value in parameters.items():
            substitutions[sp.Symbol(var_name)] = value
        return expr.subs(substitutions)

    def _check_equivalency(self, expr1: sp.Expr, expr2: sp.Expr) -> Tuple[bool, float]:
        """Check if two expressions are mathematically equivalent"""
        try:
            # Method 1: Direct comparison
            if expr1 == expr2:
                return True, 1.0

            # Method 2: Simplify difference
            diff = sp.simplify(expr1 - expr2)
            if diff == 0:
                return True, 0.99

            # Method 3: Numerical evaluation at random points
            if self._numerical_equivalency_check(expr1, expr2):
                return True, 0.95

            # Method 4: Check if ratio is constant
            try:
                ratio = sp.simplify(expr1 / expr2)
                if ratio.is_constant():
                    # Might be equivalent up to a constant factor
                    return False, 0.7  # Partial credit case
            except Exception:
                pass

            return False, 0.0

        except Exception:
            return False, 0.0

    def _numerical_equivalency_check(
        self,
        expr1: sp.Expr,
        expr2: sp.Expr,
        num_tests: int = 10,
        tolerance: float = None,
    ) -> bool:
        """Check equivalency by evaluating at random points"""
        _tolerance = tolerance if tolerance else self.tolerance
        variables = list(expr1.free_symbols | expr2.free_symbols)

        if not variables:
            # No variables, just compare values
            try:
                val1 = float(expr1.evalf())
                val2 = float(expr2.evalf())
                return abs(val1 - val2) < _tolerance
            except Exception:
                return False

        # Test at multiple random points
        for _ in range(num_tests):
            point = {var: random.uniform(-10, 10) for var in variables}
            try:
                val1 = complex(expr1.subs(point).evalf())
                val2 = complex(expr2.subs(point).evalf())
                if abs(val1 - val2) > _tolerance:
                    return False
            except Exception:
                continue

        return True

    def _generate_reasoning(
        self, student_expr: sp.Expr, correct_expr: sp.Expr, is_equivalent: bool
    ) -> str:
        """Generate explanation of grading decision"""
        if is_equivalent:
            if student_expr == correct_expr:
                return "Expression matches exactly."
            else:
                return (
                    f"Expression is mathematically equivalent. "
                    f"Simplified forms: {sp.simplify(student_expr)} ≡ {sp.simplify(correct_expr)}"
                )
        else:
            return (
                f"Expression is not equivalent. "
                f"Your answer: {student_expr}, Expected: {correct_expr}"
            )

from django.test import SimpleTestCase

from apps.grading.services.cas_grader import CASGrader
from apps.grading.services.ai_symbolic_grader import AISymbolicGrader
from apps.grading.services.multi_step_grader import MultiStepGrader


class TestCASGrader(SimpleTestCase):
    def setUp(self):
        self.grader = CASGrader()

    def _grade(self, student, correct, params=None):
        return self.grader.grade_expression(student, correct, params)

    # --- fraction / coefficient equivalence ---

    def test_half_x_fraction_forms_are_equivalent(self):
        self.assertTrue(self._grade("0.5*x", "x/2")["is_correct"])

    def test_half_x_alternate_fraction_forms_are_equivalent(self):
        self.assertTrue(self._grade("1/2*x", "0.5*x")["is_correct"])

    def test_antenna_fraction_l_over_4(self):
        self.assertTrue(self._grade("L/4", "0.25*L")["is_correct"])

    def test_wrong_coefficient_is_incorrect(self):
        self.assertFalse(self._grade("x**2", "x")["is_correct"])

    # --- trig identities ---

    def test_pythagorean_identity(self):
        self.assertTrue(self._grade("sin(x)**2 + cos(x)**2", "1")["is_correct"])

    # --- polynomial simplification ---

    def test_like_terms_combined(self):
        self.assertTrue(self._grade("2*x + 3*x", "5*x")["is_correct"])

    # --- exponential forms ---

    def test_exponential_cosine_equivalent_forms(self):
        self.assertTrue(self._grade("e**(-x)*cos(2*x)", "cos(2*x)/e**x")["is_correct"])

    # --- simple expression cases ---

    def test_exact_sine_match(self):
        self.assertTrue(self._grade("sin(x)", "sin(x)")["is_correct"])

    def test_reordered_expression_is_equivalent(self):
        self.assertTrue(self._grade("L*k*sin(phi)/32", "k*L*sin(phi)/32")["is_correct"])

    def test_wrong_coefficient_in_complex_expression(self):
        self.assertFalse(self._grade("L*k*sin(phi)/16", "k*L*sin(phi)/32")["is_correct"])

    def test_numeric_fraction_equivalence(self):
        self.assertTrue(self._grade("22/4", "5.5")["is_correct"])

    def test_result_has_required_keys(self):
        result = self._grade("L/4", "0.25*L")
        for key in ("is_correct", "confidence", "method", "reasoning"):
            self.assertIn(key, result)


class TestAISymbolicGrader(SimpleTestCase):
    """
    Tests SymPy-based symbolic equivalence in AISymbolicGrader.
    These 9 cases cover the equivalency forms required by the spec.
    An OpenAI key is not required — all cases use SymPy.
    """

    CORRECT = "0.5*e**(-x)*cos(2.0*x)"
    VARIABLES = {"x": 1.0}

    def setUp(self):
        self.grader = AISymbolicGrader()

    def _grade(self, student):
        return self.grader.grade_expression(
            student_answer=student,
            correct_answer=self.CORRECT,
            variables=self.VARIABLES,
        )

    def test_exact_match(self):
        self.assertTrue(self._grade("0.5*e**(-x)*cos(2.0*x)")["is_correct"])

    def test_parentheses_around_coefficient(self):
        self.assertTrue(self._grade("(0.5)*e**(-x)*cos(2.0*x)")["is_correct"])

    def test_explicit_negative_exponent(self):
        self.assertTrue(self._grade("0.5*e**(-1.0*x)*cos(2*x)")["is_correct"])

    def test_parentheses_around_exponential(self):
        self.assertTrue(self._grade("0.5*(e**(-x))*cos(2*x)")["is_correct"])

    def test_fraction_notation(self):
        self.assertTrue(self._grade("(1/2)*e**(-x)*cos(2*x)")["is_correct"])

    def test_division_form(self):
        self.assertTrue(self._grade("e**(-x)/2*cos(2*x)")["is_correct"])

    def test_division_at_end(self):
        self.assertTrue(self._grade("e**(-x)*cos(2*x)/2")["is_correct"])

    def test_reordered_factors(self):
        self.assertTrue(self._grade("(1/2)*cos(2*x)*e**(-x)")["is_correct"])

    def test_numerical_approximation(self):
        self.assertTrue(self._grade("0.499999*cos(2*x)*e**(-x)")["is_correct"])


class TestMultiStepGrader(SimpleTestCase):
    """
    Tests MultiStepGrader with a representative antenna problem.
    No database access — problem data is passed as a plain dict.
    """

    PROBLEM_DATA = {
        "question_text": (
            "Find the antenna far-field pattern. "
            "Show all steps: aperture distribution, Fourier Transform, "
            "change of variable, final expression."
        ),
        "solution_expression": "L/4",
        "solution_explanation": (
            "Step 1: E(x) = rect(4x/L)\n"
            "Step 2: FT gives (L/4)sinc(ωL/8)\n"
            "Step 3: Apply ω = k·sin(φ)\n"
            "Final: L/4"
        ),
    }
    PARAMETERS = {"L": 16, "delta": 0.25}

    def setUp(self):
        self.grader = MultiStepGrader()

    def _grade(self, submission):
        return self.grader.grade_submission(submission, self.PROBLEM_DATA, self.PARAMETERS)

    def test_correct_answer_with_full_work_scores_high(self):
        submission = (
            "Step 1: E(x) = rect(4x/L)\n"
            "Step 2: F{E(x)} = (L/4)sinc(ωL/8)\n"
            "Step 3: Apply change of variable ω = k·sin(φ)\n"
            "Final Answer: L/4"
        )
        result = self._grade(submission)
        self.assertGreater(result["total_score"], 50)

    def test_wrong_coefficient_scores_lower_than_correct(self):
        correct = (
            "Step 1: E(x) = rect(4x/L)\n"
            "Final Answer: L/4"
        )
        wrong = (
            "Step 1: E(x) = rect(4x/L)\n"
            "Final Answer: L/2"
        )
        correct_score = self._grade(correct)["total_score"]
        wrong_score = self._grade(wrong)["total_score"]
        self.assertGreater(correct_score, wrong_score)

    def test_correct_answer_only_no_work(self):
        result = self._grade("L/4")
        self.assertIn("total_score", result)
        self.assertGreaterEqual(result["total_score"], 0)

    def test_equivalent_decimal_form(self):
        result = self._grade("0.25*L")
        self.assertIn("total_score", result)

    def test_result_has_required_keys(self):
        result = self._grade("L/4")
        self.assertIn("total_score", result)

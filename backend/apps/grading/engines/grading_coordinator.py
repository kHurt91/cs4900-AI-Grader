from .symbolic_grader import SymbolicGrader
from .numerical_grader import NumericalGrader
from .pattern_grader import PatternGrader
from .ai_grader import AIGrader


class GradingCoordinator:
    def __init__(self):
        self.symbolic_grader = SymbolicGrader()
        self.numerical_grader = NumericalGrader()
        self.pattern_grader = PatternGrader()
        self.ai_grader = AIGrader()

    def grade_quiz(self, quiz): ...

    def grade(self, problem, student_answer):
        method = self._detect_grading_method(problem, student_answer)

        if method == "symbolic":
            return self.symbolic_grader.grade(
                student_answer, problem.solution_expression
            )
        elif method == "numerical":
            return self.numerical_grader.grade(
                student_answer,
                problem.solution_expression,
                tolerance=problem.answer_tolerance or 0.01,
            )
        elif method == "pattern":
            if "," in problem.solution_expression:
                return self.pattern_grader.grade_sequence(
                    student_answer, problem.solution_expression
                )
            else:
                return self.pattern_grader.grade(
                    student_answer, problem.solution_expression
                )
        else:
            return self.pattern_grader.grade(
                student_answer, problem.solution_expression
            )

    def _detect_grading_method(self, problem, student_answer):
        solution = str(problem.solution_expression).strip()

        if any(
            op in solution.lower()
            for op in ["^", "**", "sin", "cos", "tan", "log", "sqrt"]
        ):
            return "symbolic"

        try:
            float(solution.replace("K", "").replace("°", "").strip())
            return "numerical"
        except:
            pass

        return "pattern" if "," in solution else "pattern"

    def grade_multi_step(self, problem, step_answers):
        results = {"total_score": 0, "steps": [], "method": "multi_step"}

        for i in range(1, problem.total_parts + 1):
            step_answer = step_answers.get(f"step_{i}", "")
            step_result = self.grade(problem, step_answer)
            step_result["step_number"] = i
            results["steps"].append(step_result)
            results["total_score"] += step_result["score"]

        results["total_score"] = results["total_score"] / problem.total_parts
        results["correct"] = results["total_score"] >= 70
        return results

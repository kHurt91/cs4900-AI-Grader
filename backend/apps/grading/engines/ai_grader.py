class AIGrader:
    def grade(self, student_answer, correct_answer, rubric=None, problem_context=None):
        return {
            "score": 50,
            "correct": False,
            "feedback": "AI grading requires API key",
            "method": "ai",
        }

    def provide_hint(self, problem, student_answer):
        return "Review the problem carefully."

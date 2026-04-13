from apps.quizzes.models import Quiz
import random
quiz = Quiz.objects.get(id=18)
qps = list(quiz.quiz_problems.all())
print(f'Total QuizProblems: {len(qps)}')
if qps:
    sel = random.choice(qps)
    print(f'Selected: {sel.problem.title}')
    print(f'Problem ID: {sel.problem.id}')
    print(f'Problem order: {sel.problem_order}')
else:
    print('No QuizProblems found!')

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.quizzes.models import Course, Quiz, QuizProblem, AnswerBox
from apps.problems.models import Problem
from django.utils import timezone
from datetime import timedelta

User = get_user_model()


class Command(BaseCommand):
    help = 'Create Problem 8.3 — 6 variations, blank answer boxes, no hints, unlimited attempts'

    def handle(self, *args, **options):

        instructor, _ = User.objects.get_or_create(
            username='instructor',
            defaults={
                'email': 'instructor@example.com',
                'role': 'instructor',
                'first_name': 'Test',
                'last_name': 'Instructor',
            }
        )
        if not instructor.check_password('password123'):
            instructor.set_password('password123')
            instructor.save()

        course, _ = Course.objects.get_or_create(
            course_code='ECE5950',
            semester='spring',
            year=2026,
            instructor=instructor,
            defaults={
                'title': 'Telecommunications',
                'description': 'Advanced Telecommunications Course',
            }
        )

        Quiz.objects.filter(
            title='Problem 8.3 - Antenna Definitions',
            course=course,
        ).delete()

        quiz = Quiz.objects.create(
            title='Problem 8.3 - Antenna Definitions',
            course=course,
            description=(
                r'Write expressions for the following antenna relationships in Chapter 8. '
                r'Note: for power density terms, irradiance \(P\) is \([\text{W/m}^2]\) '
                r'while intensity \(U\) is \([\text{W/rad}^2]\). '
                r'Also, write any multiple integrals just as a single integral.'
            ),
            quiz_type='homework',
            time_limit=30,
            available_from=timezone.now(),
            available_until=timezone.now() + timedelta(days=365),
            max_attempts=9999,
            show_correct_answers=True,
            is_published=True,
            created_by=instructor,
            total_points=10.0,
        )

        INTRO = (
            r'Write expressions for the following antenna relationships in Chapter 8. '
            r'Note: for power density terms, irradiance \(P\) is \([\text{W/m}^2]\) '
            r'while intensity \(U\) is \([\text{W/rad}^2]\). '
            r'Also, write any multiple integrals just as a single integral.'
        )

        variations = [
            {
                'q1_text':   r'Antenna beam solid angle \(\Omega_p\) in terms of normalized irradiance \(P_n(\theta,\phi)\)',
                'q1_label':  r'\(\Omega_p =\)',
                'q1_answer': r'\int P_n(\theta,\phi)\,d\Omega',
                'q2_text':   r'Average radiation intensity \(U_0\) in terms of radiated power \(W_r\)',
                'q2_label':  r'\(U_0 =\)',
                'q2_answer': r'\frac{W_r}{4\pi}',
            },
            {
                'q1_text':   r'Ratio of irradiances \(\frac{P(R,\theta,\phi)}{P_{\max}}\) in terms of a ratio of radiation intensities \(U\)',
                'q1_label':  r'\(\frac{P(R,\theta,\phi)}{P_{\max}} =\)',
                'q1_answer': r'\frac{U(\theta,\phi)}{U_{\max}}',
                'q2_text':   r'Antenna gain \(G(\Omega)\) in terms of radiation intensity \(U\)',
                'q2_label':  r'\(G(\Omega) =\)',
                'q2_answer': r'\frac{4\pi U(\theta,\phi)}{W_r}',
            },
            {
                'q1_text':   r'Ratio of irradiances \(\frac{P(R,\theta,\phi)}{P_{\max}}\) in terms of a ratio of radiation intensities \(U\)',
                'q1_label':  r'\(\frac{P(R,\theta,\phi)}{P_{\max}} =\)',
                'q1_answer': r'\frac{U(\theta,\phi)}{U_{\max}}',
                'q2_text':   r'Antenna gain \(G(\Omega)\) in terms of radiation intensity \(U\)',
                'q2_label':  r'\(G(\Omega) =\)',
                'q2_answer': r'\frac{4\pi U(\theta,\phi)}{W_r}',
            },
            {
                'q1_text':   r'Antenna radiated power \(W_r\) in terms of radiation intensity \(U\)',
                'q1_label':  r'\(W_r =\)',
                'q1_answer': r'\int U(\theta,\phi)\,d\Omega',
                'q2_text':   r'Antenna beam solid angle \(\Omega_p\) in terms of normalized irradiance \(P_n(\theta,\phi)\)',
                'q2_label':  r'\(\Omega_p =\)',
                'q2_answer': r'\int P_n(\theta,\phi)\,d\Omega',
            },
            {
                'q1_text':   r'Normalized power density \(P_n(\theta,\phi)\) in terms of irradiance \(P(R,\theta,\phi)\)',
                'q1_label':  r'\(P_n(\theta,\phi) =\)',
                'q1_answer': r'\frac{P(R,\theta,\phi)}{P_{\max}}',
                'q2_text':   r'Antenna beam solid angle \(\Omega_p\) in terms of normalized irradiance \(P_n(\theta,\phi)\)',
                'q2_label':  r'\(\Omega_p =\)',
                'q2_answer': r'\int P_n(\theta,\phi)\,d\Omega',
            },
            {
                'q1_text':   r'Normalized power density \(P_n(\theta,\phi)\) in terms of irradiance \(P(R,\theta,\phi)\)',
                'q1_label':  r'\(P_n(\theta,\phi) =\)',
                'q1_answer': r'\frac{P(R,\theta,\phi)}{P_{\max}}',
                'q2_text':   r'Antenna radiated power \(W_r\) in terms of radiation intensity \(U\)',
                'q2_label':  r'\(W_r =\)',
                'q2_answer': r'\int U(\theta,\phi)\,d\Omega',
            },
        ]

        for idx, var in enumerate(variations, start=1):
            question_text = '\n'.join([
                INTRO,
                '',
                '1. ' + var['q1_text'],
                '',
                '[ANSWER_BOX_1]',
                '',
                '2. ' + var['q2_text'],
                '',
                '[ANSWER_BOX_2]',
            ])

            problem = Problem.objects.create(
                title='Antenna Definitions - Variation ' + str(idx),
                difficulty='intermediate',
                author=instructor,
                question_text=question_text,
                solution_expression='',
                solution_explanation='Variation ' + str(idx) + ' of ' + str(len(variations)),
            )

            qp = QuizProblem.objects.create(
                quiz=quiz,
                problem=problem,
                problem_order=idx,
                points=10.0,
            )

            AnswerBox.objects.create(
                quiz_problem=qp,
                box_number=1,
                box_label=var['q1_label'],
                placeholder_text='Enter your LaTeX expression',
                expected_answer=var['q1_answer'],
                answer_template='',
                is_readonly=False,
                points=5.0,
            )

            AnswerBox.objects.create(
                quiz_problem=qp,
                box_number=2,
                box_label=var['q2_label'],
                placeholder_text='Enter your LaTeX expression',
                expected_answer=var['q2_answer'],
                answer_template='',
                is_readonly=False,
                points=5.0,
            )

        self.stdout.write(self.style.SUCCESS('\n=== Problem 8.3 Created ==='))
        self.stdout.write('  Quiz ID      : ' + str(quiz.id))
        self.stdout.write('  Variations   : ' + str(len(variations)))
        self.stdout.write('  Max attempts : 9999 (unlimited)')
        self.stdout.write('  Hints        : none')
        self.stdout.write('  Prefills     : none — all boxes blank')
        self.stdout.write('  Total points : 10.0')            
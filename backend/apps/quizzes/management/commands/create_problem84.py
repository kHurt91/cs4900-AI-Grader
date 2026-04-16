from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.quizzes.models import Course, Quiz, QuizProblem, AnswerBox
from apps.problems.models import Problem
from django.utils import timezone
from datetime import timedelta

User = get_user_model()


class Command(BaseCommand):
    help = 'Create Problem 8.4 — 4 variations matching DOCX exactly'

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

        for s in User.objects.filter(role='student'):
            course.enrolled_students.add(s)

        Quiz.objects.filter(
            title='Problem 8.4 - Antenna Beam Solid Angle Derivation',
            course=course,
        ).delete()

        quiz = Quiz.objects.create(
            title='Problem 8.4 - Antenna Beam Solid Angle Derivation',
            course=course,
            description='Complete the derivation steps to show that the antenna beam solid angle equals 4pi/D_max.',
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

        # ── Correct answers ───────────────────────────────────────────────────
        ANS1 = r'\int P_n(\theta,\phi)\,d\Omega'
        ANS3 = r'\int \frac{U(\Omega)}{U_{\max}}\,d\Omega'
        ANS4 = r'\frac{W_r}{U_{\max}}'
        ANS5 = r'\frac{4\pi}{D_{\max}}'
        LABEL = r'\Omega_p ='

        # ── Header shown on every variation ───────────────────────────────────
        HEADER = (
            'Complete the derivation steps indicated below to show that\n\n'
            r'\[\Omega_p = \frac{4\pi}{D_{\max}}\]'
            '\n\nwhere \u03a9\u209a is the antenna beam pattern and D\u2098\u2090\u02e3 is the directivity.'
        )

        # ── Step text — plain Unicode ─────────────────────────────────────────
        S1 = '1. Write the definition for \u03a9\u209a in terms of P\u2099(\u03b8,\u03c6):'
        S2 = '2. Express the integrand in step 1 in terms of P(R,\u03b8,\u03c6):'
        S3 = '3. Express \u03a9\u209a now in terms of U(\u03a9):'

        # Step 3 with displayed formula (for variations where step 3 is shown)
        S3_SHOWN = (
            '3. Express \u03a9\u209a now in terms of U(\u03a9):\n\n'
            r'\[\Omega_p = \int \frac{U(\Omega)}{U_{\max}}\,d\Omega\]'
        )

        # Step 4 always shows the "two fractions" hint formula, then has a box
        S4_HINT = (
            '4. Express the integral in step 3 as two fractions as shown:\n\n'
            r'\[\int \!\!\! - \!\!\! - \!\!\! - \,\frac{U(\Omega)}{U_0}\, d\Omega\]'
        )

        S5 = '5. Apply the directivity relationships to give the following integral form:'
        S5_FULL = S5 + '\n\nThis integral then evaluates to give the final form desired.'

        # ── 4 Variations matching screenshots exactly ─────────────────────────
        #
        # Screenshot 2 (Variation 1, page 1): boxes on steps 1, 3, 4
        # Screenshot 3 (Variation 2, page 1): boxes on steps 1, 5
        # Screenshot 4 (Variation 3, page 3): boxes on steps 3, 4
        # Screenshot 1 (Variation 4, page 3): boxes on steps 3, 4 (step3 shown differently)

        variations = [

            # ── Variation 1: steps 1, 3, 4 blank (Screenshot 2) ──────────────
            {
                'title': 'Beam Solid Angle Derivation - Variation 1',
                'question_text': '\n\n'.join([
                    HEADER,
                    S1,
                    '[ANSWER_BOX_1]',
                    S2,
                    S3,
                    '[ANSWER_BOX_2]',
                    S4_HINT,
                    '[ANSWER_BOX_3]',
                    S5_FULL,
                ]),
                'boxes': [
                    {'box_number': 1, 'box_label': LABEL, 'expected_answer': ANS1, 'points': 4.0},
                    {'box_number': 2, 'box_label': LABEL, 'expected_answer': ANS3, 'points': 3.0},
                    {'box_number': 3, 'box_label': LABEL, 'expected_answer': ANS4, 'points': 3.0},
                ],
            },

            # ── Variation 2: steps 1, 5 blank (Screenshot 3) ─────────────────
            {
                'title': 'Beam Solid Angle Derivation - Variation 2',
                'question_text': '\n\n'.join([
                    HEADER,
                    S1,
                    '[ANSWER_BOX_1]',
                    S2,
                    S3_SHOWN,
                    S4_HINT,
                    S5,
                    '[ANSWER_BOX_2]',
                    'This integral then evaluates to give the final form desired.',
                ]),
                'boxes': [
                    {'box_number': 1, 'box_label': LABEL, 'expected_answer': ANS1, 'points': 5.0},
                    {'box_number': 2, 'box_label': LABEL, 'expected_answer': ANS5, 'points': 5.0},
                ],
            },

            # ── Variation 3: steps 3, 4 blank (Screenshot 4) ─────────────────
            {
                'title': 'Beam Solid Angle Derivation - Variation 3',
                'question_text': '\n\n'.join([
                    HEADER,
                    S1,
                    S2,
                    S3,
                    '[ANSWER_BOX_1]',
                    S4_HINT,
                    '[ANSWER_BOX_2]',
                    S5_FULL,
                ]),
                'boxes': [
                    {'box_number': 1, 'box_label': LABEL, 'expected_answer': ANS3, 'points': 5.0},
                    {'box_number': 2, 'box_label': LABEL, 'expected_answer': ANS4, 'points': 5.0},
                ],
            },

            # ── Variation 4: steps 3, 4 blank (Screenshot 1) ─────────────────
            {
                'title': 'Beam Solid Angle Derivation - Variation 4',
                'question_text': '\n\n'.join([
                    HEADER,
                    S1,
                    S2,
                    S3,
                    '[ANSWER_BOX_1]',
                    S4_HINT,
                    '[ANSWER_BOX_2]',
                    S5_FULL,
                ]),
                'boxes': [
                    {'box_number': 1, 'box_label': LABEL, 'expected_answer': ANS3, 'points': 5.0},
                    {'box_number': 2, 'box_label': LABEL, 'expected_answer': ANS4, 'points': 5.0},
                ],
            },
        ]

        # ── Build Problems ────────────────────────────────────────────────────
        for idx, var in enumerate(variations, start=1):
            problem = Problem.objects.create(
                title=var['title'],
                difficulty='intermediate',
                author=instructor,
                question_text=var['question_text'],
                solution_expression='',
                solution_explanation='Variation ' + str(idx) + ' of 4',
            )
            qp = QuizProblem.objects.create(
                quiz=quiz,
                problem=problem,
                problem_order=idx,
                points=10.0,
            )
            for box in var['boxes']:
                AnswerBox.objects.create(
                    quiz_problem=qp,
                    box_number=box['box_number'],
                    box_label=box['box_label'],
                    placeholder_text='Enter your LaTeX expression',
                    expected_answer=box['expected_answer'],
                    answer_template='',
                    is_readonly=False,
                    points=box['points'],
                )

        self.stdout.write(self.style.SUCCESS('\n=== Problem 8.4 Created ==='))
        self.stdout.write('  Quiz ID      : ' + str(quiz.id))
        self.stdout.write('  Variations   : 4')
        self.stdout.write('  Max attempts : 9999 (unlimited)')
        self.stdout.write('  Var 1: steps 1,3,4 blank  (3 boxes)')
        self.stdout.write('  Var 2: steps 1,5 blank    (2 boxes)')
        self.stdout.write('  Var 3: steps 3,4 blank    (2 boxes)')
        self.stdout.write('  Var 4: steps 3,4 blank    (2 boxes)')
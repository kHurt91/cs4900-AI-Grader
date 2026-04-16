from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.quizzes.models import Course, Quiz, QuizProblem, AnswerBox
from apps.problems.models import Problem
from django.utils import timezone
from datetime import timedelta

User = get_user_model()


class Command(BaseCommand):
    help = 'Create Problem 8.6 — 3 variations, blank answer boxes, no hints, unlimited attempts'

    def handle(self, *args, **options):

        # ── Instructor ────────────────────────────────────────────────────────
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

        # ── Course ────────────────────────────────────────────────────────────
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

        # ── Enroll all students ───────────────────────────────────────────────
        students = User.objects.filter(role='student')
        for s in students:
            course.enrolled_students.add(s)

        # ── Remove old quiz if present ────────────────────────────────────────
        Quiz.objects.filter(
            title='Problem 8.6 - Aperture Distribution and Far-Field Pattern',
            course=course,
        ).delete()

        # ── Quiz ──────────────────────────────────────────────────────────────
        quiz = Quiz.objects.create(
            title='Problem 8.6 - Aperture Distribution and Far-Field Pattern',
            course=course,
            description=(
                r'Express the aperture distribution \(E(x)\) and derive the '
                r'far-field pattern \(E(\phi)\) using Fourier Transform methods.'
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

        # ── Correct answers ───────────────────────────────────────────────────
        #
        # Variation 1: aperture -L/8 to +L/8  (width = L/4)
        #   E(x)  = rect(4x/L)
        #   E(ω)  = 2sin(Lω/8) / ω
        #   φ     = Lω/8
        #   E(φ)  = (L/4)(sinφ/φ)
        #
        # Variations 2 & 3: aperture -L/4 to +L/4  (width = L/2)
        #   E(x)  = rect(2x/L)
        #   E(ω)  = 2sin(Lω/4) / ω
        #   φ     = Lω/4
        #   E(φ)  = (L/2)(sinφ/φ)

        V1 = {
            'ex':  r'\text{rect}\!\left(\frac{4x}{L}\right)',
            'ew':  r'\frac{2\sin\!\left(\frac{L\omega}{8}\right)}{\omega}',
            'phi': r'\frac{L\omega}{8}',
            'ef':  r'\frac{L}{4}\cdot\frac{\sin\phi}{\phi}',
        }
        V23 = {
            'ex':  r'\text{rect}\!\left(\frac{2x}{L}\right)',
            'ew':  r'\frac{2\sin\!\left(\frac{L\omega}{4}\right)}{\omega}',
            'phi': r'\frac{L\omega}{4}',
            'ef':  r'\frac{L}{2}\cdot\frac{\sin\phi}{\phi}',
        }

        # ── Image placeholder — served from Django static files ───────────────
        # Place image1.jpeg at: static/images/problem8_6_aperture.jpeg
        IMAGE = '[IMAGE:problem8_6_aperture]'

        # ── Question builder ──────────────────────────────────────────────────
        # NOTE: box labels use plain LaTeX (no \(...\) wrappers) to avoid
        # double-rendering. The frontend already wraps them in KaTeX.
        def make_question(region_latex):
            return '\n'.join([
                IMAGE,
                '',
                r'1. Express the aperture distribution \(E(x)\) in mathematical form'
                r' over the aperture \(L\) (in the region '
                + region_latex + r' only):',
                '',
                '[ANSWER_BOX_1]',
                '',
                r'2. Compute (or look up) the Fourier Transform of \(E(x)\) and'
                r' express it in the form \(c_1 f(c_2 \omega)\)'
                r' for some trig or exp type function \(f\):',
                '',
                '[ANSWER_BOX_2]',
                '',
                r'3. Apply a change of variable \(\phi = ?\), so that'
                r' \(f(\phi)\) appears in the final answer:',
                '',
                '[ANSWER_BOX_3]',
                '',
                r'4. The resulting far-field is then:',
                '',
                '[ANSWER_BOX_4]',
            ])

        variations = [

            # ── Variation 1: aperture -L/8 to +L/8 ───────────────────────────
            {
                'title':         'Aperture Distribution Far-Field - Variation 1',
                'question_text': make_question(r'\(-L/8\) to \(+L/8\)'),
                'answers':       V1,
            },

            # ── Variation 2: aperture -L/4 to +L/4 ───────────────────────────
            {
                'title':         'Aperture Distribution Far-Field - Variation 2',
                'question_text': make_question(r'\(-L/4\) to \(+L/4\)'),
                'answers':       V23,
            },

            # ── Variation 3: aperture -L/4 to +L/4 (different seed) ───────────
            {
                'title':         'Aperture Distribution Far-Field - Variation 3',
                'question_text': make_question(r'\(-L/4\) to \(+L/4\)'),
                'answers':       V23,
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
                solution_explanation='Variation ' + str(idx) + ' of ' + str(len(variations)),
            )

            qp = QuizProblem.objects.create(
                quiz=quiz,
                problem=problem,
                problem_order=idx,
                points=10.0,
            )

            ans = var['answers']

            # Box labels: plain LaTeX — no \(...\) wrappers to avoid double render
            AnswerBox.objects.create(
                quiz_problem=qp, box_number=1,
                box_label='E(x) =',
                placeholder_text='Enter your LaTeX expression',
                expected_answer=ans['ex'],
                answer_template='', is_readonly=False, points=2.5,
            )
            AnswerBox.objects.create(
                quiz_problem=qp, box_number=2,
                box_label='E(\\omega) =',
                placeholder_text='Enter your LaTeX expression',
                expected_answer=ans['ew'],
                answer_template='', is_readonly=False, points=2.5,
            )
            AnswerBox.objects.create(
                quiz_problem=qp, box_number=3,
                box_label='\\phi =',
                placeholder_text='Enter your LaTeX expression',
                expected_answer=ans['phi'],
                answer_template='', is_readonly=False, points=2.5,
            )
            AnswerBox.objects.create(
                quiz_problem=qp, box_number=4,
                box_label='E(\\phi) =',
                placeholder_text='Enter your LaTeX expression',
                expected_answer=ans['ef'],
                answer_template='', is_readonly=False, points=2.5,
            )

        # ── Summary ───────────────────────────────────────────────────────────
        self.stdout.write(self.style.SUCCESS('\n=== Problem 8.6 Created ==='))
        self.stdout.write('  Quiz ID      : ' + str(quiz.id))
        self.stdout.write('  Variations   : ' + str(len(variations)))
        self.stdout.write('  Max attempts : 9999 (unlimited)')
        self.stdout.write('  Hints        : none')
        self.stdout.write('  Prefills     : none — all boxes blank')
        self.stdout.write('  Total points : 10.0')
        self.stdout.write('')
        self.stdout.write('  IMPORTANT: Copy the aperture diagram to static files:')
        self.stdout.write('  cp image1.jpeg static/images/problem8_6_aperture.jpeg')
        self.stdout.write('  python3 manage.py collectstatic')
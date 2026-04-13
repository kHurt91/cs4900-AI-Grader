from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.quizzes.models import Course, Quiz, QuizProblem, AnswerBox
from apps.problems.models import Problem
from django.utils import timezone
from datetime import timedelta
import json

User = get_user_model()

class Command(BaseCommand):
    help = 'Create Problem 8.3 with 6 variations matching sponsor PDF'

    def handle(self, *args, **options):
        instructor, _ = User.objects.get_or_create(
            username='instructor',
            defaults={
                'email': 'instructor@example.com',
                'role': 'instructor',
                'first_name': 'Test',
                'last_name': 'Instructor'
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
                'description': 'Advanced Telecommunications Course'
            }
        )

        # Delete old quiz if exists
        old_quiz = Quiz.objects.filter(title='Problem 8.3 - Antenna Definitions', course=course).first()
        if old_quiz:
            old_quiz.delete()

        # Create quiz - 7 attempts, 6 variations
        quiz = Quiz.objects.create(
            title='Problem 8.3 - Antenna Definitions',
            course=course,
            description='Randomized antenna relationship questions with progressive hints',
            quiz_type='homework',
            time_limit=30,
            available_from=timezone.now(),
            available_until=timezone.now() + timedelta(days=30),
            max_attempts=7,
            show_correct_answers=True,
            is_published=True,
            created_by=instructor,
            total_points=10.0,
        )

        # Define 6 variations matching sponsor PDF
        variations = [
            # Variation 1: Ωp + U₀, hint text shown below
            {
                'intro': 'Write expressions for the following antenna relationships in Chapter 8. Note: for power density terms, irradiance P is [W/m²] while intensity U is [W/rad²]. Also, write any multiple integrals just as a single integral.',
                'q1_text': '1. Antenna beam pattern Ωₚ in terms of normalized irradiance Pₙ(θ,φ)',
                'q1_label': 'Ωₚ = ',
                'q1_answer': r'\int P_n(\theta,\phi) \, d\Omega',
                'q1_hint': None,  # No pre-fill
                'q2_text': '2. Average radiation intensity U₀ in terms of radiated power Wᵣ',
                'q2_label': 'U₀ = ',
                'q2_answer': r'\frac{W_r}{4\pi}',
                'q2_hint': None,
                'hint_text': r'Ωₚ = ∫Pₙ(θ,φ)dΩ is given  Second answer is not given.',
            },
            # Variation 2: P/Pmax + G(Ω), no hints
            {
                'intro': 'Write expressions for the following antenna relationships in Chapter 8. Note: for power density terms, irradiance P is [W/m²] while intensity U is [W/rad²]. Also, write any multiple integrals just as a single integral.',
                'q1_text': '1. Ratio of irradiances P(R,θ,φ)/Pₘₐₓ in terms of a ratio of radiation intensities U',
                'q1_label': 'P(R,θ,φ)/Pₘₐₓ = ',
                'q1_answer': r'\frac{U(\theta,\phi)}{U_{\max}}',
                'q1_hint': None,
                'q2_text': '2. Antenna gain G(Ω) in terms of radiation intensity U',
                'q2_label': 'G(Ω) = ',
                'q2_answer': r'\frac{4\pi U(\theta,\phi)}{W_r}',
                'q2_hint': None,
                'hint_text': None,
            },
            # Variation 3: P/Pmax + G(Ω), hint text shown below
            {
                'intro': 'Write expressions for the following antenna relationships in Chapter 8. Note: for power density terms, irradiance P is [W/m²] while intensity U is [W/rad²]. Also, write any multiple integrals just as a single integral.',
                'q1_text': '1. Ratio of irradiances P(R,θ,φ)/Pₘₐₓ in terms of a ratio of radiation intensities U',
                'q1_label': 'P(R,θ,φ)/Pₘₐₓ = ',
                'q1_answer': r'\frac{U(\theta,\phi)}{U_{\max}}',
                'q1_hint': None,
                'q2_text': '2. Antenna gain G(Ω) in terms of radiation intensity U',
                'q2_label': 'G(Ω) = ',
                'q2_answer': r'\frac{4\pi U(\theta,\phi)}{W_r}',
                'q2_hint': None,
                'hint_text': r'\frac{P(R,\theta,\phi)}{P_{\max}} = \frac{U(\Omega)}{U_{\max}} \text{ is given}\n\nSecond answer is not given.',
            },
            # Variation 4: Wr + Ωp, hint text shown below
            {
                'intro': 'Write expressions for the following antenna relationships in Chapter 8. Note: for power density terms, irradiance P is [W/m²] while intensity U is [W/rad²]. Also, write any multiple integrals just as a single integral.',
                'q1_text': '1. Antenna radiated power Wᵣ in terms of radiation intensity U',
                'q1_label': 'Wᵣ = ',
                'q1_answer': r'\int U(\theta,\phi) \, d\Omega',
                'q1_hint': None,
                'q2_text': '2. Antenna beam pattern Ωₚ in terms of normalized irradiance Pₙ(θ,φ)',
                'q2_label': 'Ωₚ = ',
                'q2_answer': r'\int P_n(\theta,\phi) \, d\Omega',
                'q2_hint': None,
                'hint_text': r'Wᵣ = ∫U(Ω)dΩ is given\n\nSecond answer is not given.',
            },
            # Variation 5: Pn + Ωp, BOTH boxes pre-filled
            {
                'intro': 'Write expressions for the following antenna relationships in Chapter 8. Note: for power density terms, irradiance P is [W/m²] while intensity U is [W/rad²]. Also, write any multiple integrals just as a single integral.',
                'q1_text': '1. Normalized power density Pₙ(θ,φ) in terms of irradiance P(R,θ,φ)',
                'q1_label': 'Pₙ(θ,φ) = ',
                'q1_answer': r'\frac{P(R,\theta,\phi)}{P_{\max}}',
                'q1_hint': r'\frac{P(R,\theta,\phi)}{P_{\max}}',  # Pre-filled
                'q2_text': '2. Antenna beam pattern Ωₚ in terms of normalized irradiance Pₙ(θ,φ)',
                'q2_label': 'Ωₚ = ',
                'q2_answer': r'\int P_n(\theta,\phi) \, d\Omega',
                'q2_hint': r'\int P_n(\theta,\phi) \, d\Omega',  # Pre-filled
                'hint_text': None,
            },
            # Variation 6: Pn + Wr, BOTH boxes pre-filled
            {
                'intro': 'Write expressions for the following antenna relationships in Chapter 8. Note: for power density terms, irradiance P is [W/m²] while intensity U is [W/rad²]. Also, write any multiple integrals just as a single integral.',
                'q1_text': '1. Normalized power density Pₙ(θ,φ) in terms of irradiance P(R,θ,φ)',
                'q1_label': 'Pₙ(θ,φ) = ',
                'q1_answer': r'\frac{P(R,\theta,\phi)}{P_{\max}}',
                'q1_hint': r'\frac{P(R,\theta,\phi)}{P_{\max}}',  # Pre-filled
                'q2_text': '2. Antenna radiated power Wᵣ in terms of radiation intensity U',
                'q2_label': 'Wᵣ = ',
                'q2_answer': r'\int U(\theta,\phi) \, d\Omega',
                'q2_hint': r'\int U(\theta,\phi) \, d\Omega',  # Pre-filled
                'hint_text': None,
            },
        ]
        # Create a problem for EACH variation
        for idx, var in enumerate(variations, 1):
                # Build question text with hint if present
            question_parts = [
                var['intro'],
                '',
                var['q1_text'],
                '',
                '[ANSWER_BOX_1]',
                '',
                var['q2_text'],
                '',
                '[ANSWER_BOX_2]'
            ]
            
            # Add hint text at the bottom if present
            if var.get('hint_text'):
                question_parts.extend(['', '', var['hint_text']])
            
            problem = Problem.objects.create(
                title=f'Antenna Definitions - Variation {idx}',
                difficulty='intermediate',
                author=instructor,
                question_text='\n'.join(question_parts),
            
                solution_expression='',
                solution_explanation=f'Variation {idx} of 6'
            )

            qp = QuizProblem.objects.create(
                quiz=quiz,
                problem=problem,
                problem_order=idx,
                points=10.0
            )

            # Box 1
            AnswerBox.objects.create(
                quiz_problem=qp,
                box_number=1,
                box_label=var['q1_label'],
                placeholder_text='Enter your LaTeX expression',
                expected_answer=var['q1_answer'],
                answer_template=var['q1_hint'] if var['q1_hint'] else '',
                is_readonly=bool(var['q1_hint']),
                points=5.0
            )

            # Box 2
            AnswerBox.objects.create(
                quiz_problem=qp,
                box_number=2,
                box_label=var['q2_label'],
                placeholder_text='Enter your LaTeX expression',
                expected_answer=var['q2_answer'],
                answer_template=var['q2_hint'] if var['q2_hint'] else '',
                is_readonly=bool(var['q2_hint']),
                points=5.0
            )

        self.stdout.write(self.style.SUCCESS('\n=== Problem 8.3 Complete ==='))
        self.stdout.write(f'Quiz ID: {quiz.id}')
        self.stdout.write(f'Variations: 6')
        self.stdout.write(f'Max attempts: 7')
        self.stdout.write(f'Total points: 10')
        self.stdout.write('Each variation has different questions and hints')
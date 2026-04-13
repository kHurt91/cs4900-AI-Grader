from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.quizzes.models import Course, Quiz, QuizProblem, AnswerBox
from apps.problems.models import Problem
from django.utils import timezone
from datetime import timedelta

User = get_user_model()

class Command(BaseCommand):
    help = 'Create Problem 8.6 with 3 variations including aperture distribution image'

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
        old_quiz = Quiz.objects.filter(title='Problem 8.6 - Antenna Far-Field Pattern', course=course).first()
        if old_quiz:
            old_quiz.delete()

        # Create quiz - 3 attempts, 3 variations
        quiz = Quiz.objects.create(
            title='Problem 8.6 - Antenna Far-Field Pattern',
            course=course,
            description='Fourier transform problem with aperture distribution diagram',
            quiz_type='homework',
            time_limit=45,
            available_from=timezone.now(),
            available_until=timezone.now() + timedelta(days=30),
            max_attempts=3,
            show_correct_answers=True,
            is_published=True,
            created_by=instructor,
            total_points=20.0,
        )

        # Common intro with image reference
        intro_text = r'''Find the antenna far-field pattern E(φ) for the uniform 1-d aperture distribution E(x) drawn below (Kraus Fig. 6-9), by completing the Fourier transform steps shown. Refer to the Wolframalpha website or this one: fourier.eng.hmc.edu/e101/lectures/handout3/node3.html for Fourier transform examples.

[IMAGE:aperture_distribution]'''

        # Define 3 variations
        variations = [
            # Variation 1: L/4 aperture, 4 boxes, hint at step 2
            {
                'aperture': 'L/4',
                'region': '-L/8 to +L/8',
                'step1_answer': r'\text{rect}(4x/L) = u(x + L/8) - u(x - L/8)',
                'step2_answer': r'\frac{2\sin(L\omega/8)}{\omega}',
                'step3_answer': r'\frac{L\omega}{8}',
                'step4_answer': r'\frac{2\sin(L\omega/8)}{\omega}',
                'hint_text': r'E(\omega) = \frac{2\sin(L\omega/8)}{\omega} \text{ is the solution for step 2. Not all step solutions are given.}',
            },
            # Variation 2: L/2 aperture, 4 boxes, no hints
            {
                'aperture': 'L/2',
                'region': '-L/4 to +L/4',
                'step1_answer': r'\text{rect}(2x/L)',
                'step2_answer': r'\frac{2\sin(L\omega/4)}{\omega}',
                'step3_answer': r'\frac{L\omega}{4}',
                'step4_answer': r'\frac{L\sin(\phi)}{\phi}',
                'hint_text': None,
            },
            # Variation 3: L/2 aperture, all solutions shown
            {
                'aperture': 'L/2',
                'region': '-L/4 to +L/4',
                'step1_answer': r'\text{rect}(2x/L)',
                'step2_answer': r'\frac{2\sin(L\omega/4)}{\omega}',
                'step3_answer': r'\frac{L\omega}{4}',
                'step4_answer': r'\frac{L\sin(\phi)}{2\phi}',
                'hint_text': None,
                'show_all': True,  # All answers shown
            },
        ]

        for idx, var in enumerate(variations, 1):
            question_parts = [intro_text, '']
            
            question_parts.append(f"1. Express the aperture distribution E(x) in mathematical form over the aperture {var['aperture']} (in the region {var['region']} only):")
            question_parts.append('')
            question_parts.append('E(x) = [ANSWER_BOX_1]')
            question_parts.append('')
            
            question_parts.append('2. Compute (or look up) the Fourier Transform of E(x) and express it in the form c₁f(c₂ω)/c₃ for some trig or exp type function f')
            question_parts.append('')
            question_parts.append('E(ω) = [ANSWER_BOX_2]')
            question_parts.append('')
            
            question_parts.append('3. Apply a change of variable φ = ?, so that f(φ) appears in the final answer:')
            question_parts.append('')
            question_parts.append('φ = [ANSWER_BOX_3]')
            question_parts.append('')
            
            question_parts.append('4. The resulting far-field is then:')
            question_parts.append('')
            question_parts.append('E(φ) = [ANSWER_BOX_4]')
            question_parts.append('')
            
            if var.get('hint_text'):
                question_parts.append('')
                question_parts.append(var['hint_text'])

            problem = Problem.objects.create(
                title=f'Antenna Far-Field Pattern - Variation {idx}',
                difficulty='advanced',
                author=instructor,
                question_text='\n'.join(question_parts),
                solution_expression='',
                solution_explanation=f'Variation {idx}: Aperture {var["aperture"]}'
            )

            qp = QuizProblem.objects.create(
                quiz=quiz,
                problem=problem,
                problem_order=idx,
                points=20.0
            )

            # Create 4 answer boxes
            for box_num in range(1, 5):
                answer_key = f'step{box_num}_answer'
                is_readonly = var.get('show_all', False)  # Variation 3 shows all answers
                
                AnswerBox.objects.create(
                    quiz_problem=qp,
                    box_number=box_num,
                    box_label='',
                    placeholder_text='Enter your LaTeX expression',
                    expected_answer=var[answer_key],
                    answer_template=var[answer_key] if is_readonly else '',
                    is_readonly=is_readonly,
                    points=5.0
                )

        self.stdout.write(self.style.SUCCESS('\n=== Problem 8.6 Complete ==='))
        self.stdout.write(f'Quiz ID: {quiz.id}')
        self.stdout.write(f'Variations: 3')
        self.stdout.write(f'Max attempts: 3')
        self.stdout.write(f'Total points: 20')
        self.stdout.write('Includes aperture distribution image')

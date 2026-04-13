from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.quizzes.models import Course, Quiz, QuizProblem, AnswerBox
from apps.problems.models import Problem
from django.utils import timezone
from datetime import timedelta

User = get_user_model()

class Command(BaseCommand):
    help = 'Create Problem 8.4 with 4 variations matching sponsor PDF'

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
        old_quiz = Quiz.objects.filter(title='Problem 8.4 - Beam Pattern Derivation', course=course).first()
        if old_quiz:
            old_quiz.delete()

        # Create quiz - 4 attempts, 4 variations
        quiz = Quiz.objects.create(
            title='Problem 8.4 - Beam Pattern Derivation',
            course=course,
            description='Multi-step derivation with randomized answer box placement and progressive hints',
            quiz_type='homework',
            time_limit=45,
            available_from=timezone.now(),
            available_until=timezone.now() + timedelta(days=30),
            max_attempts=4,
            show_correct_answers=True,
            is_published=True,
            created_by=instructor,
            total_points=25.0,
        )

        # Common derivation steps (5 steps total)
        intro = r'Complete the derivation steps indicated below to show that Ωₚ = 4π/Dₘₐₓ, where Ωₚ is the antenna beam pattern and Dₘₐₓ is the directivity.'
        
        steps_text = [
            r'1. Write the definition for Ωₚ, in terms of Pₙ(θ,φ)',
            r'2. Express the integrand in step 1 in terms of P(R,θ,φ)',
            r'3. Express Ωₚ now in terms of U(Ω)',
            r'4. Express the integral in step 3 as two fractions as shown:',
            r'5. Apply the directivity relationships to give the following integral form: This integral then evaluates to give the final form desired.',
        ]

        # Expected answers for each step
        step_answers = {
            1: r'\int P_n(\theta,\phi) \, d\Omega',
            2: r'\int \frac{P(R,\theta,\phi)}{P_{\max}} \, d\Omega',
            3: r'\int \frac{U(\Omega)}{U_{\max}} \, d\Omega',
            4: r'\frac{U_{\max}}{U_0} \cdot \frac{\int U(\Omega) \, d\Omega}{U_{\max}}',
            5: r'\frac{4\pi}{D_{\max}}',
        }

        # Define 4 variations matching PDF exactly
        variations = [
            # Variation 1 (Page 1): Boxes at 1,3,4 - Hint for step 3
            {
                'box_steps': [1, 3, 4],
                'hint_text': r'\Omega_p = \int \frac{U(\Omega)}{U_{\max}} \, d\Omega \text{ is the solution for step 3. Not all step solutions are given.}',
            },
            # Variation 2 (Page 2): Boxes at 1,5 - No hints
            {
                'box_steps': [1, 5],
                'hint_text': None,
            },
            # Variation 3 (Page 3): Boxes at 3,4 - Hint for step 3
            {
                'box_steps': [3, 4],
                'hint_text': r'\Omega_p = \int \frac{U(\Omega)}{U_{\max}} \, d\Omega \text{ is the solution for step 3. Not all step solutions are given.}',
            },
            # Variation 4 (Page 4): Boxes at 3,4 - Hint for step 4
            {
                'box_steps': [3, 4],
                'hint_text': r'\Omega_p = \frac{U_{\max}}{U_0} \cdot \frac{\int U(\Omega) \, d\Omega}{U_{\max}} \text{ is the solution for step 4. Not all step solutions are given.}',
            },
        ]

        # Create a problem for EACH variation
        for idx, var in enumerate(variations, 1):
            # Build question text
            question_parts = [intro, '']
            
            # Add all 5 steps with answer boxes at specified positions
            box_counter = 1
            for step_num in range(1, 6):
                question_parts.append(steps_text[step_num - 1])
                question_parts.append('')
                
                # Add answer box if this step has one
                if step_num in var['box_steps']:
                    question_parts.append(f'Ωₚ = [ANSWER_BOX_{box_counter}]')
                    question_parts.append('')
                    box_counter += 1
            
            # Add hint text at the bottom if present
            if var['hint_text']:
                question_parts.append('')
                question_parts.append(var['hint_text'])

            problem = Problem.objects.create(
                title=f'Beam Pattern Derivation - Variation {idx}',
                difficulty='advanced',
                author=instructor,
                question_text='\n'.join(question_parts),
                solution_expression='',
                solution_explanation=f'Variation {idx}: Boxes at steps {var["box_steps"]}'
            )

            qp = QuizProblem.objects.create(
                quiz=quiz,
                problem=problem,
                problem_order=idx,
                points=25.0
            )

            # Create answer boxes (NO readonly hints - hints are text only)
            box_num = 1
            for step_num in var['box_steps']:
                AnswerBox.objects.create(
                    quiz_problem=qp,
                    box_number=box_num,
                    box_label='',  # Empty label, Ωₚ = is in the text
                    placeholder_text='Enter your LaTeX expression',
                    expected_answer=step_answers[step_num],
                    answer_template='',
                    is_readonly=False,  # All boxes are editable
                    points=25.0 / len(var['box_steps'])
                )
                box_num += 1

        self.stdout.write(self.style.SUCCESS('\n=== Problem 8.4 Complete ==='))
        self.stdout.write(f'Quiz ID: {quiz.id}')
        self.stdout.write(f'Variations: 4')
        self.stdout.write(f'Max attempts: 4')
        self.stdout.write(f'Total points: 25')
        self.stdout.write('Random box placement with text hints at bottom')
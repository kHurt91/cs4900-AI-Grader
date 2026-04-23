"""
Script to create sample problems from PDF examples
Run with: python manage.py shell < CREATE_SAMPLE_PROBLEMS.py
"""

from apps.problems.models import Problem, ProblemCategory
from apps.users.models import CustomUser

# Get or create author
author = CustomUser.objects.first()

# Create Antenna Theory category
antenna_category, _ = ProblemCategory.objects.get_or_create(
    name="Antenna Theory",
    defaults={"description": "Antenna and electromagnetic field problems"},
)

# Problem 1: Fourier Transform - Triangular Aperture
problem1 = Problem.objects.create(
    title="Antenna Far-Field Pattern - Triangular Aperture",
    description="Find the antenna far-field pattern E(φ) for a triangular aperture distribution",
    category=antenna_category,
    difficulty="advanced",
    question_text=r"""Given a triangular aperture distribution:

E(x) = tri(x/(L/8)) for -L/8 ≤ x ≤ L/8

Complete the following steps:
1. Express the aperture distribution E(x) in mathematical form
2. Compute the Fourier Transform of E(x)
3. Apply a change of variable φ = Lω/16
4. Express the resulting far-field pattern E(φ)""",
    solution_expression=r"sinc^2(phi)",
    solution_explanation="""Step 1: E(x) = tri(x/(L/8)) = (1-8|x|/L) for |x| ≤ L/8
Step 2: Fourier transform of triangular function gives sinc² 
Step 3: Apply change of variable φ = Lω/16
Step 4: Final result: E(φ) = sinc²(φ)""",
    author=author,
    has_multiple_parts=True,
    total_parts=4,
)
print(f"✅ Created problem 1: {problem1.title} (ID: {problem1.id})")

# Problem 2: DSN Temperature Calculation
problem2 = Problem.objects.create(
    title="DSN System Operating Temperature",
    description="Calculate the system operating temperature for 70m DSN antenna",
    category=antenna_category,
    difficulty="intermediate",
    question_text="""Given the following DSN antenna parameters:
- T_CMB = 2.7 K (cosmic background)
- T_atm = 2.7 K, L_atm = 2.6
- T_ant = 3.3 K
- Feed: T_p = 4 K, L_STD = 1.3
- LNA: T_LNA = 4.2 K, G_LNA = 22 dB
- Post Amp: T_PA = 0 K, G_PA = 36 dB

Calculate T_op at location 1, assuming no effects from post amplifier.
Answer in Kelvin.""",
    solution_expression="13.7 K",
    solution_explanation="""Using DSN equations from Table 2-3:
T_i1 = 7 K (using Eqs. 2.2-25 and 2.3-5)
T_e1 = 6.7 K (use Eq. 2.5-3)
T_op1 = T_i1 + T_e1 = 13.7 K""",
    answer_tolerance=0.01,
    author=author,
)
print(f"✅ Created problem 2: {problem2.title} (ID: {problem2.id})")

# Problem 3: Viterbi Encoding
problem3 = Problem.objects.create(
    title="Viterbi (3,1/2) Convolutional Encoding",
    description="Derive the Viterbi code for a given input sequence",
    category=antenna_category,
    difficulty="advanced",
    question_text="""Derive the Viterbi (3,1/2) convolutional code for the message:
u = 1,001

By connecting a chain of 4 arrows on the Viterbi tree, determine the output code x.
What is the code? x = _______""",
    solution_expression="11,101,111",
    solution_explanation="""Following the Viterbi tree for input u = 1,001:
- 1st input (1): produces 11
- 2nd input (0): produces 10  
- 3rd input (0): produces 11
- 4th input (1): produces 11
Final code: x = 11,101,111""",
    author=author,
)
print(f"✅ Created problem 3: {problem3.title} (ID: {problem3.id})")

# Problem 4: Multi-step derivation
problem4 = Problem.objects.create(
    title="Antenna Power Density Relationship",
    description="Prove that P_max = D_max through multi-step derivation",
    category=antenna_category,
    difficulty="expert",
    question_text="""Complete the derivation to show that P_max = D_max:

1. Write the definition for W_r in terms of U(Ω)
2. Express intensity U(Ω) in terms of irradiance P(R,θ,φ)
3. Express P(R,θ,φ) in terms of P_n(θ,φ) 
4. Evaluate the integral
5. Apply directivity relationship to give simplified form""",
    solution_expression="P_max = D_max",
    solution_explanation="""Step-by-step proof:
1. W_r = ∫U(Ω)dΩ
2. U(Ω) = R²P(R,θ,φ)
3. P(R,θ,φ) = P_n(θ,φ) × (factors)
4. Integral evaluates to 4π
5. Using D = 4πU_max/P_rad, we get P_max = D_max""",
    author=author,
    has_multiple_parts=True,
    total_parts=5,
)
print(f"✅ Created problem 4: {problem4.title} (ID: {problem4.id})")

print("\n" + "=" * 60)
print("✅ Successfully created 4 sample problems!")
print("✅ Problems cover:")
print("   - Fourier transforms (symbolic math)")
print("   - DSN calculations (numerical with units)")
print("   - Viterbi coding (pattern matching)")
print("   - Multi-step derivations (partial credit)")
print("=" * 60)

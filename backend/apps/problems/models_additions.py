"""
Additional methods for Problem models
"""

import random


def generate_instance(self, student, assignment=None, seed=None):
    """Generate a unique problem instance for a student"""
    if seed is not None:
        random.seed(seed)

    template_data = self.template_data
    param_values = {}

    # Generate parameter values if defined in template
    if "parameters" in template_data:
        for param_name, param_def in template_data["parameters"].items():
            value = _generate_parameter_value(self, param_def)
            param_values[param_name] = value

    # Render problem text
    rendered_text = template_data.get("question_text", "")
    for param_name, value in param_values.items():
        rendered_text = rendered_text.replace(f"{{{param_name}}}", str(value))

    # Calculate expected answer
    expected_answer = _calculate_answer(self, param_values, template_data)

    # Import here to avoid circular import
    from apps.problems.models_instance import ProblemInstance

    instance, created = ProblemInstance.objects.get_or_create(
        template=self,
        student=student,
        assignment=assignment,
        defaults={
            "parameter_values": param_values,
            "rendered_text": rendered_text,
            "expected_answer": expected_answer,
            "seed": seed,
        },
    )

    return instance


def _generate_parameter_value(self, param_def):
    """Generate random value based on parameter definition"""
    param_type = param_def.get("type", "float")
    min_val = param_def.get("min", 0)
    max_val = param_def.get("max", 100)
    step = param_def.get("step", 1)
    decimal_places = param_def.get("decimal_places", 2)

    if param_type == "integer":
        value = random.randint(int(min_val), int(max_val))
        value = int(value / step) * step
        return int(value)
    elif param_type == "float":
        value = random.uniform(float(min_val), float(max_val))
        value = round(value / step) * step
        value = round(value, decimal_places)
        return float(value)

    return 0


def _calculate_answer(self, param_values, template_data):
    """Calculate expected answer from parameters"""
    solution_template = template_data.get("solution_template", "")

    if not solution_template:
        return ""

    # Render solution
    solution = solution_template
    for param_name, value in param_values.items():
        solution = solution.replace(f"{{{param_name}}}", str(value))

    # Try to evaluate if numerical
    if template_data.get("answer_type") == "numerical":
        try:
            safe_dict = {"__builtins__": {}, "abs": abs, "round": round}
            safe_dict.update(param_values)
            result = eval(solution, safe_dict)
            return str(result)
        except:
            return solution

    return solution


# Attach methods to ProblemTemplate class
# This will be called after the class is defined
from apps.problems.models import ProblemTemplate

ProblemTemplate.generate_instance = generate_instance
ProblemTemplate._generate_parameter_value = _generate_parameter_value
ProblemTemplate._calculate_answer = _calculate_answer

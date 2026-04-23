from django.test import TestCase

import sympy as sp
from apps.grading.services.cas_grader import CASGrader
from apps.grading.serializers import SubmissionSerializer
from apps.grading.models import Submission

from apps.users.models import CustomUser
from apps.users.serializers import UserSerializer


class TestSerializers(TestCase):

    def test_user_serializer(self):
        print("\nRunning user serializer test.\n")
        mock_data = [
            dict(
                zip(
                    UserSerializer.Meta.fields,
                    [None for _ in range(len(SubmissionSerializer.Meta.fields))],
                )
            ),
            dict(
                zip(
                    UserSerializer.Meta.fields,
                    [0,"username","email",1234567,"firstname","lastname","date joined"],
                )
            ),
            dict(
                zip(
                    UserSerializer.Meta.fields,
                    [0,0,"email",1234567,"firstname","lastname","date joined"],
                )
            ),
            dict(
                zip(
                    UserSerializer.Meta.fields,
                    [0,"username","email","string","firstname","lastname","date joined"],
                )
            ),
            dict(
                zip(
                    UserSerializer.Meta.fields,
                    ["","email","firstname","lastname","date joined"],
                )
            )
        ]

        for i, mock_sub in enumerate(mock_data, 1):
            try:
                _ = UserSerializer(mock_sub).data
            except:
                print(f"UserSerializer error iteration number {i}")


    def test_submission_serializer(self):
        mock_data = [
            dict(
                zip(
                    SubmissionSerializer.Meta.fields,
                    [None for _ in range(len(SubmissionSerializer.Meta.fields))],
                )
            ),
            dict(
                zip(
                    SubmissionSerializer.Meta.fields,
                    [0,0,0,"{}",0,"","","","",False,0.0,None,"",0,""],
                )
            ),
            dict(
                zip(
                    SubmissionSerializer.Meta.fields,
                    [CustomUser(),0,0,"{}",0,"","","","",False,0.0,None,"",0,""],
                )
            ),
            dict(
                zip(
                    SubmissionSerializer.Meta.fields,
                    [CustomUser({"role": "student", "timezone": "", "username": ""}),0,0,"{}",0,"","","","",False,0.0,None,"",0,""],
                )
            )
        ]

        for i, mock_sub in enumerate(mock_data, 1):
            try:
                _ = SubmissionSerializer(mock_sub).data
            except:
                print(f"SubmissionSerializer error iteration number {i}")

    def test_submission_fields(self):
        count = 0
        for sub_field in Submission.__dict__:
            if sub_field not in SubmissionSerializer.Meta.fields:
                print(f"sub field <{sub_field}> not in serial.")
                count += 1
        print(f"{count} Submission fields not found in SubmissionSerializer fields.")

    def test_user_fields(self):
        count = 0
        for usr_field in CustomUser.__dict__:
            if usr_field not in UserSerializer.Meta.fields:
                print(f"User field <{usr_field}> not in UserSerializer.")
                count += 1
        print(f"{count} User fields not found in UserSerializer fields.")



# Create your tests here.
class TestGrader(TestCase):

    def test_numerical_equivalency_check(self):
        print()
        print("Running CASGrader test...")
        cas_grader = CASGrader(tolerance=0.000001)
        student_exprs = tuple(
            map(
                cas_grader._parse_expression,
                [
                    "1+1",  # TR3-left and TR9-Left
                    "2+2",  # TR3-left and TR9-Left
                    "1+1+a",  # if not variables  cas_grader.py:line 131 || TR3-Right and TR4-Right
                    "1+1",  # test not equal and > tolerance || TR9-Right
                    "1+1+a",  # test variable not equal   cas_grader.py:line 146 || TR4-Left
                ],
            )
        )
        correct_exprs = tuple(
            map(cas_grader._parse_expression, ["1+1", "2+2", "1+1+a", "1+2", "1+2+a"])
        )

        print(f"\nTolerance = 0.000001")
        i = 1
        for s_expr, c_expr, expected in zip(
            student_exprs, correct_exprs, [True, True, True, False, False]
        ):
            result = cas_grader._numerical_equivalency_check(
                s_expr, c_expr, num_tests=10
            )
            if result == expected:
                print(f"Test {i}. ✅ Pass")
            else:
                print(f"Test {i}. ❌ Failed")
            i += 1

        print("\nTolerance = 1.1")
        cas_grader.tolerance = 1.1
        for s_expr, c_expr, expected in zip(
            student_exprs, correct_exprs, [True, True, True, True, True]
        ):
            result = cas_grader._numerical_equivalency_check(
                s_expr, c_expr, num_tests=10
            )
            if result == expected:
                print(f"Test {i}. ✅ Pass")
            else:
                print(f"Test {i}. ❌ Failed")
            i += 1
        return result


def main():
    grader = TestGrader()
    result = grader.test_numerical_equivalency_check()


if __name__ == "__main__":
    main()

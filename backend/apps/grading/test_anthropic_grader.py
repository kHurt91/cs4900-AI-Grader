from django.test import SimpleTestCase

from apps.grading.services.anthropic_grader import GradingServiceError, _parse_response


class TestAnthropicResponseParser(SimpleTestCase):
    def test_parses_plain_json_with_summary(self):
        results, summary = _parse_response(
            '[{"quiz_number": 1, "earned_points": 8}]\n'
            "quiz_title,win_number,earned_points,overall_feedback,"
        )

        self.assertEqual(results, [{"quiz_number": 1, "earned_points": 8}])
        self.assertEqual(
            summary,
            "quiz_title,win_number,earned_points,overall_feedback,",
        )

    def test_parses_markdown_fenced_json(self):
        results, summary = _parse_response(
            '```json\n[{"quiz_number": 1, "earned_points": 8}]\n```\n'
            "quiz_title,win_number,earned_points,overall_feedback,"
        )

        self.assertEqual(results, [{"quiz_number": 1, "earned_points": 8}])
        self.assertEqual(
            summary,
            "quiz_title,win_number,earned_points,overall_feedback,",
        )

    def test_repairs_missing_comma_between_objects(self):
        results, _summary = _parse_response(
            '[\n'
            '  {"quiz_number": 1, "earned_points": 8}\n'
            '  {"quiz_number": 2, "earned_points": 7}\n'
            ']\n'
        )

        self.assertEqual(
            results,
            [
                {"quiz_number": 1, "earned_points": 8},
                {"quiz_number": 2, "earned_points": 7},
            ],
        )

    def test_parses_nested_arrays(self):
        results, _summary = _parse_response(
            '[[{"quiz_number": 1, "earned_points": 8}]]\n'
        )

        self.assertEqual(results, [[{"quiz_number": 1, "earned_points": 8}]])

    def test_raises_for_response_without_json(self):
        with self.assertRaises(GradingServiceError):
            _parse_response("I could not grade this response.")

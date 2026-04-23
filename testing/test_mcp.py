import asyncio
import unittest
from unittest.mock import AsyncMock, MagicMock, patch
import json
from mcp_logic.submission_test import QuizGraderClient


class TestMCPGradingClient(unittest.IsolatedAsyncioTestCase):

    def setUp(self):
        self.mock_tool_result = MagicMock()
        self.mock_tool_result.content = [MagicMock(text="Tool Result text")]
        self.mock_tool_result.structuredContent = {
            "submission_struct": {"submission_id": 1234},
            "quiz_struct": {"problem_1": "What is 2*2"},
            "user_struct": {"name": "Test Name"},
        }

        self.mock_post_result = MagicMock()
        self.mock_post_result.content = [MagicMock(text="Post Successful")]

    @patch("mcp_logic.submission_test.os.getenv")
    @patch("mcp_logic.submission_test.Anthropic")
    @patch("mcp_logic.submission_test.ClientSession")
    @patch("mcp_logic.submission_test.streamable_http_client")
    async def test_main(
        self,
        mock_streamable_http_client,
        mock_session_class,
        mock_anthropic_class,
        mock_getenv,
    ):
        """Test full AI grading workflow"""

        mock_getenv.return_value = "Fake_API_key"

        # MCP session Mock
        mock_session = AsyncMock()
        mock_session.list_tools.return_value = MagicMock(
            tools=[MagicMock(name="grade_quiz_submission")]
        )
        mock_session.call_tool.side_effect = [
            self.mock_tool_result,
            self.mock_post_result,
        ]

        # Context Managers
        mock_session_class.return_value.__aenter__.return_value = mock_session
        mock_streamable_http_client.return_value.__aenter__.return_value = (
            MagicMock(name="read_stream"),
            MagicMock("write_stream"),
            MagicMock("get_session_id"),
        )

        # Anthropic Mock
        mock_anthropic_instance = mock_anthropic_class.return_value
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text="Quiz Title,123,10,Nice Job!")]
        mock_anthropic_instance.messages.create.return_value = mock_response

        # Execute main
        grader = QuizGraderClient()
        result = await grader.run_grading_workflow(2)

        self.assertEqual(result, 0)
        self.assertTrue(mock_session.initialize.called)
        self.assertEqual(mock_session.call_tool.call_count, 2)

        # Tool calls
        mock_session.call_tool.assert_any_call(
            "grade_quiz_submission", {"student_id": 2}
        )
        mock_session.call_tool.assert_any_call(
            "post_submission",
            {
                "submission_id": self.mock_tool_result.structuredContent[
                    "submission_struct"
                ]["submission_id"],
                "result": "Quiz Title,123,10,Nice Job!",
            },
        )


if __name__ == "__main__":
    unittest.main()

from pathlib import Path

# Import MCP server modules
from mcp.server.fastmcp import FastMCP, Context
from mcp.server.session import ServerSession
from mcp.types import SamplingMessage, TextContent, CallToolResult
import json, asyncio, os, traceback

# Import tools
from tools.submissions import fetch_submission
from tools.quiz import fetch_quiz
from tools.grading import submit_grade
from tools.user import fetch_user

# from tools.grading import send_answers


mcp = FastMCP("AI Symbolic Grader", json_response=True, stateless_http=True)
BASE_PATH = Path.cwd()
RUBRIC_PATH = BASE_PATH / "resources" / "rubrics"

# Register tools


@mcp.tool("Get_submission_using_student_ID")
async def get_submission_quiz(student_id: int):
    submission = fetch_submission(student_id)
    return CallToolResult(
        content=[TextContent(type="text", text=str(submission.__dict__))],
        structuredContent={
            "submission_id": submission.submission_id,
            "quiz_id": submission.quiz_id,
            "student_id": submission.student_id,
            "student_answers": submission.student_answers,
        },
    )


@mcp.tool("Get_quiz_using_quiz_ID")
async def get_quiz(quiz_id: int):
    quiz = fetch_quiz(quiz_id)
    return CallToolResult(
        content=[TextContent(type="text", text=str(quiz.__dict__))],
        structuredContent={
            "quiz_id": quiz.quiz_id,
            "problems": quiz.problems,
            "title": quiz.title,
            "course": quiz.course,
        },
    )


@mcp.tool("Get_user_info")
async def get_user(student_id: int):
    user = fetch_user(student_id)
    return CallToolResult(
        content=[TextContent(type="text", text=str(user.__dict__))],
        structuredContent={
            "student_id": user.student_id,
            "student_email": user.student_email,
            "student_WIN": user.win_number,
        },
    )


@mcp.tool()
def post_submission(result: str):
    return submit_grade(result)


# Register Resources
@mcp.resource("dir://rubrics")
def list_rubrics() -> list[str]:
    return [str(f) for f in RUBRIC_PATH.iterdir()]


@mcp.resource("file://{file_name}/")
def get_rubric(file_name: str) -> str | bytes:
    file_path = RUBRIC_PATH / file_name
    try:
        if file_name.lower().endswith(".pdf"):
            return file_path.read_bytes()
        else:
            return file_path.read_text()
    except FileNotFoundError:
        if file_name.lower().endswith(".pdf"):
            return "PDF not found."
        else:
            return "File not found"


@mcp.tool()
async def grade_quiz_submission(
    student_id: int, ctx: Context[ServerSession, None]
) -> CallToolResult:
    # Grade a quiz submission using AI.

    # fetch required data
    submission_result = await ctx.fastmcp.call_tool(
        "Get_submission_using_student_ID", {"student_id": student_id}
    )
    quiz_data_result = await ctx.fastmcp.call_tool(
        "Get_quiz_using_quiz_ID",
        {"quiz_id": submission_result.structuredContent.get("quiz_id")},
    )
    user_result = await ctx.fastmcp.call_tool(
        "Get_user_info", {"student_id": student_id}
    )

    # Set structured data to another variable
    submission_struct = submission_result.structuredContent
    quiz_struct = quiz_data_result.structuredContent
    user_struct = user_result.structuredContent

    return CallToolResult(
        content=[
            TextContent(type="text", text="Submission, Quiz, and User fetch successful")
        ],
        structuredContent={
            "submission_struct": submission_result.structuredContent,
            "quiz_struct": quiz_data_result.structuredContent,
            "user_struct": user_result.structuredContent,
        },
    )


def main():
    mcp.run(transport="streamable-http")


if __name__ == "__main__":
    main()

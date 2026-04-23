import asyncio
from mcp import ClientSession
from mcp.client.streamable_http import streamable_http_client
from anthropic import Anthropic
from dotenv import load_dotenv
import traceback, json, os

load_dotenv()
anthropic = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


async def main():
    # Set up client, streams and connention to server
    async with streamable_http_client("http://127.0.0.1:8000/mcp") as (
        read_stream,
        write_stream,
        get_session_id,
    ):
        async with ClientSession(read_stream, write_stream) as session:
            await session.initialize()

            # List available tools
            tools = await session.list_tools()
            print(f"Available tools: {[tool.name for tool in tools.tools]}")

            # Call quiz grading tool
            print("Calling grade_quiz_submission Tool...")
            result = await session.call_tool("grade_quiz_submission", {"student_id": 4})
            print(f"Result: {result.content[0].text}")

            # Grading prompt
            grading_prompt = f"""
            Please grade the following quiz submission. For each problem solve the problem based on the question_text field and then grade the students answers against your answers.
            Your answer will be the correct answer in each case.
            The students answers will be in a single string seperated by commas.
            The students answers and the problems are already in the same order.
        
            Student Submission:
            {json.dumps(result.structuredContent['submission_struct'], indent=2)}
        
            Quiz Problems:
            {json.dumps(result.structuredContent['quiz_struct'], indent=2)}

            User Info:
            {json.dumps(result.structuredContent['user_struct'], indent=2)}

            Return the results with this structure: "quiz_title,win_number,earned_points,overall_feedback,"
            """
            grading_prompt_2 = "If x equals 4. What is x*5?"

            # Use sampling to grade the submission
            try:
                response = anthropic.messages.create(
                    model="claude-haiku-4-5-20251001",
                    max_tokens=1000,
                    messages=[{"role": "user", "content": grading_prompt}],
                )
                print(response.content[0].text)
                return 0

            except Exception as e:
                traceback.print_exc()
                return f"An error occured during grading: {str(e)}"


if __name__ == "__main__":
    asyncio.run(main())

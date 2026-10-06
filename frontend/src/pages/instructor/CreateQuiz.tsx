import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { formatApiError } from "../../api/client";
import PageShell from "../../components/PageShell";
import QuizFormFields from "../../components/QuizFormFields";
import { useApi } from "../../api/useApi";
import { useAuth } from "../../context/AuthContext";
import { EMPTY_QUIZ_FORM } from "../../types";
import type { QuizFormState } from "../../types";

function buildQuizPayload(form: QuizFormState, courseId: number, userId: number) {
  return {
    title: form.title,
    course: courseId,
    created_by: userId,
    quiz_type: form.quiz_type,
    time_limit: form.time_limit ? Number(form.time_limit) : null,
    available_from: form.available_from || null,
    available_until: form.available_until || null,
    max_attempts: form.max_attempts ? Number(form.max_attempts) : 1,
    allow_review: form.allow_review,
    total_points: form.total_points ? Number(form.total_points) : 0,
    problems: form.problems.map((p) => ({
      title: p.title,
      question_text: p.question_text,
      question_latex: "",
      correct_answer: p.correct_answer,
      problem_order: p.problem_order,
      points: p.points,
      figure: p.figure || "",
      grading_strategy: p.grading_strategy,
      rubric: p.rubric,
      case_sensitive: p.case_sensitive,
      approximation_tolerance: p.approximation_tolerance ? Number(p.approximation_tolerance) : null,
      answer_boxes: p.parts.length === 0 ? [{
        box_number: 1,
        box_label: "Answer",
        expected_answer: p.correct_answer,
        points: p.points,
        grading_strategy: p.grading_strategy,
        rubric: p.rubric,
        case_sensitive: p.case_sensitive,
        approximation_tolerance: p.approximation_tolerance ? Number(p.approximation_tolerance) : null,
      }] : [],
      parts: p.parts.map((part, i) => ({
        part_number: i + 1,
        part_text: part.text,
        expected_answer: part.correct_answer,
        points: 1,
        allow_partial_credit: true,
        answer_format: "mathematical_expression",
        grading_strategy: part.grading_strategy,
        rubric: part.rubric,
        case_sensitive: part.case_sensitive,
        approximation_tolerance: part.approximation_tolerance ? Number(part.approximation_tolerance) : null,
      })),
    })),
  };
}

export default function CreateQuiz() {
  const { courseId } = useParams<{ courseId: string }>();
  const { loginresult } = useAuth();
  const api = useApi();
  const navigate = useNavigate();
  const [form, setForm] = useState<QuizFormState>(EMPTY_QUIZ_FORM);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: apiError } = await api.POST("/api/quizzes/", {
        body: buildQuizPayload(form, Number(courseId), loginresult!.user.id) as any,
      });

      if (!apiError) {
        navigate(`/instructor/course/${courseId}`, { replace: true });
      } else {
        setError(formatApiError(apiError, "Failed to create quiz."));
      }
    } catch {
      setError("Failed to connect.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageShell>
      <form method="post" onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-3xl bg-white border shadow-sm p-6 md:p-8">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-6">Create Quiz</h1>
          <div className="space-y-6">
            <QuizFormFields form={form} onChange={setForm} error={error} section="meta" />
          </div>
        </div>

        <div className="rounded-3xl bg-white border shadow-sm p-6 md:p-8">
          <h2 className="text-xl font-bold tracking-tight mb-6">Problems</h2>
          <div className="space-y-6">
            <QuizFormFields form={form} onChange={setForm} error={null} section="problems" />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(`/instructor/course/${courseId}`)}
            className="px-8 py-3 rounded-2xl font-bold transition shadow-sm bg-white border hover:shadow"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 rounded-2xl font-bold transition shadow-sm bg-[#4E3629] text-white hover:opacity-95 disabled:opacity-60"
          >
            Submit
          </button>
        </div>
      </form>
    </PageShell>
  );
}

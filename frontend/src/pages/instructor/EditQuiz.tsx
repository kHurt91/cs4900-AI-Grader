import { useEffect, useState } from "react";
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

const toDatetimeLocal = (iso: string | null) => (iso ? iso.slice(0, 16) : "");

export default function EditQuiz() {
  const { courseId, quizId } = useParams<{ courseId: string; quizId: string }>();
  const { loginresult } = useAuth();
  const api = useApi();
  const navigate = useNavigate();
  const [form, setForm] = useState<QuizFormState>(EMPTY_QUIZ_FORM);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loginresult || !quizId) return;

    Promise.all([
      api.GET("/api/quizzes/{id}/", { params: { path: { id: Number(quizId) } } }),
      api.GET("/api/quizzes/{id}/problems/", { params: { path: { id: Number(quizId) } } }),
    ])
      .then(([{ data: meta, error: metaErr }, { data: problems, error: probErr }]) => {
        if (metaErr || probErr) { setError("Failed to load quiz data."); return; }

        setForm({
          title: (meta as any).title ?? "",
          quiz_type: (meta as any).quiz_type ?? "practice",
          time_limit: (meta as any).time_limit != null ? String((meta as any).time_limit) : "",
          available_from: toDatetimeLocal((meta as any).available_from),
          available_until: toDatetimeLocal((meta as any).available_until),
          max_attempts: (meta as any).max_attempts != null ? String((meta as any).max_attempts) : "1",
          allow_review: (meta as any).allow_review ?? true,
          total_points: (meta as any).total_points != null ? String((meta as any).total_points) : "",
          problems: ((problems as unknown as any[]) ?? []).map((qp: any) => {
            const answerBoxes = qp.answer_boxes ?? [];
            const firstBox = answerBoxes[0] ?? {};
            const sourceParts = (qp.parts ?? []).length > 0
              ? qp.parts
              : answerBoxes.length > 1
                ? answerBoxes.map((box: any) => ({
                    part_number: box.box_number,
                    part_text: box.box_label || `Box ${box.box_number}`,
                    expected_answer: box.expected_answer,
                  }))
                : [];
            return {
              title: qp.problem_title ?? "",
              question_text: qp.problem_text ?? "",
              correct_answer: firstBox.expected_answer ?? qp.parts?.[0]?.expected_answer ?? "",
              problem_order: qp.problem_order ?? 1,
              points: qp.points ?? 1,
              figure: qp.figure ?? "",
              figurePreview: qp.figure ?? "",
              grading_strategy: firstBox.grading_strategy ?? "auto",
              rubric: firstBox.rubric ?? "",
              case_sensitive: firstBox.case_sensitive ?? false,
              approximation_tolerance: firstBox.approximation_tolerance != null ? String(firstBox.approximation_tolerance) : "",
              parts: sourceParts.map((part: any, i: number) => {
                const box = answerBoxes.find((candidate: any) => candidate.box_number === part.part_number) ?? {};
                return {
                  label: String.fromCharCode(65 + i),
                  text: part.part_text ?? "",
                  requires_response: true,
                  correct_answer: box.expected_answer ?? part.expected_answer ?? "",
                  grading_strategy: box.grading_strategy ?? "auto",
                  rubric: box.rubric ?? "",
                  case_sensitive: box.case_sensitive ?? false,
                  approximation_tolerance: box.approximation_tolerance != null ? String(box.approximation_tolerance) : "",
                };
              }),
            };
          }),
        });
      })
      .catch(() => setError("Failed to connect."))
      .finally(() => setFetching(false));
  }, [quizId, loginresult]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: apiError } = await api.PUT("/api/quizzes/{id}/", {
        params: { path: { id: Number(quizId) } },
        body: buildQuizPayload(form, Number(courseId), loginresult!.user.id) as any,
      });

      if (!apiError) {
        navigate(`/instructor/course/${courseId}`, { replace: true });
      } else {
        setError(formatApiError(apiError, "Failed to update quiz."));
      }
    } catch {
      setError("Failed to connect.");
    } finally {
      setLoading(false);
    }
  }

  if (fetching) {
    return <PageShell><p className="text-gray-500">Loading...</p></PageShell>;
  }

  return (
    <PageShell>
      <form method="post" onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-3xl bg-white border shadow-sm p-6 md:p-8">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-6">Edit Quiz</h1>
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
            Save Changes
          </button>
        </div>
      </form>
    </PageShell>
  );
}

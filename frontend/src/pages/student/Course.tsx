import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageShell from "../../components/PageShell";
import CourseHeader from "../../components/CourseHeader";
import { useApi } from "../../api/useApi";
import { useAuth } from "../../context/AuthContext";
import type { CourseItem, CourseItemType, Quiz } from "../../types";

function mapQuizzesToCourseItems(quizzes: Quiz[], statusMap: Record<number, string>): CourseItem[] {
  return quizzes.map((quiz) => ({
    id: String(quiz.id),
    type: "Quiz" as CourseItemType,
    title: quiz.title ?? "Untitled Quiz",
    dueText: quiz.available_until
      ? `Due: ${new Date(quiz.available_until).toLocaleString()}`
      : "No due date",
    submissionsText: statusMap[quiz.id] ?? "Not started",
    scoreText: "-",
    evalText: "",
  }));
}

function Pill({ type }: { type: CourseItemType }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
        type === "Assignment" ? "bg-gray-50" : "bg-white",
      ].join(" ")}
    >
      {type}
    </span>
  );
}

export default function StudentCourse() {
  const { courseId } = useParams<{ courseId: string }>();
  const { loginresult, studentCourses } = useAuth();
  const navigate = useNavigate();

  const course = studentCourses.find((c) => c.id === Number(courseId));
  const api = useApi();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [statusMap, setStatusMap] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!loginresult || !courseId) return;

    api.GET("/api/quizzes/", { params: { query: { course: Number(courseId) } } })
      .then(({ data }) => setQuizzes(Array.isArray(data) ? data as Quiz[] : (data as any)?.results ?? []))
      .catch(() => setQuizzes([]));
  }, [courseId, loginresult]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!loginresult || quizzes.length === 0) return;

    Promise.all(
      quizzes.map((quiz) =>
        api.GET("/api/quizzes/{id}/my_attempts/", { params: { path: { id: quiz.id } } })
          .then(({ data }) => {
            const attempts = (data as any)?.attempts ?? [];
            let text = "Not started";
            if (attempts.some((a: any) => a.status === "in_progress")) {
              text = "In progress";
            } else if (attempts.length > 0) {
              text = "Completed";
            }
            return [quiz.id, text] as const;
          })
          .catch(() => [quiz.id, "Not started"] as const)
      )
    ).then((entries) => setStatusMap(Object.fromEntries(entries)));
  }, [quizzes, loginresult]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!course) {
    return (
      <PageShell title="Course not found">
        <button type="button" onClick={() => navigate("/")} className="px-4 py-2 rounded-full bg-white border shadow-sm text-sm font-semibold">
          Back to Home
        </button>
      </PageShell>
    );
  }

  const items = mapQuizzesToCourseItems(quizzes, statusMap);

  return (
    <PageShell>
      <div className="rounded-2xl bg-white border shadow-sm overflow-hidden">
        <div className="h-2 bg-[#FFC72C]" />

        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <CourseHeader course={course} />
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => navigate(`/course/${courseId}/grades`)}
                className="px-4 py-2 rounded-full bg-white border shadow-sm hover:shadow transition text-sm font-semibold"
              >
                Grades
              </button>
              <button
                type="button"
                onClick={() => navigate("/")}
                className="px-4 py-2 rounded-full bg-white border shadow-sm hover:shadow transition text-sm font-semibold"
              >
                Back to courses
              </button>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-12 bg-gray-50 text-xs font-bold text-gray-600 border-b">
              <div className="md:col-span-7 p-3 border-b md:border-b-0 md:border-r">Item</div>
              <div className="md:col-span-3 p-3 border-b md:border-b-0 md:border-r">Completion</div>
              <div className="md:col-span-2 p-3">Score</div>
            </div>

            <div className="divide-y">
              {items.length === 0 ? (
                <div className="p-4 text-sm text-gray-600">No assignments or quizzes yet.</div>
              ) : (
                items.map((it) => (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => {
                      if (it.type === "Quiz") {
                        navigate(`/course/${courseId}/quiz/${it.id}`);
                      } else {
                        alert(`Open: ${it.title}`);
                      }
                    }}
                    className="w-full text-left hover:bg-gray-50 transition"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-12">
                      <div className="md:col-span-7 p-4 md:border-r">
                        <div className="flex items-start justify-between gap-3">
                          <div className="font-bold text-[#4E3629]">{it.title}</div>
                          <div className="shrink-0"><Pill type={it.type} /></div>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">{it.dueText}</div>
                        {it.windowText && <div className="text-xs text-gray-500 mt-1">{it.windowText}</div>}
                      </div>
                      <div className="md:col-span-3 p-4 md:border-r text-sm text-gray-700">
                        {it.submissionsText ?? "-"}
                      </div>
                      <div className="md:col-span-2 p-4 text-sm text-gray-700">
                        {it.scoreText ?? "-"}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

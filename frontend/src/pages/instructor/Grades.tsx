import { useNavigate, useParams } from "react-router-dom";
import PageShell from "../../components/PageShell";
import CourseHeader from "../../components/CourseHeader";
import { useAuth } from "../../context/AuthContext";
import { DEMO_COURSE_ITEMS } from "../../types";
import type { CourseItemType } from "../../types";

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

export default function InstructorGrades() {
  const { courseId } = useParams<{ courseId: string }>();
  const { instructorCourses } = useAuth();
  const navigate = useNavigate();

  const course = instructorCourses.find((c) => c.id === Number(courseId));
  const items = DEMO_COURSE_ITEMS[Number(courseId)] ?? [];

  if (!course) {
    return (
      <PageShell title="Course not found">
        <button type="button" onClick={() => navigate("/")} className="px-4 py-2 rounded-full bg-white border shadow-sm text-sm font-semibold">
          Back to Home
        </button>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="rounded-2xl bg-white border shadow-sm overflow-hidden">
        <div className="h-2 bg-[#FFC72C]" />

        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
            <CourseHeader course={course} />
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => navigate(`/instructor/course/${courseId}`)}
                className="px-4 py-2 rounded-full bg-white border shadow-sm hover:shadow transition text-sm font-semibold"
              >
                Quizzes
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
              <div className="md:col-span-3 p-3 border-b md:border-b-0 md:border-r">Score</div>
              <div className="md:col-span-2 p-3">Eval</div>
            </div>

            <div className="divide-y">
              {items.length === 0 ? (
                <div className="p-4 text-sm text-gray-600">No grades yet.</div>
              ) : (
                items.map((it) => (
                  <div key={it.id} className="grid grid-cols-1 md:grid-cols-12">
                    <div className="md:col-span-7 p-4 md:border-r">
                      <div className="flex items-start justify-between gap-3">
                        <div className="font-bold text-[#4E3629]">{it.title}</div>
                        <div className="shrink-0"><Pill type={it.type} /></div>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">{it.dueText}</div>
                      {it.windowText && <div className="text-xs text-gray-500 mt-1">{it.windowText}</div>}
                    </div>
                    <div className="md:col-span-3 p-4 md:border-r text-sm text-gray-700">
                      {it.scoreText ?? "-"}
                    </div>
                    <div className="md:col-span-2 p-4 text-sm text-gray-700">
                      {it.evalText ?? ""}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

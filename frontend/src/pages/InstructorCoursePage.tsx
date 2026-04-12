import type { Course, CourseItem } from "../types";
import CourseTypePill from "../elements/CourseType";

type Props= {
  selectedInstructorCourse: Course;
  items: CourseItem[];
  onOpenGradebook: () => void;
  onBack: () => void;
};

export default function InstructorCoursePage({
  selectedInstructorCourse,
  items,
  onOpenGradebook,
  onBack,
}: Props) {
  const statusFor = (it: CourseItem) => {
    const s = (it.submissionsText ?? "").toLowerCase();
    if (!s) return "—";
    if (s.includes("not started")) return "Not started";
    if (s.includes("submission")) return "Submissions received";
    return it.submissionsText ?? "—";
  };

  return (
    <div className="rounded-2xl bg-white border shadow-sm overflow-hidden">
      <div className="h-2 bg-[#FFC72C]" />

      <div className="p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="text-sm text-gray-600">
            {selectedInstructorCourse.term} • Instructor:{" "}
            {selectedInstructorCourse.instructor_name}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenGradebook}
              className="px-4 py-2 rounded-full bg-white border shadow-sm hover:shadow transition text-sm font-semibold"
            >
              Gradebook
            </button>

            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2 rounded-full bg-white border shadow-sm hover:shadow transition text-sm font-semibold"
            >
              Back to courses
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border bg-gray-50 p-4">
          <div className="text-xs font-bold text-gray-600">
            Instructor Actions
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => alert("Create Assignment (demo)")}
              className="px-4 py-2 rounded-full bg-white border shadow-sm hover:shadow transition text-sm font-semibold"
            >
              Create Assignment
            </button>

            <button
              type="button"
              onClick={() => alert("Create Quiz (demo)")}
              className="px-4 py-2 rounded-full bg-white border shadow-sm hover:shadow transition text-sm font-semibold"
            >
              Create Quiz
            </button>

            <button
              type="button"
              onClick={() => alert("View Submissions (demo)")}
              className="px-4 py-2 rounded-full bg-white border shadow-sm hover:shadow transition text-sm font-semibold"
            >
              View Submissions
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-12 bg-gray-50 text-xs font-bold text-gray-600">
            <div className="md:col-span-7 p-3 border-b md:border-b-0 md:border-r">
              Item
            </div>
            <div className="md:col-span-3 p-3 border-b md:border-b-0 md:border-r">
              Submissions
            </div>
            <div className="md:col-span-2 p-3">Actions</div>
          </div>

          <div className="divide-y">
            {items.length === 0 ? (
              <div className="p-4 text-sm text-gray-600">
                No assignments or quizzes yet.
              </div>
            ) : (
              items.map((it) => (
                <div key={it.id} className="grid grid-cols-1 md:grid-cols-12">
                  <div className="md:col-span-7 p-4 md:border-r">
                    <div className="flex items-start justify-between gap-3">
                      <div className="font-bold text-[#4E3629]">
                        {it.title}
                      </div>
                      <div className="shrink-0">
                        <CourseTypePill type={it.type} />
                      </div>
                    </div>

                    <div className="text-sm text-gray-600 mt-1">
                      {it.dueText}
                    </div>

                    {it.windowText ? (
                      <div className="text-xs text-gray-500 mt-1">
                        {it.windowText}
                      </div>
                    ) : null}
                  </div>

                  <div className="md:col-span-3 p-4 md:border-r">
                    <div className="text-sm text-gray-700">
                      {it.submissionsText ?? "—"}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Status: {statusFor(it)}
                    </div>
                  </div>

                  <div className="md:col-span-2 p-4 flex md:block items-center gap-2">
                    <button
                      type="button"
                      onClick={() => alert(`Open submissions for: ${it.title} (demo)`)}
                      className="px-3 py-2 rounded-full bg-white border shadow-sm hover:shadow transition text-xs font-semibold"
                    >
                      Submissions
                    </button>

                    <button
                      type="button"
                      onClick={() => alert(`Quick grade: ${it.title} (demo)`)}
                      className="mt-0 md:mt-2 px-3 py-2 rounded-full bg-[#4E3629] text-white border border-[#4E3629] shadow-sm hover:opacity-95 transition text-xs font-semibold"
                    >
                      Gradebook
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
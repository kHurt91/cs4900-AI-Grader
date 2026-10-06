import { useNavigate } from "react-router-dom";
import PageShell from "../components/PageShell";
import { useAuth } from "../context/AuthContext";

export default function Home() {
  const { loginresult, session, studentCourses, instructorCourses } = useAuth();
  const navigate = useNavigate();
  const isInstructor = session?.role === "instructor";

  if (!loginresult || !session) return null;

  return (
    <PageShell>
      <div className="rounded-2xl bg-white border shadow-sm p-6">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
          {isInstructor ? "Instructor Home" : "Student Home"}
        </h1>
        <p className="mt-3 text-gray-700">
          Signed in as <span className="font-semibold">{[loginresult.user.first_name, loginresult.user.last_name].filter(Boolean).join(" ") || loginresult.user.username}</span>{" "}
          ({isInstructor ? "Instructor" : "Student"}).
        </p>

        {isInstructor ? (
          <div className="mt-6">
            <div className="flex items-end justify-between gap-4">
              <div className="text-lg font-extrabold tracking-tight">My Courses</div>
              <div className="text-xs text-gray-500">{instructorCourses.length} teaching</div>
            </div>

            {instructorCourses.length > 0 && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {instructorCourses.map((course) => (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => navigate(`/instructor/course/${course.id}`)}
                    className="text-left rounded-2xl bg-white border shadow-sm hover:shadow-md transition overflow-hidden"
                  >
                    <div className="h-2 bg-[#FFC72C]" />
                    <div className="p-5">
                      <div className="text-base font-bold">{course.course_code}</div>
                      <div className="text-md text-gray-700 mt-1 font-bold">{course.title}</div>
                      <div className="mt-3">
                        <span className="inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-normal bg-gray-50 shadow-sm">
                          {course.semester.charAt(0).toUpperCase() + course.semester.slice(1).toLowerCase()}
                        </span>
                      </div>
                      <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#4E3629]">
                        Open course <span aria-hidden>→</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {instructorCourses.length === 0 && (
              <div className="mt-4 rounded-2xl border bg-gray-50 px-4 py-3 text-sm text-gray-700">
                You're not teaching any courses yet.
              </div>
            )}

            <div className="flex justify-end gap-6 mt-6">
              <button
                type="button"
                onClick={() => navigate("/instructor/create-course")}
                className="px-4 py-2 rounded-full bg-white border shadow-sm hover:shadow transition text-sm font-semibold"
              >
                Create course
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6">
            <div className="flex items-end justify-between gap-4">
              <div className="text-lg font-extrabold tracking-tight">My Courses</div>
              <div className="text-xs text-gray-500">{studentCourses.length} enrolled</div>
            </div>

            {studentCourses.length > 0 && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {studentCourses.map((course) => (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => navigate(`/course/${course.id}`)}
                    className="text-left rounded-2xl bg-white border shadow-sm hover:shadow-md transition overflow-hidden"
                  >
                    <div className="h-2 bg-[#FFC72C]" />
                    <div className="p-5">
                      <div className="text-base font-bold">{course.course_code}</div>
                      <div className="text-md text-gray-700 mt-1 font-bold">{course.title}</div>
                      <div className="mt-3">
                        <span className="inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-normal bg-gray-50 shadow-sm">
                          {course.semester.charAt(0).toUpperCase() + course.semester.slice(1).toLowerCase()}
                        </span>
                      </div>
                      <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#4E3629]">
                        Open course <span aria-hidden>→</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {studentCourses.length === 0 && (
              <div className="mt-4 rounded-2xl border bg-gray-50 px-4 py-3 text-sm text-gray-700">
                You're not enrolled in any courses yet.
              </div>
            )}
          </div>
        )}
      </div>
    </PageShell>
  );
}

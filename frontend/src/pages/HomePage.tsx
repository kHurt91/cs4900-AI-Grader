import type { Course, Role } from "../types";
import { ROLES } from "../types";

type Props= {
  role: Role;
  username: string;
  studentCourses: Course[];
  instructorCourses: Course[];
  onOpenStudentCourse: (course: Course) => void;
  onOpenInstructorCourse: (course: Course) => void;
  onCreateCourse: () => void;
};

export default function HomePage({
  role,
  username,
  studentCourses,
  instructorCourses,
  onOpenStudentCourse,
  onOpenInstructorCourse,
  onCreateCourse,
}: Props) {
  const isInstructor = role === ROLES.instructor;
  const courses = isInstructor ? instructorCourses : studentCourses;

  return (
    <div className="rounded-2xl bg-white border shadow-sm p-6">
      <p className="text-gray-700">
        Signed in as{" "}
        <span className="font-semibold">{username}</span>{" "}
        ({isInstructor ? "Instructor" : "Student"}).
      </p>

      <div className="mt-6">
        <div className="flex items-end justify-between gap-4">
          <div className="text-lg font-extrabold tracking-tight">
            My Courses
          </div>

          <div className="text-xs text-gray-500">
            {courses.length} {isInstructor ? "teaching" : "enrolled"}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <button
              key={course.id}
              type="button"
              onClick={() =>
                isInstructor
                  ? onOpenInstructorCourse(course)
                  : onOpenStudentCourse(course)
              }
              className="text-left rounded-2xl bg-white border shadow-sm hover:shadow-md transition overflow-hidden"
            >
              <div className="h-2 bg-[#FFC72C]" />

              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-bold">{course.code}</div>

                    <div className="text-sm text-gray-700 mt-1">
                      {course.title}
                    </div>
                  </div>

                  <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold bg-gray-50">
                    {course.term}
                  </span>
                </div>

                <div className="text-xs text-gray-500 mt-3">
                  Instructor: {course.instructor_name}
                </div>

                <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#4E3629]">
                  Open course <span aria-hidden>→</span>
                </div>
              </div>
            </button>
          ))}
        </div>

        {courses.length === 0 && (
          <div className="mt-4 rounded-2xl border bg-gray-50 px-4 py-3 text-sm text-gray-700">
            {isInstructor
              ? "You’re not teaching any courses yet."
              : "You’re not enrolled in any courses yet."}
          </div>
        )}

        {isInstructor && (
          <div className="flex justify-end gap-6 mt-4">
            <button
              type="button"
              onClick={onCreateCourse}
              className="px-4 py-2 rounded-full bg-white border shadow-sm hover:shadow transition text-sm font-semibold"
            >
              Create course
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
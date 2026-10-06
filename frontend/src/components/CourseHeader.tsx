import type { Course } from "../types";

function capitalizeSemester(semester: string): string {
  return semester.charAt(0).toUpperCase() + semester.slice(1).toLowerCase();
}

export default function CourseHeader({ course }: { course: Course }) {
  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
        {course.course_code} · {course.title}
      </h1>
      <div className="mt-2 flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-normal bg-gray-50 shadow-sm">
          {capitalizeSemester(course.semester)}
        </span>
        <span className="text-sm text-gray-600">{course.instructor_name}</span>
      </div>
    </div>
  );
}

import type { Course } from "../types";

const API_BASE = "http://127.0.0.1:8000/api";

export async function fetchCoursesRequest(accessToken: string): Promise<Course[]> {
  const response = await fetch(`${API_BASE}/courses/`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error("Failed to fetch courses");
  }

  return data;
}

export async function createCourseRequest(
  formObj: Record<string, FormDataEntryValue>,
  instructorName: string,
  instructorId: number
) {
  const response = await fetch(`${API_BASE}/courses/create_course/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      course_code: formObj.course_code,
      title: formObj.title,
      term: formObj.term,
      instructor_name: instructorName,
      instructor_id: instructorId,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    let errMsg = "";
    Object.entries(data).forEach((i) => {
      errMsg += i[1] + "\n";
    });
    throw new Error(errMsg);
  }

  return data;
}
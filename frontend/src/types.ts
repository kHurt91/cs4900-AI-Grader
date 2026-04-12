export const ROLES = {
  student: "student",
  instructor: "instructor",
} as const;

export type Role = "student" | "instructor";

export type Page =
  | "login"
  | "forgotPassword"
  | "about"
  | "contact"
  | "registration"
  | "home"
  | "course"
  | "grades"
  | "instructorCourse"
  | "instructorGrades"
  | "createCourse";

export type HistoryState = {
  page: Page;
  courseId?: number;
  instructorCourseId?: number;
};

export type Course = {
  id: number;
  code: string;
  title: string;
  term: string;
  instructor_name: string;
};

export type CourseItemType = "Assignment" | "Quiz";

export type CourseItem = {
  id: string;
  type: CourseItemType;
  title: string;
  dueText: string;
  windowText?: string;
  submissionsText?: string;
  scoreText?: string;
  gradeText?: string;
  evalText?: string;
};

export interface User {
  id: number;
  username: string;
  email: string;
  date_joined: string;
  first_name: string;
  last_name: string;
}

export interface Tokens {
  refresh: string;
  access: string;
}

export interface LoginResult {
  user: User;
  tokens: Tokens;
}
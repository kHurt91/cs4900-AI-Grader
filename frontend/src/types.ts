export type Role = "student" | "instructor";

export type Course = {
  id: number;
  course_code: string;
  title: string;
  semester: string;
  instructor_name: string;
};

export type Quiz = {
  id: number;
  title: string;
  description: string;
  course_id: number;
  quiz_type: string;
  problems: Record<string, string>[];
  time_limit: number;
  available_from: string | null;
  available_until: string | null;
  max_attempts: number;
  show_correct_answers: boolean;
  show_solution_after: boolean;
};

export type ProblemOption = {
  id: number;
  title: string;
  question_text: string;
  question_latex?: string;
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

export type User = import("./api/schema").components["schemas"]["User"];

export interface Tokens {
  access: string;
}

export interface LoginResult {
  user: User;
  tokens: Tokens;
}

export type { components } from "./api/schema";
export type Submission = import("./api/schema").components["schemas"]["CourseSubmission"];

export type QuizFormPart = {
  label: string;
  text: string;
  requires_response: boolean;
  correct_answer: string;
  grading_strategy: string;
  rubric: string;
  case_sensitive: boolean;
  approximation_tolerance: string;
};

export type QuizFormProblem = {
  title: string;
  question_text: string;
  correct_answer: string;
  problem_order: number;
  points: number;
  figure: string;
  figurePreview: string;
  grading_strategy: string;
  rubric: string;
  case_sensitive: boolean;
  approximation_tolerance: string;
  parts: QuizFormPart[];
};

export type QuizFormState = {
  title: string;
  quiz_type: string;
  time_limit: string;
  available_from: string;
  available_until: string;
  max_attempts: string;
  allow_review: boolean;
  total_points: string;
  problems: QuizFormProblem[];
};

export const EMPTY_QUIZ_FORM: QuizFormState = {
  title: "",
  quiz_type: "practice",
  time_limit: "",
  available_from: "",
  available_until: "",
  max_attempts: "1",
  allow_review: true,
  total_points: "",
  problems: [],
};

export const DEMO_COURSE_ITEMS: Record<number, CourseItem[]> = {
  4: [
    {
      id: "q6",
      type: "Quiz",
      title: "Week 1 Quiz",
      dueText: "Available now",
      submissionsText: "Not started",
      scoreText: "- / 10",
      evalText: "",
    },
    {
      id: "q7",
      type: "Quiz",
      title: "Midterm Quiz",
      dueText: "Available now",
      submissionsText: "Not started",
      scoreText: "- / 10",
      evalText: "",
    },
  ],
  2: [
    {
      id: "q15",
      type: "Quiz",
      title: "Problem 8.3 - Antenna Definitions",
      dueText: "Available now",
      submissionsText: "Not started",
      scoreText: "- / 10",
      evalText: "Up to 7 attempts",
    },
    {
      id: "q16",
      type: "Quiz",
      title: "Problem 8.4 - Beam Pattern Derivation",
      dueText: "Available now",
      submissionsText: "Not started",
      scoreText: "- / 25",
      evalText: "Up to 4 attempts",
    },
  ],
};

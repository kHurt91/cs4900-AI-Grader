import type { CourseItem } from "./types";

export const DEMO_COURSE_ITEMS: Record<number, CourseItem[]> = {
  1: [
    {
      id: "a1",
      type: "Assignment",
      title: "meow",
      dueText: "Due on Jan 30, 2026 11:59 PM",
      windowText: "Jan 14 - Jan 30",
      submissionsText: "2 Submissions, 1 Files",
      scoreText: "- / 10",
      evalText: "",
    },
    {
      id: "q1",
      type: "Quiz",
      title: "miau",
      dueText: "Due on Feb 18, 2026 11:59 PM",
      submissionsText: "Not started",
      scoreText: "- / 10",
      evalText: "",
    },
  ],
};
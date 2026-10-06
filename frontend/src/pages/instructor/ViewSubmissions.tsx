import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApi } from "../../api/useApi";
import { useAuth } from "../../context/AuthContext";
import type { Submission } from "../../types";

const statusColor = (status: string) => {
  if (status === "submitted" || status === "completed") return "bg-green-100 text-green-700";
  if (status === "in_progress") return "bg-yellow-100 text-yellow-700";
  return "bg-gray-100 text-gray-600";
};

export default function ViewSubmissions() {
  const { courseId } = useParams<{ courseId: string }>();
  const { instructorCourses } = useAuth();
  const navigate = useNavigate();

  const course = instructorCourses.find((c) => c.id === Number(courseId));
  const api = useApi();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [allQuizTitles, setAllQuizTitles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentFilter, setStudentFilter] = useState("");
  const [selectedQuiz, setSelectedQuiz] = useState<string>("all");

  useEffect(() => {
    if (!courseId) return;
    setLoading(true);

    api.GET("/api/grading/get_course_submissions/", { params: { query: { course: Number(courseId) } } })
      .then(({ data }) => {
        setSubmissions(Array.isArray(data) ? (data as unknown as Submission[]) : []);
        setLoading(false);
      })
      .catch(() => { setSubmissions([]); setLoading(false); });

    api.GET("/api/quizzes/", { params: { query: { course: Number(courseId) } } })
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : (data as any)?.results ?? [];
        setAllQuizTitles(list.map((q: any) => q.title));
      })
      .catch(() => setAllQuizTitles([]));
  }, [courseId]); // eslint-disable-line react-hooks/exhaustive-deps

  const quizTitles = ["all", ...allQuizTitles];

  const filtered = submissions.filter((s) => {
    const matchStudent = s.student.toLowerCase().includes(studentFilter.toLowerCase());
    const matchQuiz = selectedQuiz === "all" || s.quiz_title === selectedQuiz;
    return matchStudent && matchQuiz;
  });

  const grouped: Record<string, Submission[]> = {};
  filtered.forEach((s) => {
    if (!grouped[s.quiz_title]) grouped[s.quiz_title] = [];
    grouped[s.quiz_title].push(s);
  });

  return (
    <div>
      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="mb-6">
          <button
            type="button"
            onClick={() => navigate(`/instructor/course/${courseId}`)}
            className="px-4 py-2 rounded-full bg-white border shadow-sm hover:shadow transition text-sm font-semibold"
          >
            ← Back to {course?.course_code ?? "Course"}
          </button>
        </div>
        <div className="rounded-2xl bg-white border shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Student Submissions</h1>
            <span className="text-sm text-gray-500">{filtered.length} total</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">
                Filter by Student
              </label>
              <input
                className="w-full rounded-2xl border bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-[#FFC72C]/60 text-sm"
                placeholder="Type student name..."
                value={studentFilter}
                onChange={(e) => setStudentFilter(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">
                Filter by Quiz
              </label>
              <select
                className="w-full rounded-2xl border bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-[#FFC72C]/60 text-sm"
                value={selectedQuiz}
                onChange={(e) => setSelectedQuiz(e.target.value)}
              >
                {quizTitles.map((title) => (
                  <option key={title} value={title}>
                    {title === "all" ? "All Quizzes" : title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading submissions...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No submissions found.</div>
        ) : (
          Object.entries(grouped).map(([quizTitle, subs]) => (
            <div key={quizTitle} className="mb-8 rounded-2xl bg-white border shadow-sm overflow-hidden">
              <div className="h-2 bg-[#FFC72C]" />
              <div className="px-6 py-4 bg-gray-50 border-b">
                <h2 className="font-bold text-lg text-[#4E3629]">{quizTitle}</h2>
                <p className="text-xs text-gray-500 mt-1">
                  {subs.length} attempt{subs.length !== 1 ? "s" : ""}
                </p>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs font-bold text-gray-600 uppercase tracking-wide border-b">
                  <tr>
                    <th className="text-left p-4">Student</th>
                    <th className="text-left p-4">Attempt</th>
                    <th className="text-left p-4">Status</th>
                    <th className="text-left p-4">Submitted</th>
                    <th className="text-left p-4">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {subs.map((submission, index) => (
                    <tr
                      key={index}
                      className="hover:bg-gray-50 transition cursor-pointer"
                      onClick={() =>
                        navigate(`/instructor/course/${courseId}/submissions/detail`, {
                          state: { submission },
                        })
                      }
                    >
                      <td className="p-4 font-semibold text-[#4E3629]">{submission.student}</td>
                      <td className="p-4 text-gray-500">#{submission.attempt_number}</td>
                      <td className="p-4">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${statusColor(submission.status)}`}>
                          {submission.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="p-4 text-gray-500">{submission.submitted_at || "—"}</td>
                      <td className="p-4 font-semibold">{submission.score ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}
      </main>
    </div>
  );
}

import React, { useEffect, useState } from "react";

type Submission = {
  quiz_title: string;
  quiz_id: number;
  student: string;
  attempt_number: number;
  status: string;
  started_at: string;
  submitted_at: string;
  score: number | string;
};

type Props = {
  courseId: number;
  courseCode: string;
  onBack: () => void;
};

export default function ViewSubmissions({ courseId, courseCode, onBack }: Props) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentFilter, setStudentFilter] = useState("");
  const [selectedQuiz, setSelectedQuiz] = useState<string>("all");

  useEffect(() => {
    fetch(`http://127.0.0.1:8000/api/courses/${courseId}/submissions/`)
      .then(r => r.json())
      .then(data => { setSubmissions(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [courseId]);

  // Get unique quiz titles
  const quizTitles = ["all", ...Array.from(new Set(submissions.map(s => s.quiz_title)))];

  // Filter submissions
  const filtered = submissions.filter(s => {
    const matchStudent = s.student.toLowerCase().includes(studentFilter.toLowerCase());
    const matchQuiz = selectedQuiz === "all" || s.quiz_title === selectedQuiz;
    return matchStudent && matchQuiz;
  });

  // Group by quiz
  const grouped: Record<string, Submission[]> = {};
  filtered.forEach(s => {
    if (!grouped[s.quiz_title]) grouped[s.quiz_title] = [];
    grouped[s.quiz_title].push(s);
  });

  const statusColor = (s: string) => {
    if (s === "submitted" || s === "completed") return "bg-green-100 text-green-700";
    if (s === "in_progress") return "bg-yellow-100 text-yellow-700";
    return "bg-gray-100 text-gray-600";
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-10 bg-gray-50/90 backdrop-blur border-b">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-[#4E3629] flex items-center justify-center text-[#FFC72C] font-black">W</div>
            <div className="leading-tight">
              <div className="font-extrabold tracking-tight">Portal</div>
              <div className="text-xs text-gray-500 -mt-0.5">Western Michigan University</div>
            </div>
          </div>
          <button type="button" onClick={onBack} className="px-4 py-2 rounded-full bg-white border shadow-sm hover:shadow transition text-sm font-semibold">
            ← Back to {courseCode}
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-extrabold tracking-tight">Student Submissions</h1>
          <span className="text-sm text-gray-500">{filtered.length} total</span>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Filter by Student</label>
            <input
              className="w-full rounded-2xl border bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-[#FFC72C]/60 text-sm"
              placeholder="Type student name..."
              value={studentFilter}
              onChange={e => setStudentFilter(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Filter by Quiz</label>
            <select
              className="w-full rounded-2xl border bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-[#FFC72C]/60 text-sm"
              value={selectedQuiz}
              onChange={e => setSelectedQuiz(e.target.value)}
            >
              {quizTitles.map(t => (
                <option key={t} value={t}>{t === "all" ? "All Quizzes" : t}</option>
              ))}
            </select>
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
                <p className="text-xs text-gray-500 mt-1">{subs.length} attempt{subs.length !== 1 ? 's' : ''}</p>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs font-bold text-gray-600 uppercase tracking-wide">
                  <tr>
                    <th className="text-left p-4">Student</th>
                    <th className="text-left p-4">Attempt</th>
                    <th className="text-left p-4">Status</th>
                    <th className="text-left p-4">Submitted</th>
                    <th className="text-left p-4">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {subs.map((s, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition">
                      <td className="p-4 font-semibold text-[#4E3629]">{s.student}</td>
                      <td className="p-4 text-gray-500">#{s.attempt_number}</td>
                      <td className="p-4">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${statusColor(s.status)}`}>
                          {s.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-4 text-gray-500">{s.submitted_at}</td>
                      <td className="p-4 font-semibold">{s.score}</td>
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

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
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetch(`http://127.0.0.1:8000/api/courses/${courseId}/submissions/`)
      .then(r => r.json())
      .then(data => { setSubmissions(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [courseId]);

  const filtered = submissions.filter(s =>
    s.student.toLowerCase().includes(filter.toLowerCase()) ||
    s.quiz_title.toLowerCase().includes(filter.toLowerCase())
  );

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
        <input
          className="w-full mb-6 rounded-2xl border bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-[#FFC72C]/60 text-sm"
          placeholder="Filter by student or quiz name..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
        <div className="rounded-2xl bg-white border shadow-sm overflow-hidden">
          <div className="h-2 bg-[#FFC72C]" />
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading submissions...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No submissions found.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs font-bold text-gray-600 uppercase tracking-wide">
                <tr>
                  <th className="text-left p-4">Student</th>
                  <th className="text-left p-4">Quiz</th>
                  <th className="text-left p-4">Attempt</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-left p-4">Submitted</th>
                  <th className="text-left p-4">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((s, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition">
                    <td className="p-4 font-semibold text-[#4E3629]">{s.student}</td>
                    <td className="p-4 text-gray-700">{s.quiz_title}</td>
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
          )}
        </div>
      </main>
    </div>
  );
}

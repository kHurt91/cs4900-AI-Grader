import React, { useState } from "react";

type Props = {
  courseId: number;
  courseCode: string;
  accessToken: string;
  onCreated: () => void;
};

export default function CreateAssignment({ courseId, courseCode, accessToken, onCreated }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [totalPoints, setTotalPoints] = useState(100);
  const [instructions, setInstructions] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const input = "w-full rounded-2xl border bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-[#FFC72C]/60 focus:border-[#FFC72C] text-sm";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/assignments/create_assignment/", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ course_id: courseId, title, description, instructions, due_date: dueDate, total_points: totalPoints }),
      });
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => onCreated(), 1500);
      } else {
        const err = await res.json();
        setError(JSON.stringify(err));
      }
    } catch {
      setError("Could not connect to server.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-10 bg-gray-50/90 backdrop-blur border-b">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-[#4E3629] flex items-center justify-center text-[#FFC72C] font-black">W</div>
            <div className="leading-tight">
              <div className="font-extrabold tracking-tight">Portal</div>
              <div className="text-xs text-gray-500 -mt-0.5">Western Michigan University</div>
            </div>
          </div>
          <button type="button" onClick={onCreated} className="px-4 py-2 rounded-full bg-white border shadow-sm hover:shadow transition text-sm font-semibold">
            ← Back to {courseCode}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-extrabold tracking-tight mb-2">Create Assignment</h1>
        <p className="text-sm text-gray-500 mb-8">Create a new assignment for students in {courseCode}.</p>

        {success && <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 font-semibold">✅ Assignment created successfully! Redirecting...</div>}
        {error && <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-3xl bg-white border shadow-sm p-6 space-y-5">
            <h2 className="font-bold text-lg text-[#4E3629]">Assignment Details</h2>

            <div>
              <label className="text-sm font-semibold text-gray-700">Assignment Title *</label>
              <input className={`mt-1 ${input}`} placeholder="e.g. Homework 1 – Antenna Fundamentals" value={title} onChange={e => setTitle(e.target.value)} required />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">Description</label>
              <textarea className={`mt-1 ${input} resize-none`} rows={2} placeholder="Brief description of the assignment" value={description} onChange={e => setDescription(e.target.value)} />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">Instructions</label>
              <textarea className={`mt-1 ${input} resize-y`} rows={5} placeholder="Detailed instructions for students..." value={instructions} onChange={e => setInstructions(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-700">Due Date <span className="text-gray-400 font-normal">(optional)</span></label>
                <input type="datetime-local" className={`mt-1 ${input}`} value={dueDate} onChange={e => setDueDate(e.target.value)} />
                <p className="text-xs text-gray-400 mt-1">Leave blank to set due 7 days from now</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">Total Points</label>
                <input type="number" className={`mt-1 ${input}`} value={totalPoints} min={1} onChange={e => setTotalPoints(Number(e.target.value))} />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onCreated} className="px-6 py-3 rounded-2xl border bg-white text-sm font-semibold hover:shadow transition">Cancel</button>
            <button type="submit" disabled={submitting || !title.trim()} className={["px-8 py-3 rounded-2xl font-bold transition shadow-sm text-sm", submitting || !title.trim() ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-[#4E3629] text-white hover:opacity-95"].join(" ")}>
              {submitting ? "Creating..." : "Create Assignment"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

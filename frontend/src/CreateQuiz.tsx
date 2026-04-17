import React, { useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

function KatexPreview({ text }: { text: string }) {
  const regex = /\\\((.+?)\\\)|\\\[(.+?)\\\]/g;
  const nodes: React.ReactNode[] = [];
  let last = 0; let key = 0; let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) nodes.push(<span key={key++} style={{ whiteSpace: "pre-wrap" }}>{text.substring(last, m.index)}</span>);
    if (m[1] !== undefined) { try { const html = katex.renderToString(m[1], { throwOnError: false, displayMode: false }); nodes.push(<span key={key++} dangerouslySetInnerHTML={{ __html: html }} />); } catch { nodes.push(<span key={key++}>{m[0]}</span>); } }
    if (m[2] !== undefined) { try { const html = katex.renderToString(m[2], { throwOnError: false, displayMode: true }); nodes.push(<div key={key++} style={{ margin: "0.5rem 0" }} dangerouslySetInnerHTML={{ __html: html }} />); } catch { nodes.push(<div key={key++}>{m[0]}</div>); } }
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(<span key={key++} style={{ whiteSpace: "pre-wrap" }}>{text.substring(last)}</span>);
  return <div className="text-sm text-gray-800 leading-relaxed">{nodes}</div>;
}

type AnswerBox = { label: string; expected_answer: string; points: number; };
type Problem = { title: string; question_text: string; answer_boxes: AnswerBox[]; };
type Props = { setPage: React.Dispatch<React.SetStateAction<any>>; courseId: number; courseCode: string; accessToken: string; onCreated: () => void; };

export default function CreateQuiz({ setPage, courseId, courseCode, accessToken, onCreated }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [timeLimit, setTimeLimit] = useState(30);
  const [maxAttempts, setMaxAttempts] = useState(9999);
  const [problems, setProblems] = useState<Problem[]>([{ title: "Question 1", question_text: "", answer_boxes: [{ label: "", expected_answer: "", points: 5 }] }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  function addProblem() { setProblems(prev => [...prev, { title: `Question ${prev.length + 1}`, question_text: "", answer_boxes: [{ label: "", expected_answer: "", points: 5 }] }]); }
  function removeProblem(idx: number) { setProblems(prev => prev.filter((_, i) => i !== idx)); }
  function updateProblem(idx: number, field: keyof Problem, value: any) { setProblems(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p)); }

  function addAnswerBox(probIdx: number) {
    setProblems(prev => prev.map((p, i) => {
      if (i !== probIdx) return p;
      const boxNum = p.answer_boxes.length + 1;
      return { ...p, answer_boxes: [...p.answer_boxes, { label: "", expected_answer: "", points: 5 }], question_text: p.question_text + `\n\n[ANSWER_BOX_${boxNum}]` };
    }));
  }
  function removeAnswerBox(probIdx: number, boxIdx: number) { setProblems(prev => prev.map((p, i) => i !== probIdx ? p : { ...p, answer_boxes: p.answer_boxes.filter((_, bi) => bi !== boxIdx) })); }
  function updateAnswerBox(probIdx: number, boxIdx: number, field: keyof AnswerBox, value: any) { setProblems(prev => prev.map((p, i) => i !== probIdx ? p : { ...p, answer_boxes: p.answer_boxes.map((b, bi) => bi === boxIdx ? { ...b, [field]: value } : b) })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setSubmitting(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/quizzes/create_full_quiz/", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ course_id: courseId, title, description, time_limit: timeLimit, max_attempts: maxAttempts, problems }),
      });
      if (res.ok) { setSuccess(true); setTimeout(() => { onCreated(); }, 1500); }
      else { const err = await res.json(); setError(JSON.stringify(err)); }
    } catch { setError("Could not connect to server."); }
    finally { setSubmitting(false); }
  }

  const input = "w-full rounded-2xl border bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-[#FFC72C]/60 focus:border-[#FFC72C] text-sm";

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-10 bg-gray-50/90 backdrop-blur border-b">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-[#4E3629] flex items-center justify-center text-[#FFC72C] font-black">W</div>
            <div className="leading-tight"><div className="font-extrabold tracking-tight">Portal</div><div className="text-xs text-gray-500 -mt-0.5">Western Michigan University</div></div>
          </div>
          <button type="button" onClick={onCreated} className="px-4 py-2 rounded-full bg-white border shadow-sm hover:shadow transition text-sm font-semibold">← Back to {courseCode}</button>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-extrabold tracking-tight mb-2">Create Quiz</h1>
        <p className="text-sm text-gray-500 mb-8">Use <code className="bg-gray-100 px-1 rounded">\( \)</code> for inline math and <code className="bg-gray-100 px-1 rounded">\[ \]</code> for block math. Insert <code className="bg-gray-100 px-1 rounded">[ANSWER_BOX_N]</code> where you want answer boxes.</p>
        {success && <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 font-semibold">✅ Quiz created successfully! Redirecting...</div>}
        {error && <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="rounded-3xl bg-white border shadow-sm p-6 space-y-5">
            <h2 className="font-bold text-lg text-[#4E3629]">Quiz Details</h2>
            <div><label className="text-sm font-semibold text-gray-700">Quiz Title *</label><input className={`mt-1 ${input}`} placeholder="e.g. Problem 8.3 – Antenna Definitions" value={title} onChange={e => setTitle(e.target.value)} required /></div>
            <div><label className="text-sm font-semibold text-gray-700">Description</label><textarea className={`mt-1 ${input} resize-none`} rows={2} placeholder="Brief description (optional)" value={description} onChange={e => setDescription(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-semibold text-gray-700">Time Limit (minutes)</label><input type="number" className={`mt-1 ${input}`} value={timeLimit} min={1} onChange={e => setTimeLimit(Number(e.target.value))} /></div>
              <div><label className="text-sm font-semibold text-gray-700">Max Attempts</label><input type="number" className={`mt-1 ${input}`} value={maxAttempts} min={1} onChange={e => setMaxAttempts(Number(e.target.value))} /><p className="text-xs text-gray-400 mt-1">Use 9999 for unlimited</p></div>
            </div>
          </div>
          {problems.map((prob, pi) => (
            <div key={pi} className="rounded-3xl bg-white border shadow-sm p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-lg text-[#4E3629]">Question {pi + 1}</h2>
                {problems.length > 1 && <button type="button" onClick={() => removeProblem(pi)} className="text-xs text-red-500 hover:underline">Remove question</button>}
              </div>
              <div><label className="text-sm font-semibold text-gray-700">Question Title</label><input className={`mt-1 ${input}`} placeholder="e.g. Antenna Definitions" value={prob.title} onChange={e => updateProblem(pi, "title", e.target.value)} /></div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-semibold text-gray-700">Question Text</label>
                  <button type="button" onClick={() => setPreviewIndex(previewIndex === pi ? null : pi)} className="text-xs text-[#4E3629] font-semibold hover:underline">{previewIndex === pi ? "Hide preview" : "Show preview"}</button>
                </div>
                <textarea className={`${input} resize-y font-mono`} rows={6} placeholder={"Write your question here.\nUse \\( \\Omega_p \\) for inline math.\nInsert [ANSWER_BOX_1] where you want the first answer box."} value={prob.question_text} onChange={e => updateProblem(pi, "question_text", e.target.value)} />
                {previewIndex === pi && prob.question_text && (
                  <div className="mt-3 rounded-2xl border bg-gray-50 p-4">
                    <div className="text-xs text-gray-400 font-semibold mb-2">PREVIEW</div>
                    <KatexPreview text={prob.question_text.replace(/\[ANSWER_BOX_\d+\]/g, "[ answer box ]")} />
                  </div>
                )}
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-3">Answer Boxes</div>
                <div className="space-y-4">
                  {prob.answer_boxes.map((box, bi) => (
                    <div key={bi} className="rounded-2xl border bg-gray-50 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Answer Box {bi + 1} → <code>[ANSWER_BOX_{bi + 1}]</code></span>
                        {prob.answer_boxes.length > 1 && <button type="button" onClick={() => removeAnswerBox(pi, bi)} className="text-xs text-red-400 hover:underline">Remove</button>}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div><label className="text-xs font-semibold text-gray-600">Box Label (LaTeX)</label><input className={`mt-1 ${input}`} placeholder="\\Omega_p =" value={box.label} onChange={e => updateAnswerBox(pi, bi, "label", e.target.value)} /><p className="text-xs text-gray-400 mt-1">Shown next to input box</p></div>
                        <div><label className="text-xs font-semibold text-gray-600">Expected Answer (LaTeX)</label><input className={`mt-1 ${input}`} placeholder="\\int P_n d\\Omega" value={box.expected_answer} onChange={e => updateAnswerBox(pi, bi, "expected_answer", e.target.value)} /><p className="text-xs text-gray-400 mt-1">Hidden from students</p></div>
                        <div><label className="text-xs font-semibold text-gray-600">Points</label><input type="number" className={`mt-1 ${input}`} value={box.points} min={0.5} step={0.5} onChange={e => updateAnswerBox(pi, bi, "points", Number(e.target.value))} /></div>
                      </div>
                      {box.expected_answer && (() => { try { return <div className="rounded-xl border bg-white px-3 py-2"><span className="text-xs text-gray-400 font-semibold">Preview: </span><span dangerouslySetInnerHTML={{ __html: katex.renderToString(box.expected_answer, { throwOnError: false, displayMode: false }) }} /></div>; } catch { return null; } })()}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => addAnswerBox(pi)} className="mt-3 px-4 py-2 rounded-full border border-dashed border-gray-300 hover:border-[#4E3629] text-sm font-semibold text-gray-600 hover:text-[#4E3629] transition">+ Add answer box</button>
              </div>
            </div>
          ))}
          <button type="button" onClick={addProblem} className="w-full py-4 rounded-3xl border-2 border-dashed border-gray-300 hover:border-[#4E3629] text-sm font-bold text-gray-500 hover:text-[#4E3629] transition">+ Add another question</button>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onCreated} className="px-6 py-3 rounded-2xl border bg-white text-sm font-semibold hover:shadow transition">Cancel</button>
            <button type="submit" disabled={submitting || !title.trim()} className={["px-8 py-3 rounded-2xl font-bold transition shadow-sm text-sm", submitting || !title.trim() ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-[#4E3629] text-white hover:opacity-95"].join(" ")}>{submitting ? "Creating..." : "Create Quiz"}</button>
          </div>
        </form>
      </main>
    </div>
  );
}

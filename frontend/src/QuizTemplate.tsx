// Enhanced Quiz Template with Inline Answer Boxes
import React, { useState, useRef, useEffect } from "react";
import "katex/dist/katex.min.css";
import katex from "katex";

type QuizPage = "quiz" | "details" | "submit";

interface Props {
  setPage: React.Dispatch<React.SetStateAction<any>>;
  quizId: number;
}

interface AnswerBox {
  id: number;
  box_number: number;
  box_label: string;
  placeholder_text: string;
  expected_answer: string;
  points: number;
  answer_template: string;
  is_readonly: boolean;
}

interface Question {
  id: number;
  problem_text: string;
  problem_title: string;
  problem_order: number;
  points: number;
  answer_boxes: AnswerBox[];
}

interface Quiz {
  id: number;
  title: string;
  time_limit: number;
  description: string;
}

// Replace react-katex with direct katex rendering
const InlineMath = ({ math }: { math: string }) => {
  try {
    const html = katex.renderToString(math, { throwOnError: false, displayMode: false });
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  } catch { return <span>{math}</span>; }
};

const BlockMath = ({ math }: { math: string }) => {
  try {
    const html = katex.renderToString(math, { throwOnError: false, displayMode: true });
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
  } catch { return <div>{math}</div>; }
};

export default function Quiztemplate({ setPage, quizId }: Props) {
  const [page, setLocalPage] = useState<QuizPage>("quiz");
  const [boxAnswers, setBoxAnswers] = useState<Record<number, string>>({});
  const [activeMathBoxId, setActiveMathBoxId] = useState<number | null>(null);
  const [mathInput, setMathInput] = useState<string>("");
  const [activeQuestion, setActiveQuestion] = useState<number | null>(null);

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  
  const [attemptId, setAttemptId] = useState<string | null>(null);
  

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const attemptCreatedRef = useRef<boolean>(false);

  useEffect(() => {
    attemptCreatedRef.current = false;
    const initQuiz = async () => {
      try {
        const quizResponse = await fetch(`http://127.0.0.1:8000/api/quizzes/${quizId}/`);
        if (quizResponse.ok) {
          const quizData = await quizResponse.json();
          setQuiz(quizData);
          setTimeRemaining(quizData.time_limit * 60);
        }
      } catch (err) { console.error('Failed to load quiz:', err); }

      const newAttemptId = await createAttempt();
      if (newAttemptId) {
        try {
          const response = await fetch(
            `http://127.0.0.1:8000/api/quizzes/${quizId}/problems/?attempt_id=${newAttemptId}`
          );
          if (response.ok) {
            const data = await response.json();
            setQuestions(data);
          }
        } catch (err) { console.error('Failed to fetch problems:', err); }
      }
      setLoading(false);
    };
    initQuiz();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId]);

  useEffect(() => {
    if (timeRemaining > 0 && page === "quiz") {
      const timer = setTimeout(() => setTimeRemaining(timeRemaining - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeRemaining === 0 && quiz && page === "quiz") {
      handleSubmit();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRemaining, page]);

  useEffect(() => {
    if (page === "quiz" && !loading) {
      const interval = setInterval(() => saveAnswers(), 30000);
      return () => clearInterval(interval);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boxAnswers, page, loading]);

  const createAttempt = async () => {
    if (attemptCreatedRef.current) return;
    attemptCreatedRef.current = true;
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/quizzes/${quizId}/start_attempt/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        setAttemptId(data.attempt_id);
        return data.attempt_id;
      } else {
        const error = await response.json();
        if (response.status === 400) alert(error.error);
        attemptCreatedRef.current = false;
        return null;
      }
    } catch (err) {
      attemptCreatedRef.current = false;
      return null;
    }
  };

  const saveAnswers = async () => {
    setSaving(true);
    try {
      localStorage.setItem(`quiz_${quizId}_answers`, JSON.stringify({ boxAnswers, timestamp: new Date().toISOString() }));
      setLastSaved(new Date());
    } catch (err) { console.error('Failed to save:', err); }
    finally { setSaving(false); }
  };

  const handleSubmit = async () => {
    await saveAnswers();
    if (attemptId) {
      try {
        await fetch(`http://127.0.0.1:8000/api/quizzes/${quizId}/submit_attempt/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attempt_id: attemptId, answers: boxAnswers }),
        });
      } catch (err) { console.error('Failed to submit:', err); }
    }
    setLocalPage("submit");
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const answeredCount = questions.reduce((count, q) => {
    if (!q.answer_boxes || q.answer_boxes.length === 0) return count;
    const fillable = q.answer_boxes.filter(box => !box.is_readonly);
    const allAnswered = fillable.every(box => boxAnswers[box.id]?.trim());
    return count + (allAnswered ? 1 : 0);
  }, 0);

  useEffect(() => {
    const handleScroll = () => {
      let current: number | null = null;
      questions.forEach((q) => {
        const el = document.getElementById(`question-${q.id}`);
        if (!el) return;
        const rect = el.getBoundingClientRect();
        if (rect.top <= 150 && rect.bottom >= 150) current = q.id;
      });
      setActiveQuestion(current);
    };
    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [questions]);

  const scrollToQuestion = (id: number) => {
    const el = document.getElementById(`question-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleBoxInput = (boxId: number, value: string) => {
    setBoxAnswers(prev => ({ ...prev, [boxId]: value }));
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => saveAnswers(), 2000);
  };

  const openMathPopup = (boxId: number) => {
    setActiveMathBoxId(boxId);
    setMathInput(boxAnswers[boxId] || "");
  };

  const insertMath = () => {
    if (activeMathBoxId !== null && mathInput) {
      setBoxAnswers(prev => ({ ...prev, [activeMathBoxId]: mathInput }));
      setActiveMathBoxId(null);
      setMathInput("");
    }
  };

  const isAnswered = (qid: number) => {
    const q = questions.find(question => question.id === qid);
    if (!q || !q.answer_boxes) return false;
    return q.answer_boxes.every(box => boxAnswers[box.id]?.trim());
  };

  const renderTextWithMath = (text: string): React.ReactNode[] => {
  const parts: React.ReactNode[] = [];
  const regex = /\\\((.+?)\\\)|\\\[(.+?)\\\]/g;
  let lastIndex = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  const addPlainText = (chunk: string) => {
    const lines = chunk.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i]) parts.push(React.createElement('span', { key: key++ }, lines[i]));
      if (i < lines.length - 1) parts.push(React.createElement('br', { key: key++ }));
    }
  };

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      addPlainText(text.substring(lastIndex, match.index));
    }
    if (match[1] !== undefined) {
      parts.push(<InlineMath key={key++} math={match[1]} />);
    }
    if (match[2] !== undefined) {
      parts.push(<div key={key++} className="my-2"><BlockMath math={match[2]} /></div>);
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    addPlainText(text.substring(lastIndex));
  }

  return parts;
};

  const renderLabel = (label: string): React.ReactNode => {
    try {
      const html = katex.renderToString(label, { throwOnError: false, displayMode: false });
      return <span dangerouslySetInnerHTML={{ __html: html }} />;
    } catch { return <span>{label}</span>; }
  };

  const renderQuestionText = (question: Question) => {
    const text = question.problem_text;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    question.answer_boxes.forEach((box) => {
      const placeholder = `[ANSWER_BOX_${box.box_number}]`;
      const index = text.indexOf(placeholder, lastIndex);
      if (index !== -1) {
        if (index > lastIndex) {
          const textChunk = text.substring(lastIndex, index);
          const imageMatch = textChunk.match(/\[IMAGE:([^\]]+)\]/);
          if (imageMatch) {
            parts.push(
              <span key={`text-${lastIndex}`}>
                {renderTextWithMath(textChunk.substring(0, imageMatch.index))}
                <div className="my-4 flex justify-center">
                  <img src={`http://127.0.0.1:8000/static/images/${imageMatch[1]}.png`} alt={imageMatch[1]} className="max-w-full h-auto border rounded" />
                </div>
                {renderTextWithMath(textChunk.substring(imageMatch.index! + imageMatch[0].length))}
              </span>
            );
          } else {
            parts.push(<span key={`text-${lastIndex}`}>{renderTextWithMath(textChunk)}</span>);
          }
        }

        parts.push(
          <div key={`box-${box.id}`} className="my-4">
            <div className="font-medium mb-2 text-gray-800">
              {renderLabel(box.box_label)}
              <span className="text-sm text-gray-500 ml-2">({box.points} pts)</span>
            </div>
            <div className="p-3 border-2 border-gray-400 rounded-lg bg-gray-50">
              <div className="relative">
                {box.is_readonly ? (
                  <div className="w-full border-2 border-green-300 rounded-md p-4 min-h-[100px] bg-green-50">
                    <div className="text-xs text-green-700 mb-2 font-semibold">Given:</div>
                    <BlockMath math={box.answer_template} />
                  </div>
                ) : (
                  <>
                    <textarea
                      value={boxAnswers[box.id] || ""}
                      onChange={(e) => handleBoxInput(box.id, e.target.value)}
                      placeholder="Enter your LaTeX expression"
                      className="w-full border-2 border-gray-300 rounded-md p-4 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-[#4E3629] focus:border-[#4E3629] font-mono text-base bg-white"
                    />
                    <button type="button" onClick={() => openMathPopup(box.id)}
                      className="absolute bottom-3 right-3 text-gray-500 hover:text-black text-2xl font-bold" title="Insert Math">
                      ∑
                    </button>
                  </>
                )}
              </div>
              {boxAnswers[box.id] && (
                <div className="mt-3 p-3 bg-white border-2 border-gray-200 rounded">
                  <div className="text-xs text-gray-600 mb-1 font-medium">Preview:</div>
                  <BlockMath math={boxAnswers[box.id]} />
                </div>
              )}
            </div>
          </div>
        );
        lastIndex = index + placeholder.length;
      }
    });

    if (lastIndex < text.length) {
      parts.push(<span key={`text-${lastIndex}`}>{renderTextWithMath(text.substring(lastIndex))}</span>);
    }
    return <div className="leading-relaxed">{parts}</div>;
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-xl font-semibold">Loading quiz...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center px-4 py-12">
      <div className="hidden md:flex flex-col gap-3 fixed top-32 left-8 w-20">
        {questions.map((q, index) => (
          <button key={q.id} onClick={() => scrollToQuestion(q.id)}
            className={["w-full py-2 rounded-xl border text-sm font-semibold transition flex items-center justify-center gap-1",
              activeQuestion === q.id ? "bg-[#4E3629] text-white border-[#4E3629]"
              : isAnswered(q.id) ? "bg-green-100 border-green-400" : "hover:bg-gray-50"].join(" ")}>
            Q{index + 1}{isAnswered(q.id) && <span className="text-green-600">✓</span>}
          </button>
        ))}
      </div>

      <div className="w-full max-w-4xl bg-white rounded-3xl border shadow-lg p-8 md:p-12">
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => setPage("course")} className="text-sm font-semibold text-gray-600 hover:text-black">← Exit Quiz</button>
          <div className="text-center">
            <h1 className="text-2xl font-extrabold text-[#4E3629]">{quiz?.title || "Quiz"}</h1>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className={`text-lg font-bold ${timeRemaining < 300 ? 'text-red-600' : 'text-gray-700'}`}>{formatTime(timeRemaining)}</div>
            <div className="text-xs text-gray-500">{answeredCount}/{questions.length} answered</div>
          </div>
        </div>

        {lastSaved && (
          <div className="text-xs text-gray-500 text-right mb-4">
            {saving ? 'Saving...' : `Last saved: ${lastSaved.toLocaleTimeString()}`}
          </div>
        )}

        {page === "quiz" && (
          <>
            <div className="space-y-10">
              {questions.map((q, index) => (
                <div key={q.id} id={`question-${q.id}`} className="border-b pb-8">
                  <h2 className="text-xl font-bold mb-4 text-[#4E3629]">Question {index + 1}: {q.problem_title}</h2>
                  <div className="text-gray-700 leading-relaxed">{renderQuestionText(q)}</div>
                </div>
              ))}
            </div>
            <div className="mt-10 flex gap-4">
              <button onClick={() => saveAnswers()} disabled={saving}
                className="flex-1 rounded-2xl border border-[#4E3629] text-[#4E3629] py-3 font-bold hover:bg-gray-50 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Progress'}
              </button>
              <button onClick={() => setLocalPage("details")}
                className="flex-1 rounded-2xl bg-[#4E3629] text-white py-3 font-bold hover:opacity-90">Review Answers</button>
            </div>
          </>
        )}

        {page === "details" && (
          <>
            <h1 className="text-3xl font-extrabold mb-6 text-center">Review Answers</h1>
            <div className="space-y-6">
              {questions.map((q, index) => (
                <div key={q.id} className="border-b pb-4">
                  <p className="font-semibold mb-2">Question {index + 1}: {q.problem_title}</p>
                  {q.answer_boxes && q.answer_boxes.map(box => (
                    <div key={box.id} className="mb-3 pl-4">
                      <div className="text-sm font-medium text-gray-600">{renderLabel(box.box_label)}</div>
                      {boxAnswers[box.id] ? (
                        <div className="mt-1 p-2 bg-gray-50 rounded"><BlockMath math={boxAnswers[box.id]} /></div>
                      ) : (
                        <p className="text-red-500 italic text-sm">Not answered</p>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="mt-8 flex gap-4">
              <button onClick={() => setLocalPage("quiz")} className="flex-1 rounded-2xl border py-3 font-semibold hover:bg-gray-50">Edit Answers</button>
              <button onClick={handleSubmit} className="flex-1 rounded-2xl bg-[#4E3629] text-white py-3 font-bold hover:opacity-90">Submit Quiz</button>
            </div>
          </>
        )}

        {page === "submit" && (
          <div className="text-center">
            <h1 className="text-3xl font-extrabold mb-4">Submitted 🎉</h1>
            <p className="text-gray-600 mb-4">Your answers have been submitted successfully.</p>
            <div className="flex gap-4 justify-center mt-6">
              <button onClick={() => window.location.reload()}
                className="rounded-2xl border-2 border-[#4E3629] text-[#4E3629] px-6 py-3 font-semibold hover:bg-gray-50">Try Again</button>
              <button onClick={() => setPage("course")}
                className="rounded-2xl bg-[#4E3629] text-white px-6 py-3 font-semibold hover:opacity-90">Return to Course</button>
            </div>
          </div>
        )}
      </div>

      {activeMathBoxId !== null && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/25 z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg flex flex-col gap-4 w-[420px]">
            <p className="font-semibold">Enter LaTeX Expression:</p>
            <textarea value={mathInput} onChange={(e) => setMathInput(e.target.value)}
              className="w-full border rounded-xl p-2 font-mono" placeholder="e.g. \frac{W_r}{4\pi}" rows={3} />
            <div className="min-h-[60px] border rounded-xl p-2 bg-gray-50">
              {mathInput && <BlockMath math={mathInput} />}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setActiveMathBoxId(null); setMathInput(""); }}
                className="px-4 py-2 border rounded-xl hover:bg-gray-50">Cancel</button>
              <button onClick={insertMath} className="px-4 py-2 bg-[#4E3629] text-white rounded-xl hover:opacity-90">Insert</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
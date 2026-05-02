// some things to add that is back end stuff sort of:
// autosaving answers, a timer, an extra detail page just for instructions

// Enhanced Quiz Template with Timer, Autosave, and Backend Integration
import React, { useState, useRef, useEffect } from "react";
import katex from "katex";
import { BlockMath } from "react-katex";
import { InlineMath } from "react-katex";

type QuizPage = "quiz" | "details" | "submit";

interface Props {
  onExit: () => void;
  onSubmitted?: () => void;
  quizId?: number;
  userId?: number;
  course?: any;
}

interface Question {
  id: number;
  text: string;
  latex?: string;
  type: "multiple" | "text";
  options?: string[];
  problem_text?: string;
  problem_title?: string;
  figure?: string;
  parts?: {
    id: number;
    part_number: number;
    part_text: string;
    expected_answer: string;
    points: number;
    allow_partial_credit: boolean;
    answer_format: string;
  }[];
}

interface Quiz {
  id: number;
  title: string;
  time_limit: number;
  description: string;
}

export default function QuizTemplate({ onExit, onSubmitted, quizId, userId}: Props) {
  const [page, setLocalPage] = useState<QuizPage>("quiz");
  const [multipleAnswers, setMultipleAnswers] = useState<Record<string, string>>({});
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({});
  const [activeMathId, setActiveMathId] = useState<string | null>(null);
  const [mathInput, setMathInput] = useState<string>("");
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null);
  
  // New states for timer and data
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [aiResults, setAiResults] = useState<any[]>([]);

  const textRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const caretRanges = useRef<Record<string, Range>>({});
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);



    async function handleQuizSubmission(e: React.FormEvent) {
      e.preventDefault();
      await saveAnswers();
      setLocalPage("details");
    }
  

  // Fetch quiz data from backend
  useEffect(() => {
    fetchQuizData();
  }, [quizId]);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining > 0 && page === "quiz") {
      const timer = setTimeout(() => {
        setTimeRemaining(timeRemaining - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (quiz?.time_limit && timeRemaining === 0 && quiz && page === "quiz") {
      // Auto-submit when time runs out
      handleSubmit();
    }
  }, [timeRemaining, page]);

  useEffect(() => {
    questions.forEach((q) => {
      const el = textRefs.current[q.id];
      if (el && textAnswers[q.id] && el.innerHTML !== textAnswers[q.id]) {
        el.innerHTML = textAnswers[q.id];
      }
    });
  }, [page]);

  // Autosave answers every 30 seconds
  useEffect(() => {
    if (page === "quiz" && !loading) {
      const interval = setInterval(() => {
        saveAnswers();
      }, 30000); // 30 seconds
      return () => clearInterval(interval);
    }
  }, [multipleAnswers, textAnswers, page, loading]);

  const fetchQuizData = async () => {
    try {
      // Fetch quiz details
      const quizResponse = await fetch(`http://127.0.0.1:8000/api/quizzes/${quizId}/`);
      if (quizResponse.ok) {
        const quizData = await quizResponse.json();
        setQuiz(quizData);
        setTimeRemaining(quizData.time_limit * 60); // Convert minutes to seconds
      }

      // Fetch quiz problems
      const problemsResponse = await fetch(`http://127.0.0.1:8000/api/quizzes/${quizId}/problems/`);
      if (problemsResponse.ok) {
        const problemsData = await problemsResponse.json();
        // Convert backend problems to Question format
        const formattedQuestions: Question[] = problemsData.map((p: any) => ({
          id: p.linked_problem_id ?? p.id,
          text: p.problem_text || p.problem_title || "Question",
          latex: p.problem_latex || undefined,
          type: "text" as const,
          problem_text: p.problem_text,
          problem_title: p.problem_title,
          figure: p.figure || p.figure_url || undefined,
          parts: p.parts || [],
        }));
        setQuestions(formattedQuestions);
      }
    } catch (err) {
      console.error('Failed to load quiz:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveAnswers = async () => {
    setSaving(true);
    try {
      // Save to localStorage as backup
      localStorage.setItem(`quiz_${quizId}_answers`, JSON.stringify({
        multipleAnswers,
        textAnswers,
        timestamp: new Date().toISOString()
      }));
      setLastSaved(new Date());
    } catch (err) {
      console.error('Failed to save answers:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    await saveAnswers();

    try {
      const response = await fetch("http://127.0.0.1:8000/api/grading/submit/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quiz_id: quizId,
          student_id: userId,
          content: {
            text: textAnswers,
            multiple: multipleAnswers,
          },
        })
      });

      if (!response.ok) {
        alert("Failed to submit quiz.");
        return;
      }

      const data = await response.json();
      setAiResults(data.results || []);

      onSubmitted?.();

      setLocalPage("submit");
    } catch (err) {
      alert("Failed to submit quiz.");
    }
  };

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Progress counter
  const answeredCount = questions.filter((q) => {
    if (multipleAnswers[q.id]) return true;
    if (!isTextEmpty(textAnswers[String(q.id)])) return true;

    if (q.parts && q.parts.length > 0) {
      return q.parts.every((part) => {
        const key = `${q.id}_${part.id}`;
        return !isTextEmpty(textAnswers[key]);
      });
    }

    return false;
  }).length;

  // Detect which question is visible
  useEffect(() => {
    const handleScroll = () => {
      let current: number | null = null;
      questions.forEach((q) => {
        const el = document.getElementById(`question-${q.id}`);
        if (!el) return;
        const rect = el.getBoundingClientRect();
        if (rect.top <= 150 && rect.bottom >= 150) {
          current = q.id;
        }
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

  const selectAnswer = (qid: string, option: string) => {
    setMultipleAnswers((prev) => ({ ...prev, [qid]: option }));
    // Trigger autosave after a delay
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => saveAnswers(), 2000);
  };

  const handleInput = (qid: string) => {
    const el = textRefs.current[qid];
    if (el) {
      setTextAnswers((prev) => ({
        ...prev,
        [qid]: el.innerHTML,
      }));
      // Trigger autosave after a delay
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => saveAnswers(), 2000);
    }
  };

  const saveCaret = (qid: string) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    caretRanges.current[qid] = sel.getRangeAt(0).cloneRange();
  };

  const openMathPopup = (qid: string) => {
    setActiveMathId(qid);
    setMathInput("");
  };

  const insertMathAtCaret = () => {
    if (activeMathId === null || !mathInput) return;

    const container = textRefs.current[activeMathId];
    if (!container) return;

    const mathWrapper = document.createElement("span");
    mathWrapper.contentEditable = "false";
    mathWrapper.style.display = "inline-block";
    mathWrapper.className = "math-block";

    mathWrapper.innerHTML = katex.renderToString(mathInput, {
      throwOnError: false,
    });

    const spaceNode = document.createTextNode(" ");
    const range = caretRanges.current[activeMathId];

    if (range) {
      range.deleteContents();
      range.insertNode(spaceNode);
      range.insertNode(mathWrapper);

      const newRange = document.createRange();
      newRange.setStartAfter(spaceNode);
      newRange.collapse(true);

      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(newRange);
      }
    } else {
      container.appendChild(mathWrapper);
      container.appendChild(spaceNode);
    }

    handleInput(activeMathId);
    setActiveMathId(null);
    setMathInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent, qid: string) => {
    if (e.key !== "Backspace") return;

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    if (!range.collapsed) return;

    const node = range.startContainer;

    if (node.nodeType === Node.TEXT_NODE && range.startOffset === 0) {
      const previousSibling = node.previousSibling as HTMLElement | null;
      if (previousSibling && previousSibling.classList?.contains("math-block")) {
        e.preventDefault();
        previousSibling.remove();
      }
    }
  };

  const isAnswered = (qid: number) => {
    const question = questions.find((q) => q.id === qid);

    if (multipleAnswers[qid] || !isTextEmpty(textAnswers[String(qid)])) {
      return true;
    }

    if (question?.parts && question.parts.length > 0) {
      return question.parts.every((part) => {
        const key = `${qid}_${part.id}`;
        return !isTextEmpty(textAnswers[key]);
      });
    }

    return false;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold">Loading quiz...</div>
        </div>
      </div>
    );
  }

  function renderTextWithLatex(text: string) {
    const parts = text.split(/(\$.*?\$)/g);

    return parts.map((part, index) => {
      if (part.startsWith("$") && part.endsWith("$")) {
        const math = part.slice(1, -1);
        return <InlineMath key={index} math={math} />; // uses inline math to place it in correct spot
      }
      return <span key={index}>{part}</span>;
    });
  }

  function isTextEmpty(html: string | undefined) {
    if (!html) return true;

    // Remove HTML tags and whitespace
    const text = html
      .replace(/<[^>]*>/g, "") // strip tags
      .replace(/&nbsp;/g, " ")
      .trim();

    return text.length === 0;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center px-4 py-12 font-serif">
      {/* Question Navigation Sidebar */}
      <div className="hidden md:flex flex-col gap-3 fixed top-32 left-8 w-20">
        {questions.map((q, index) => (
          <button
            key={q.id}
            onClick={() => scrollToQuestion(q.id)}
            className={[
              "w-full py-2 rounded-xl border text-sm font-semibold transition flex items-center justify-center gap-1",
              activeQuestion === String(q.id)
                ? "bg-[#4E3629] text-white border-[#4E3629]"
                : isAnswered(q.id)
                ? "bg-green-100 border-green-400"
                : "hover:bg-gray-50",
            ].join(" ")}
          >
            Q{index + 1}
            {isAnswered(q.id) && <span className="text-green-600">✓</span>}
          </button>
        ))}
      </div>

      <div className="w-full max-w-3xl bg-white rounded-3xl border shadow-lg p-8 md:p-12">
        {/* Header with Timer */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onExit}
            className="text-sm font-semibold text-gray-600 hover:text-black"
          >
            ← Exit Quiz
          </button>

          <h1 className="text-2xl font-extrabold text-[#4E3629]">
            {quiz?.title || "Quiz"}
          </h1>

          <div className="flex flex-col items-end gap-1">
            <div className={`text-lg font-bold ${timeRemaining < 300 ? 'text-red-600' : 'text-gray-700'}`}>
              {formatTime(timeRemaining)}
            </div>
            <div className="text-xs text-gray-500">
              {answeredCount}/{questions.length} answered
            </div>
          </div>
        </div>

        {/* Autosave indicator */}
        {lastSaved && (
          <div className="text-xs text-gray-500 text-right mb-4">
            {saving ? 'Saving...' : `Last saved: ${lastSaved.toLocaleTimeString()}`}
          </div>
        )}

        {page === "quiz" && (
        <>
        <form onSubmit={handleQuizSubmission}>
          <div className="space-y-10">
            {questions.map((q) => (
              <div key={q.id} id={`question-${q.id}`}>
                  <p className="mb-2 text-lg whitespace-pre-wrap">
                    {renderTextWithLatex(q.text)}
                    </p>
                    {q.figure && (
                      <div className="mb-4">
                        <img
                          src={q.figure}
                          alt={`Question ${q.id} figure`}
                          className="max-h-80 rounded-xl border"
                        />
                      </div>
                  )}

                  {q.parts && q.parts.length > 0 && (
                    <div className="mt-4 space-y-4">
                      {q.parts.map((part) => (
                        <div key={part.id} className="rounded-2xl border bg-gray-50 p-4">
                          <p className="font-bold text-[#4E3629] mb-2">
                            Part {part.part_number}
                          </p>

                          <p className="mb-3 whitespace-pre-wrap">
                            {renderTextWithLatex(part.part_text)}
                          </p>

                       <div className="mt-2 relative">
                          <div
                            ref={(el) => {
                              const key = `${q.id}_${part.id}`;
                              textRefs.current[key] = el;

                              if (el && !el.innerHTML && textAnswers[key]) {
                                el.innerHTML = textAnswers[key];
                              }
                            }}
                            contentEditable
                            suppressContentEditableWarning
                            onInput={() => handleInput(`${q.id}_${part.id}`)}
                            onKeyUp={() => saveCaret(`${q.id}_${part.id}`)}
                            onClick={() => saveCaret(`${q.id}_${part.id}`)}
                            onKeyDown={(e) => handleKeyDown(e, `${q.id}_${part.id}`)}
                            className="w-full min-h-[120px] max-h-[300px] overflow-y-auto border rounded-xl px-4 py-3 text-base bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#4E3629] whitespace-pre-wrap"
                          />

                          <button
                            type="button"
                            onClick={() => openMathPopup(`${q.id}_${part.id}`)}
                            className="absolute bottom-2 right-2 text-gray-500 hover:text-black text-lg"
                            title="Insert Math (LaTeX)"
                          >
                            ∑
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {q.type === "multiple" && q.options?.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => selectAnswer(String(q.id), opt)}
                    className={[
                      "w-full text-left px-4 py-3 rounded-xl border mb-2 transition",
                      multipleAnswers[String(q.id)] === opt
                        ? "bg-[#4E3629] text-white border-[#4E3629]"
                        : "bg-white hover:bg-gray-50",
                    ].join(" ")}
                  >
                    {opt}
                  </button>
                ))}

                {q.type === "text" && (!q.parts || q.parts.length === 0) && (
                  <div className="mt-4 relative">
                    {/*
                    <input name={`question_${q.id}`}/>
                    */}
                    <div
                      ref={(el) => {
                        textRefs.current[q.id] = el;
                      } }
                      contentEditable
                      suppressContentEditableWarning
                      onInput={() => handleInput(String(q.id))}
                      onKeyUp={() => saveCaret(String(q.id))}
                      onClick={() => saveCaret(String(q.id))}
                      onKeyDown={(e) => handleKeyDown(e, String(q.id))}
                      className = "w-full min-h-[120px] max-h-[300px] overflow-y-auto border rounded-xl px-4 py-3 text-base bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#4E3629] whitespace-pre-wrap"
                      // dangerouslySetInnerHTML={{ __html: textAnswers[q.id] || "" }} 
                        
                      />

                    <button
                      type="button"
                      onClick={() => openMathPopup(String(q.id))}
                      className="absolute bottom-3 right-3 text-gray-500 hover:text-black text-lg"
                      title="Insert Math (LaTeX)"
                    >
                      ∑
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-10 flex gap-4">
              <button
                type="button"
                onClick={() => saveAnswers()}
                disabled={saving}
                className="flex-1 rounded-2xl border border-[#4E3629] text-[#4E3629] py-3 font-bold hover:bg-gray-50 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Progress'}
              </button>

              <button
                type="submit"
                className="flex-1 rounded-2xl bg-[#4E3629] text-white py-3 font-bold hover:opacity-90"
              >
                Review Answers
              </button>
          </div>
        </form></>
        )}

        {page === "details" && (
          <>
            <h1 className="text-3xl font-extrabold mb-6 text-center">Review Answers</h1>

            <div className="space-y-6">
              {questions.map((q) => (
              <div key={q.id} className="border-b pb-4">
                <p className="mb-2 whitespace-pre-wrap">
                 {renderTextWithLatex(q.text)}
                </p>

                {q.figure && (
                  <div className="mb-3">
                    <img
                      src={q.figure}
                      alt={`Question ${q.id} figure`}
                      className="max-h-80 rounded-xl border"
                    />
                  </div>
                )}

                {q.parts && q.parts.length > 0 ? (
                  <div className="space-y-3">
                    {q.parts.map((part) => {
                      const key = `${q.id}_${part.id}`;
                      const answer = textAnswers[key];

                      return (
                        <div key={part.id} className="rounded-xl border bg-gray-50 p-3">
                          <p className="font-bold">Part {part.part_number}</p>
                          <p>{renderTextWithLatex(part.part_text)}</p>

                          {answer && !isTextEmpty(answer) ? (
                            <div
                              className="text-gray-700 mt-2"
                              dangerouslySetInnerHTML={{ __html: answer }}
                            />
                          ) : (
                            <p className="text-red-500 italic mt-2">Not answered</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <>
                    {multipleAnswers[q.id] && (
                      <p className="text-gray-700">Answer: {multipleAnswers[q.id]}</p>
                    )}

                    {textAnswers[String(q.id)] && (
                      <div
                        className="text-gray-700"
                        dangerouslySetInnerHTML={{ __html: textAnswers[String(q.id)] }}
                      />
                    )}

                    {!multipleAnswers[q.id] && isTextEmpty(textAnswers[String(q.id)]) && (
                      <p className="text-red-500 italic">Not answered</p>
                    )}
                  </>
                )}
              </div>
              ))}
            </div>

            <div className="mt-8 flex gap-4">
              <button
                type="button"
                onClick={() => setLocalPage("quiz")}
                className="flex-1 rounded-2xl border py-3 font-semibold hover:bg-gray-50"
              >
                Edit Answers
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                className="flex-1 rounded-2xl bg-[#4E3629] text-white py-3 font-bold hover:opacity-90"
              >
                Submit Quiz
              </button>
            </div>
          </>
        )}

        {page === "submit" && (
          <div className="text-center">
            <h1 className="text-3xl font-extrabold mb-4">Submitted 🎉</h1>

            <p className="text-gray-600 mb-6">
              Your quiz has been submitted successfully.
            </p>

            <div className= "text-left rounded-2xl border bg-gray-50 p-5 mb-6">
              <h2 className= "text-xl font-bold text-[#4E3629] mb-3">
                Feedback 
              </h2>

              {aiResults.length > 0 ? (
                aiResults.map((res, index) => (
                  <div key={index} className="mb-4 border-b pb-3 text-left">
                    <p className="font-semibold">
                      Problem {index + 1}
                    </p>

                    {res.score !== undefined && (
                      <p>Score: {res.score}</p>
                    )}

                    <p className="text-gray-700 whitespace-pre-wrap">
                      {res.feedback || "No feedback"}
                    </p>
                  </div>
                ))
              ) : (
                <p>No feedback returned.</p>
              )}
            </div>

            <button
              type="button"
              onClick={onExit}
              className="rounded-2xl bg-[#4E3629] text-white px-6 py-3 font-semibold hover:opacity-90"
            >
              Return to Course
            </button>
          </div>
        )}
      </div>

      {/* Math Input Popup */}
      {activeMathId !== null && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/25 z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg flex flex-col gap-4 w-[420px]">
            <p className="font-semibold">Type LaTeX:</p>

            <textarea
              value={mathInput}
              onChange={(e) => setMathInput(e.target.value)}
              className="w-full border rounded-xl p-2"
              placeholder="e.g. x^2 + y^2 = z^2"
            />

            <div className="min-h-[60px] border rounded-xl p-2 bg-gray-50">
              {mathInput && <BlockMath math={mathInput} />}
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setActiveMathId(null)}
                className="px-4 py-2 border rounded-xl hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                onClick={insertMathAtCaret}
                className="px-4 py-2 bg-[#4E3629] text-white rounded-xl hover:opacity-90"
              >
                Insert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
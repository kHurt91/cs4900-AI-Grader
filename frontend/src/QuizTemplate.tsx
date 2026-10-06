// some things to add that is back end stuff sort of:
// autosaving answers, a timer, an extra detail page just for instructions

// Enhanced Quiz Template with Timer, Autosave, and Backend Integration
import React, { useState, useRef, useEffect } from "react";
import katex from "katex";
import { BlockMath, InlineMath } from "./components/Math";
import { publicClient } from "./api/client";

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
  answer_boxes?: {
    id: number;
    box_number: number;
    box_label: string;
    placeholder_text: string;
    expected_answer: string;
    points: number;
    grading_strategy: string;
    answer_template?: string;
    is_readonly?: boolean;
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
  const [editingMathNode, setEditingMathNode] = useState<HTMLElement | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null);
  
  // New states for timer and data
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [aiResults, setAiResults] = useState<any[]>([]);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [deadline, setDeadline] = useState<number | null>(null);

  const textRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const caretRanges = useRef<Record<string, Range>>({});
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSubmittedRef = useRef(false);



    async function handleQuizSubmission(e: React.FormEvent) {
      e.preventDefault();
      await saveAnswers();
      setLocalPage("details");
    }
  

  // Fetch quiz data from backend
  useEffect(() => {
    fetchQuizData();
  }, [quizId]);

  // Timer countdown - based on wall-clock deadline, runs until submission
  useEffect(() => {
    if (deadline === null || page === "submit") return;

    const tick = () => {
      const remaining = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setTimeRemaining(remaining);
      if (remaining === 0 && !autoSubmittedRef.current) {
        autoSubmittedRef.current = true;
        handleSubmit();
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [deadline, page]);

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
    const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
    try {
      const [{ data: quizData }, { data: problemsData }] = await Promise.all([
        publicClient.GET("/api/quizzes/{id}/", { params: { path: { id: quizId! } } }),
        publicClient.GET("/api/quizzes/{id}/problems/", { params: { path: { id: quizId! } } }),
      ]);

      if (quizData) {
        setQuiz(quizData as any);
      }
      if (problemsData) {
        const formattedQuestions: Question[] = (problemsData as unknown as any[]).map((p: any) => ({
          id: p.linked_problem_id ?? p.id,
          text: p.problem_text || p.problem_title || "Question",
          latex: p.problem_latex || undefined,
          type: "text" as const,
          problem_text: p.problem_text,
          problem_title: p.problem_title,
          figure: p.figure || p.figure_url || undefined,
          parts: p.parts || [],
          answer_boxes: p.answer_boxes || [],
        }));
        setQuestions(formattedQuestions);
      }

      const timeLimit = (quizData as any)?.time_limit ?? 0;

      // Check for an existing in-progress attempt to restore state and prevent timer reset
      const attemptsRes = await fetch(`${BASE_URL}/api/quizzes/${quizId}/my_attempts/`);
      const attemptsData = await attemptsRes.json();
      const inProgress = attemptsData.attempts?.find((a: any) => a.status === 'in_progress');

      if (inProgress) {
        setAttemptId(inProgress.attempt_id);
        const saved = inProgress.session_data?.answers;
        if (saved?.multipleAnswers) setMultipleAnswers(saved.multipleAnswers);
        if (saved?.textAnswers) setTextAnswers(saved.textAnswers);
        const deadlineMs = new Date(inProgress.started_at).getTime() + timeLimit * 60 * 1000;
        setDeadline(deadlineMs);
        setTimeRemaining(Math.max(0, Math.round((deadlineMs - Date.now()) / 1000)));
      } else {
        const startRes = await fetch(`${BASE_URL}/api/quizzes/${quizId}/start_attempt/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        const startData = await startRes.json();
        setAttemptId(startData.attempt_id);
        setDeadline(Date.now() + timeLimit * 60 * 1000);
        setTimeRemaining(timeLimit * 60);
      }
    } catch (err) {
      console.error('Failed to load quiz:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveAnswers = async () => {
    setSaving(true);
    const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
    try {
      await fetch(`${BASE_URL}/api/quizzes/${quizId}/save_draft/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attempt_id: attemptId,
          answers: { multipleAnswers, textAnswers },
        }),
      });
      setLastSaved(new Date());
    } catch (err) {
      console.error('Failed to save answers:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    await saveAnswers();

    const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
    await fetch(`${BASE_URL}/api/quizzes/${quizId}/submit_attempt/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attempt_id: attemptId }),
    });

    try {
      const { data, error } = await publicClient.POST("/api/grading/submit/", {
        body: {
          quiz_id: quizId!,
          student_id: userId!,
          content: {
            text: textAnswers,
            answer_boxes: textAnswers,
            multiple: multipleAnswers,
          } as any,
        },
      });

      if (error) {
        alert("Failed to submit quiz.");
        return;
      }

      if (data.results && Array.isArray(data.results as any[])) {
        setAiResults(data.results as any[]);
      } else if (data.results && Array.isArray((data.results as any[])[0])) {
        setAiResults((data.results as any[])[0]);
      } else {
        setAiResults([]);
      }

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

    if (q.answer_boxes && q.answer_boxes.length > 0) {
      return q.answer_boxes.every((box) => !isTextEmpty(textAnswers[String(box.id)]));
    }

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
    setEditingMathNode(null);
  };

  const handleEditorClick = (e: React.MouseEvent, qid: string) => {
    const mathBlock = (e.target as HTMLElement).closest(".math-block") as HTMLElement | null;
    if (mathBlock) {
      e.preventDefault();
      // Move cursor to after the block so it doesn't appear inside it
      const range = document.createRange();
      range.setStartAfter(mathBlock);
      range.collapse(true);
      const sel = window.getSelection();
      if (sel) { sel.removeAllRanges(); sel.addRange(range); }
      caretRanges.current[qid] = range.cloneRange();
      setEditingMathNode(mathBlock);
      setMathInput(mathBlock.dataset.latex || "");
      setActiveMathId(qid);
    } else {
      saveCaret(qid);
    }
  };

  const insertMathAtCaret = () => {
    if (activeMathId === null || !mathInput) return;

    const container = textRefs.current[activeMathId];
    if (!container) return;

    const mathWrapper = document.createElement("span");
    mathWrapper.contentEditable = "false";
    mathWrapper.style.display = "inline-block";
    mathWrapper.style.cursor = "pointer";
    mathWrapper.className = "math-block";
    mathWrapper.dataset.latex = mathInput;

    mathWrapper.innerHTML = katex.renderToString(mathInput, {
      throwOnError: false,
    });

    if (editingMathNode) {
      editingMathNode.replaceWith(mathWrapper);
      setEditingMathNode(null);
    } else {
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
    }

    handleInput(activeMathId);
    setActiveMathId(null);
    setMathInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent, qid: string) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    if (!range.collapsed) return;

    const node = range.startContainer;

    if (e.key === "Backspace") {
      if (node.nodeType === Node.TEXT_NODE && range.startOffset === 0) {
        const prev = node.previousSibling as HTMLElement | null;
        if (prev?.classList?.contains("math-block")) {
          e.preventDefault();
          prev.remove();
          handleInput(qid);
        }
      }
      return;
    }

    if (e.key === "ArrowLeft") {
      let prev: HTMLElement | null = null;
      if (node.nodeType === Node.TEXT_NODE && range.startOffset === 0) {
        prev = node.previousSibling as HTMLElement | null;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        prev = (node as Element).childNodes[range.startOffset - 1] as HTMLElement | null;
      }
      if (prev?.classList?.contains("math-block")) {
        e.preventDefault();
        const newRange = document.createRange();
        newRange.setStartBefore(prev);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
      }
      return;
    }

    if (e.key === "ArrowRight") {
      let next: HTMLElement | null = null;
      if (node.nodeType === Node.TEXT_NODE && range.startOffset === node.textContent!.length) {
        next = node.nextSibling as HTMLElement | null;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        next = (node as Element).childNodes[range.startOffset] as HTMLElement | null;
      }
      if (next?.classList?.contains("math-block")) {
        e.preventDefault();
        const newRange = document.createRange();
        newRange.setStartAfter(next);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
      }
    }
  };

  const isAnswered = (qid: number) => {
    const question = questions.find((q) => q.id === qid);

    if (multipleAnswers[qid] || !isTextEmpty(textAnswers[String(qid)])) {
      return true;
    }

    if (question?.answer_boxes && question.answer_boxes.length > 0) {
      return question.answer_boxes.every((box) => !isTextEmpty(textAnswers[String(box.id)]));
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
      <div className="min-h-screen flex items-center justify-center">
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
    <div className="min-h-screen flex justify-center px-4 py-12">
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
            ← Exit quiz
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

        {page === "quiz" && (
        <>
        <form onSubmit={handleQuizSubmission}>
          <div className="space-y-6">
            {questions.map((q) => (
              <div key={q.id} id={`question-${q.id}`} className="rounded-2xl border bg-gray-50 p-6">
                  {q.problem_title && (
                    <h2 className="text-base font-bold mb-2">{q.problem_title}</h2>
                  )}
                  <p className="mb-4 text-lg whitespace-pre-wrap">
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

                  {q.answer_boxes && q.answer_boxes.length > 0 && (
                    <div className="space-y-4">
                      {q.answer_boxes.map((box) => (
                        <div key={box.id}>
                          <p className="font-bold mb-2">
                            {box.box_label || `Box ${box.box_number}`}
                          </p>

                          <div className="relative">
                            <div
                              ref={(el) => {
                                const key = String(box.id);
                                textRefs.current[key] = el;

                                if (el && !el.innerHTML && textAnswers[key]) {
                                  el.innerHTML = textAnswers[key];
                                }
                              }}
                              contentEditable={!box.is_readonly}
                              suppressContentEditableWarning
                              onInput={() => handleInput(String(box.id))}
                              onKeyUp={() => saveCaret(String(box.id))}
                              onClick={(e) => handleEditorClick(e, String(box.id))}
                              onKeyDown={(e) => handleKeyDown(e, String(box.id))}
                              className="w-full min-h-[120px] max-h-[300px] overflow-y-auto border rounded-xl px-4 py-3 text-base bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#4E3629] whitespace-pre-wrap"
                            />

                            <button
                              type="button"
                              onClick={() => openMathPopup(String(box.id))}
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

                  {(!q.answer_boxes || q.answer_boxes.length === 0) && q.parts && q.parts.length > 0 && (
                    <div className="space-y-4">
                      {q.parts.map((part) => (
                        <div key={part.id}>
                          <p className="font-bold mb-2">
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
                            onClick={(e) => handleEditorClick(e, `${q.id}_${part.id}`)}
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

                {q.type === "text" && (!q.answer_boxes || q.answer_boxes.length === 0) && (!q.parts || q.parts.length === 0) && (
                  <div className="relative">
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
                      onClick={(e) => handleEditorClick(e, String(q.id))}
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

          <div className="mt-10 flex gap-4 items-start">
              <div className="flex-1 flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => saveAnswers()}
                  disabled={saving}
                  className="w-full rounded-2xl bg-white border shadow-sm py-3 font-bold hover:shadow transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Progress'}
                </button>
                {lastSaved && (
                  <div className="text-xs text-gray-500 text-center">
                    Last saved: {lastSaved.toLocaleTimeString()}
                  </div>
                )}
              </div>

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
              <div key={q.id} className="rounded-2xl border bg-gray-50 p-6">
                {q.problem_title && (
                  <h2 className="text-base font-bold mb-2">{q.problem_title}</h2>
                )}
                <p className="mb-4 text-lg whitespace-pre-wrap">
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

                {q.answer_boxes && q.answer_boxes.length > 0 ? (
                  <div className="space-y-3">
                    {q.answer_boxes.map((box) => {
                      const key = String(box.id);
                      const answer = textAnswers[key];

                      return (
                        <div key={box.id} className="rounded-xl border bg-gray-50 p-3">
                          <p className="font-bold">{box.box_label || `Box ${box.box_number}`}</p>

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
                ) : q.parts && q.parts.length > 0 ? (
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
                className="flex-1 rounded-2xl bg-white border shadow-sm py-3 font-bold hover:shadow transition"
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

            <div className="text-left mb-6">
              <h2 className="text-xl font-bold text-[#4E3629] mb-3">
                Feedback
              </h2>

              {aiResults.length > 0 ? (
                <div className="space-y-4">
                  {aiResults.map((res, index) => (
                    <div key={index} className="rounded-2xl border bg-gray-50 p-5 text-left">
                      <p className="font-semibold mb-1">Box {index + 1}</p>

                      {res.score_percent !== undefined && (
                        <p className="text-sm text-gray-600 mb-2">Score: {res.points_earned} / {res.points_possible}</p>
                      )}

                      <p className="text-gray-700 whitespace-pre-wrap">
                        {res.feedback || "No feedback"}
                      </p>
                    </div>
                  ))}
                </div>
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
                onClick={() => { setActiveMathId(null); setEditingMathNode(null); }}
                className="px-4 py-2 border rounded-xl hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                onClick={insertMathAtCaret}
                className="px-4 py-2 bg-[#4E3629] text-white rounded-xl hover:opacity-90"
              >
                {editingMathNode ? "Update" : "Insert"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

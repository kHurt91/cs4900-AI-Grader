// Enhanced Quiz Template with Inline Answer Boxes
import React, { useState, useRef, useEffect } from "react";
import "katex/dist/katex.min.css";
import { BlockMath, InlineMath } from "react-katex";

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
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [maxAttempts, setMaxAttempts] = useState(0);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [previousAttempts, setPreviousAttempts] = useState<any[]>([]);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const attemptCreatedRef = useRef<boolean>(false);

  useEffect(() => {
    attemptCreatedRef.current = false; // Reset for new quiz
    
    const initQuiz = async () => {
      // First, fetch basic quiz info
      try {
        const quizResponse = await fetch(`http://127.0.0.1:8000/api/quizzes/${quizId}/`);
        if (quizResponse.ok) {
          const quizData = await quizResponse.json();
          setQuiz(quizData);
          setTimeRemaining(quizData.time_limit * 60);
          setMaxAttempts(quizData.max_attempts || 0);
        }
      } catch (err) {
        console.error('Failed to load quiz:', err);
      }

      // Create attempt and get the ID
      const newAttemptId = await createAttempt();
      
      // Now fetch problems with the attempt ID
      if (newAttemptId) {
        try {
          const response = await fetch(
            `http://127.0.0.1:8000/api/quizzes/${quizId}/problems/?attempt_id=${newAttemptId}`
          );
          if (response.ok) {
            const data = await response.json();
            console.log(`Loaded ${data.length} problem(s) for attempt ${newAttemptId}`);
            setQuestions(data);
          }
        } catch (err) {
          console.error('Failed to fetch problems:', err);
        }
      }
      
      setLoading(false);
    };
    
    initQuiz();
  }, [quizId]);

  useEffect(() => {
    if (timeRemaining > 0 && page === "quiz") {
      const timer = setTimeout(() => setTimeRemaining(timeRemaining - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeRemaining === 0 && quiz && page === "quiz") {
      handleSubmit();
    }
  }, [timeRemaining, page]);

  useEffect(() => {
    if (page === "quiz" && !loading) {
      const interval = setInterval(() => saveAnswers(), 30000);
      return () => clearInterval(interval);
    }
  }, [boxAnswers, page, loading]);

  
  const createAttempt = async () => {
    // Prevent duplicate creation using ref
    if (attemptCreatedRef.current) {
      console.log('Attempt creation already in progress, skipping');
      return;
    }
    
    attemptCreatedRef.current = true;
    
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/quizzes/${quizId}/start_attempt/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAttemptId(data.attempt_id);
        setAttemptNumber(data.attempt_number);
        setMaxAttempts(data.max_attempts);
        console.log(`Started attempt ${data.attempt_number} of ${data.max_attempts}, variation ${data.selected_variation}`);
        return data.attempt_id; // Return the attempt ID
      } else {
        const error = await response.json();
        console.error('Failed to create attempt:', error);
        if (response.status === 400) {
          alert(error.error);
        }
        attemptCreatedRef.current = false;
        return null;
      }
    } catch (err) {
      console.error('Error creating attempt:', err);
      attemptCreatedRef.current = false;
      return null;
    }
  };

  const saveAnswers = async () => {
    setSaving(true);
    try {
      localStorage.setItem(`quiz_${quizId}_answers`, JSON.stringify({
        boxAnswers,
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
    
    // Mark attempt as submitted in backend
    if (attemptId) {
      try {
        await fetch(`http://127.0.0.1:8000/api/quizzes/${quizId}/submit_attempt/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            attempt_id: attemptId,
            answers: boxAnswers,
          }),
        });
      } catch (err) {
        console.error('Failed to submit attempt:', err);
      }
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


  const renderTextWithInlineMath = (text: string) => {
    // Only match math variables with subscripts and parentheses, not regular words
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    
    // Match: Ωₚ, Pₙ, Dₘₐₓ, U₀, P(R,θ,φ), G(Ω), etc.
    const mathPattern = /([PUDGΩ](?:ₙ|ₘₐₓ|ᵣ|₀|ₚ)?(?:\([^)]+\))?(?:\/[PUDGΩ](?:ₙ|ₘₐₓ|ᵣ|₀|ₚ)?)?)/g;
    
    let match;
    while ((match = mathPattern.exec(text)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      // Convert to LaTeX
      let mathText = match[0]
        .replace(/Ω/g, '\\Omega')
        .replace(/ₙ/g, '_n')
        .replace(/ₘₐₓ/g, '_{\\max}')
        .replace(/ᵣ/g, '_r')
        .replace(/₀/g, '_0')
        .replace(/ₚ/g, '_p');

      parts.push(<InlineMath key={match.index} math={mathText} />);
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };     
  
  const renderQuestionText = (question: Question) => {
    let text = question.problem_text;
    
    // Extract and remove hint text if present
    let hintText = '';
    if (text.includes('is given') || text.includes('is the solution')) {
      const hintMatch = text.match(/\n\n(.+(?:is given|is the solution).+(?:\\n\\n.+)?)\s*$/);
      if (hintMatch) {
        hintText = hintMatch[1];
        // Remove hint text from main text
        text = text.substring(0, hintMatch.index);
      }
    }
    
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    question.answer_boxes.forEach((box) => {
      const placeholder = `[ANSWER_BOX_${box.box_number}]`;
      const index = text.indexOf(placeholder, lastIndex);
      
      if (index !== -1) {

        if (index > lastIndex) {
          parts.push(
            <span key={`text-${lastIndex}`}>
              {text.substring(lastIndex, index)}
            </span>
          );
        }
        

        // NESTED BOX STRUCTURE: Small box [Big box inside]
        parts.push(
          <div key={`box-${box.id}`} className="my-4">
            {/* Equation label */}
            <div className="font-medium mb-2 text-gray-800">
              {box.box_label}
              <span className="text-sm text-gray-500 ml-2">({box.points} pts)</span>
            </div>
            
            {/* OUTER BOX (Small box border) */}
            <div className="p-3 border-2 border-gray-400 rounded-lg bg-gray-50">
              
              {/* INNER BOX (Big input area) */}
              <div className="relative">
                {box.is_readonly ? (
                  // GREEN PRE-FILLED HINT BOX
                  <div className="w-full border-2 border-green-300 rounded-md p-4 min-h-[100px] bg-green-50">
                    <div className="text-xs text-green-700 mb-2 font-semibold">✓ Given as hint:</div>
                    <BlockMath math={box.answer_template} />
                  </div>
                ) : (
                  // NORMAL EDITABLE BOX
                  <>
                    <textarea
                      value={boxAnswers[box.id] || ""}
                      onChange={(e) => handleBoxInput(box.id, e.target.value)}
                      placeholder="Enter your LaTeX expression"
                      className="w-full border-2 border-gray-300 rounded-md p-4 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-[#4E3629] focus:border-[#4E3629] font-mono text-base bg-white"
                    />
                    
                    <button
                      type="button"
                      onClick={() => openMathPopup(box.id)}
                      className="absolute bottom-3 right-3 text-gray-500 hover:text-black text-2xl font-bold"
                      title="Insert Math (LaTeX)"
                    >
                      ∑
                    </button>
                  </>
                )}
              </div>

              {/* LaTeX Preview */}
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
      parts.push(
        <span key={`text-${lastIndex}`}>
          {text.substring(lastIndex)}
        </span>
      );
    }

    // Render hint text if present (for Variations 1, 3, 4)
    if (hintText) {
      const lines = hintText.split('\\n\\n');
      
      parts.push(
        <div key="hint-section" className="mt-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
          <div className="text-sm font-semibold text-blue-800 mb-2">💡 Hints:</div>
          {lines.map((line, idx) => {
            // Check if line starts with LaTeX (like \Omega_p or contains math)
            if (line.includes('\\') && (line.includes('\\Omega') || line.includes('\\frac') || line.includes('\\int'))) {
              // Extract the math part before "is the solution" or similar text
              const solutionMatch = line.match(/^(.+?)(?:\s+\\text\{.*?\})?$/);
              if (solutionMatch) {
                const mathPart = solutionMatch[1].trim();
                return (
                  <div key={idx} className="mb-2">
                    <BlockMath math={mathPart} />
                    <span className="text-xs text-blue-600 italic">is the solution for step {line.includes('step 3') ? '3' : '4'}. Not all step solutions are given.</span>
                  </div>
                );
              }
            }
            
            // Plain text line
            return <div key={idx} className="text-sm text-gray-700">{line}</div>;
          })}
        </div>
      );
    }
    return <div className="whitespace-pre-wrap leading-relaxed">{parts}</div>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl font-semibold">Loading quiz...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center px-4 py-12">
      <div className="hidden md:flex flex-col gap-3 fixed top-32 left-8 w-20">
        {questions.map((q, index) => (
          <button
            key={q.id}
            onClick={() => scrollToQuestion(q.id)}
            className={[
              "w-full py-2 rounded-xl border text-sm font-semibold transition flex items-center justify-center gap-1",
              activeQuestion === q.id
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

      <div className="w-full max-w-4xl bg-white rounded-3xl border shadow-lg p-8 md:p-12">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => setPage("course")}
            className="text-sm font-semibold text-gray-600 hover:text-black"
          >
            ← Exit Quiz
          </button>

          <div className="text-center">
            <h1 className="text-2xl font-extrabold text-[#4E3629]">
              {quiz?.title || "Quiz"}
            </h1>
            {maxAttempts > 0 && (
              <div className="text-sm text-gray-600 mt-1">
                Attempt {attemptNumber} of {maxAttempts}
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-1">
            <div className={`text-lg font-bold ${timeRemaining < 300 ? 'text-red-600' : 'text-gray-700'}`}>
              {formatTime(timeRemaining)}
            </div>
            <div className="text-xs text-gray-500">
              {answeredCount}/{questions.length} answered
            </div>
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
                  <h2 className="text-xl font-bold mb-4 text-[#4E3629]">
                    Question {index + 1}: {q.problem_title}
                  </h2>
                  <div className="text-gray-700 leading-relaxed">
                    {renderQuestionText(q)}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 flex gap-4">
              <button
                onClick={() => saveAnswers()}
                disabled={saving}
                className="flex-1 rounded-2xl border border-[#4E3629] text-[#4E3629] py-3 font-bold hover:bg-gray-50 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Progress'}
              </button>

              <button
                onClick={() => setLocalPage("details")}
                className="flex-1 rounded-2xl bg-[#4E3629] text-white py-3 font-bold hover:opacity-90"
              >
                Review Answers
              </button>
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
                      <div className="text-sm font-medium text-gray-600">{box.box_label}:</div>
                      {boxAnswers[box.id] ? (
                        <div className="mt-1 p-2 bg-gray-50 rounded">
                          <BlockMath math={boxAnswers[box.id]} />
                        </div>
                      ) : (
                        <p className="text-red-500 italic text-sm">Not answered</p>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="mt-8 flex gap-4">
              <button
                onClick={() => setLocalPage("quiz")}
                className="flex-1 rounded-2xl border py-3 font-semibold hover:bg-gray-50"
              >
                Edit Answers
              </button>

              <button
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
            <p className="text-gray-600 mb-4">
              Attempt {attemptNumber} of {maxAttempts} completed
            </p>
            
            <div className="flex gap-4 justify-center mt-6">
              {attemptNumber < maxAttempts && (
                <button
                  onClick={() => window.location.reload()}
                  className="rounded-2xl border-2 border-[#4E3629] text-[#4E3629] px-6 py-3 font-semibold hover:bg-gray-50"
                >
                  Try Again ({maxAttempts - attemptNumber} attempts left)
                </button>
              )}
              
              <button
                onClick={() => setPage("course")}
                className="rounded-2xl bg-[#4E3629] text-white px-6 py-3 font-semibold hover:opacity-90"
              >
                Return to Course
              </button>
            </div>
          </div>
        )}
        </div>

      {activeMathBoxId !== null && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/25 z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg flex flex-col gap-4 w-[420px]">
            <p className="font-semibold">Enter LaTeX Expression:</p>

            <textarea
              value={mathInput}
              onChange={(e) => setMathInput(e.target.value)}
              className="w-full border rounded-xl p-2 font-mono"
              placeholder="e.g. P_n(\theta,\phi)"
              rows={3}
            />

            <div className="min-h-[60px] border rounded-xl p-2 bg-gray-50">
              {mathInput && <BlockMath math={mathInput} />}
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {setActiveMathBoxId(null); setMathInput("");}}
                className="px-4 py-2 border rounded-xl hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                onClick={insertMath}
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
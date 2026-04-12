import React, { useMemo, useState, useEffect } from "react";
import ForgotPassword from './ForgotPassword';
import QuizTemplate from './QuizTemplate';

<<<<<<< ours
const ROLES= {
  student: "student",
  instructor: "instructor"
} as const;

type Role= "student" | "instructor";
type Page=
  | "login"
  | "forgotPassword"
  | "about"
  | "contact"
  | "registration"
  | "home"
  | "course"
  | "quiz"
  | "grades"
  | "instructorCourse"
  | "instructorGrades"
  | "createCourse";

type HistoryState = {
  page: Page;
  courseId?: number;
  instructorCourseId?: number;
};

type Course= {
  id: number;
  code: string;
  title: string;
  term: string;
  instructor_name: string;
};

type CourseItemType= "Assignment" | "Quiz";

type CourseItem= {
  id: string;
  type: CourseItemType;
  title: string;
  dueText: string;
  windowText?: string; // optional 
  submissionsText?: string; // optional 
  scoreText?: string; // optional
  gradeText?: string; // optional
  evalText?: string; // optional 
};
const DEMO_COURSE_ITEMS: Record<number, CourseItem[]> = {
  4: [
    {
      id: "q6",
      type: "Quiz",
      title: "Week 1 Quiz",
      dueText: "Available now",
      submissionsText: "Not started",
      scoreText: "- / 10",
      evalText: "",
    },
    {
      id: "q7",
      type: "Quiz",
      title: "Midterm Quiz",
      dueText: "Available now",
      submissionsText: "Not started",
      scoreText: "- / 10",
      evalText: "",
    },
  ],
  2: [
    {
      id: "q3",
      type: "Quiz",
      title: "Problem 8.3 - Antenna Definitions",
      dueText: "Available now",
      submissionsText: "Not started",
      scoreText: "- / 10",
      evalText: "",
    },
    {
      id: "12",
      type: "Quiz",
      title: "Problem 8.4 - Beam Pattern Derivation",
      dueText: "Available now",
      submissionsText: "Not started",
      scoreText: "- / 40",
      evalText: "",
    },
  ],
};

interface User {
  id: number,
  username: string,
  email: string,
  date_joined: string,
  first_name: string,
  last_name: string
}
=======
import type {
  Role,
  Page,
  HistoryState,
  Course,
  CourseItemType,
  CourseItem,
  LoginResult,
} from "./types";

import { ROLES } from "./types";

import HomePage from "./pages/HomePage";
import CoursePage from "./pages/CoursePage";
import RegistrationPage from "./pages/RegistrationPage";
import GradesPage from "./pages/GradesPage";
import InstructorCoursePage from "./pages/InstructorCoursePage";
import InstructorGradesPage from "./pages/InstructorGradesPage";

import PageShell from "./elements/PageShell";

import CourseTypePill from "./elements/CourseType";


import { DEMO_COURSE_ITEMS } from "./demoCourses";
>>>>>>> theirs



export default function App() {
  const [page, setPage]= useState<Page>("login");
  const [selectedQuizId, setSelectedQuizId] = useState<number | null>(null);
  const [regSuccess, setRegSuccess]= useState<boolean>(false);
  const [role, setRole]= useState<Role>("student");
  const [email, setEmail]= useState("");
  const [pw, setPw]= useState("");
  const [error, setError]= useState<string | null>(null);

  const [loginresult, setLoginResult]= useState<LoginResult | null>(null);
  const [selectedCourse, setSelectedCourse]= useState<Course | null>(null);
  const [studentCourses, setStudentCourses]= useState<Course[]>([]);
  const [selectedInstructorCourse, setSelectedInstructorCourse]= useState<Course | null>(null);
  const [instructorCourses, setInstructorCourses]= useState<Course[]>([]);
  const [session, setSession]= useState<{ role: Role; email: string } | null>(
    null
  );

  const canSubmit= useMemo(() => {
    return email.trim().length > 0 && pw.trim().length > 0;
  }, [email, pw]);
  const [courseQuizzes, setCourseQuizzes] = useState<any[]>([]);
function navigateTo(
  nextPage: Page,
  options?: {
    course?: Course | null;
    instructorCourse?: Course | null;
    replace?: boolean;
  }
) {
  const nextCourse= options?.course ?? null;
  const nextInstructorCourse= options?.instructorCourse ?? null;

  setSelectedCourse(nextCourse);
  setSelectedInstructorCourse(nextInstructorCourse);
  setPage(nextPage);

  const historyState: HistoryState= {
    page: nextPage,
    courseId: nextCourse?.id,
    instructorCourseId: nextInstructorCourse?.id,
  };

  if (options?.replace) {
    window.history.replaceState(historyState, "", window.location.pathname);
  } else {
    window.history.pushState(historyState, "", window.location.pathname);
  }
} 

useEffect(() => {
  const handlePopState= (event: PopStateEvent) => {
    const state= event.state as HistoryState | null;

    if (!state) {
      setPage("login");
      setSelectedCourse(null);
      setSelectedInstructorCourse(null);
      return;
    }

    setPage(state.page);

    if (state.courseId) {
      const foundStudentCourse= studentCourses.find((c) => c.id === state.courseId) ?? null;
      setSelectedCourse(foundStudentCourse);
    } else {
      setSelectedCourse(null);
    }

    if (state.instructorCourseId) {
      const foundInstructorCourse =
        instructorCourses.find((c) => c.id === state.instructorCourseId) ?? null;
      setSelectedInstructorCourse(foundInstructorCourse);
    } else {
      setSelectedInstructorCourse(null);
    }
  };

  window.addEventListener("popstate", handlePopState);
  return () => window.removeEventListener("popstate", handlePopState);
}, [studentCourses, instructorCourses]);

useEffect(() => {
  window.history.replaceState(
    { page: "login" } satisfies HistoryState,
    "",
    window.location.pathname
  );
}, []);

async function createCourse(e: React.FormEvent) {
  e.preventDefault();
  setError(null);

  const form= e.target as HTMLFormElement;
  const formData= new FormData(form);
  const formObj= Object.fromEntries(formData.entries());

  try {
    const response= await fetch("http://127.0.0.1:8000/api/courses/create_course/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        course_code: formObj.course_code,
        title: formObj.title,
        term: formObj.term,
        instructor_name: loginresult!.user.username ?? "username failed",
        instructor_id: loginresult!.user.id ?? -1,
      }),
    });

    if (response.ok) {
      form.reset();
      setRegSuccess(true);
      await fetchCourses(loginresult!.tokens.access ?? 0, role);
      navigateTo("home",{ replace: true });

      setTimeout(() => {
        setRegSuccess(false);
      }, 3000);
    } else {
      const err_response = await response.json();
      let err_msg = "";

      Object.entries(err_response).forEach((i) => {
        err_msg += i[1] + "\n";
      });

      setError(err_msg);
    }
  } catch (err) {
    alert("Failed to connect.");
  }
}

async function registerUser(e: React.FormEvent) {
  e.preventDefault();
  setError(null);

  const form= e.target as HTMLFormElement;
  const formData= new FormData(form);
  const formObj= Object.fromEntries(formData.entries());

  try {
    const response= await fetch("http://127.0.0.1:8000/api/users/auth/register/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        first_name: formObj.first_name,
        last_name: formObj.last_name,
        email: formObj.email,
        username: formObj.username,
        password: formObj.password,
        role: formObj.role,
      }),
    });

    if (response.ok) {
      form.reset();
      setRegSuccess(true);
      navigateTo("login",{ replace: true });

      setTimeout(() => {
        setRegSuccess(false);
      }, 3000);
    } else {
      const err_response = await response.json();
      let err_msg = "";

      Object.entries(err_response).forEach((i) => {
        err_msg += i[1] + "\n";
      });

      setError(err_msg);
    }
  } catch (err) {
    alert("Failed to connect.");
  }
}
  
  async function fetchCourses(accessToken: string, userRole: Role) {
    try {
      const response= await fetch("http://127.0.0.1:8000/api/courses/", {
        method: "GET",
        headers: {
         "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();
      console.log("courses response:", response.status, data);

      if (!response.ok) {
        throw new Error("Failed to fetch courses");
      }

      if (userRole === "student") {
       setStudentCourses(data);
      } else {
        setInstructorCourses(data);
     }
    } catch (err) {
     console.error(err);
     setError("Could not load courses.");
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/users/auth/login/", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({username: email, password: pw, role: role})
      });

      if (response.ok) {
        const data = await response.json();

        setLoginResult(data);
        setSession({ role, email: email.trim() });

        await fetchCourses(data.tokens.access, role);

        navigateTo("home", { replace: true });

      } else {

        const err_response = await response.json();
        setError(err_response.error);
        return;
      }
    } catch (err) {
      alert("Failed to connect to database.");
    }

  }

  function logout() {
    setSession(null);
    setEmail("");
    setPw("");
    setError(null);
    setRole("student");
    navigateTo("login", { replace: true });
    setLoginResult(null);
    setStudentCourses([]);
    setInstructorCourses([]);
    setSelectedCourse(null);
    setSelectedInstructorCourse(null);
  }

  // ---------- layout ----------
  


  // ---------- pgs ----------
if (page === "about") {
  return (
    <PageShell
      title="About"
      page={page}
      sessionExists={!!session}
      onNavigate={navigateTo}
      onLogout={logout}
    >
      <div className="rounded-2xl bg-white border shadow-sm p-6 text-gray-700">
        <p className="leading-relaxed">bla bla bla this is the explanation</p>
      </div>
    </PageShell>
  );
}

if (page === "contact") {
  return (
    <PageShell
      title="Contact"
      page={page}
      sessionExists={!!session}
      onNavigate={navigateTo}
      onLogout={logout}
    >
      <div className="rounded-2xl bg-white border shadow-sm p-6 text-gray-700">
        <p className="leading-relaxed">contact details to us ig</p>
      </div>
    </PageShell>
  );
}

if (page === "createCourse") {
  return (
    <PageShell
      title="Create course"
      page={page}
      sessionExists={!!session}
      onNavigate={navigateTo}
      onLogout={logout}
    >
      <div className="w-full">
        <div className="rounded-3xl bg-white border shadow-sm p-6 md:p-8 w-full">
          <form method="post" onSubmit={createCourse} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Title
                </label>
                <input
                  name="title"
                  required
                  placeholder="Software Systems Development II"
                  className="mt-1 w-full rounded-2xl border bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-[#FFC72C]/60 focus:border-[#FFC72C]"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Course code
                </label>
                <input
                  name="course_code"
                  required
                  placeholder="CS 4910"
                  className="mt-1 w-full rounded-2xl border bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-[#FFC72C]/60 focus:border-[#FFC72C]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Term
                </label>
                <input
                  name="term"
                  required
                  placeholder="spring"
                  className="mt-1 w-full rounded-2xl border bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-[#FFC72C]/60 focus:border-[#FFC72C]"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                className="px-8 py-3 rounded-2xl font-bold transition shadow-sm bg-[#4E3629] text-white hover:opacity-95"
              >
                Submit
              </button>
            </div>
          </form>
        </div>
      </div>
    </PageShell>
  );
}

if (page === "registration") {
  return (
    <PageShell
      title="Registration"
      page={page}
      sessionExists={!!session}
      onNavigate={navigateTo}
      onLogout={logout}
    >
      <RegistrationPage error={error} onSubmit={registerUser} />
    </PageShell>
  );
}

if (page === "course" && selectedCourse) {
  console.log("Selected course:", selectedCourse);
  console.log("Course ID:", selectedCourse.id);
  const items = DEMO_COURSE_ITEMS[selectedCourse.id] ?? [];
<<<<<<< ours
  console.log("Items found:", items);
  const pill = (t: CourseItemType) => (
    <span
      className={[
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
        t === "Assignment" ? "bg-gray-50" : "bg-white",
      ].join(" ")}
=======

  return (
    <PageShell
      title={selectedCourse.code}
      page={page}
      sessionExists={!!session}
      onNavigate={navigateTo}
      onLogout={logout}
>>>>>>> theirs
    >
      <CoursePage
        selectedCourse={selectedCourse}
        items={items}
        onOpenGrades={() => navigateTo("grades", { course: selectedCourse })}
        onBack={() => navigateTo("home")}
      />
    </PageShell>
  );
}

if (page === "grades" && selectedCourse) {
  const items = DEMO_COURSE_ITEMS[selectedCourse.id] ?? [];

<<<<<<< ours
            {/* rpws */}
            <div className="divide-y">
              {items.length === 0 ? (
                <div className="p-4 text-sm text-gray-600">
                  No assignments or quizzes yet.
                </div>
              ) : (
                items.map((it) => (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => {
                      if (it.type === "Quiz") {
                        setSelectedQuizId(parseInt(it.id.replace('q', '')));
                        navigateTo("quiz");
                      } else {
                        alert(`Open: ${it.title}`);
                      }
                   }}
                    className="w-full text-left hover:bg-gray-50 transition"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-12">
                      
                      {/* Item */}
                      <div className="md:col-span-7 p-4 md:border-r">
                        <div className="flex items-start justify-between gap-3">
                          <div className="font-bold text-[#4E3629]">
                            {it.title}
                          </div>
                          <div className="shrink-0">{pill(it.type)}</div>
                        </div>

                        <div className="text-sm text-gray-600 mt-1">
                          {it.dueText}
                        </div>

                        {it.windowText ? (
                          <div className="text-xs text-gray-500 mt-1">
                            {it.windowText}
                          </div>
                        ) : null}
                      </div>

                      {/* completion */}
                      <div className="md:col-span-3 p-4 md:border-r text-sm text-gray-700">
                        {it.submissionsText ?? "-"}
                      </div>

                      {/* score */}
                      <div className="md:col-span-2 p-4 text-sm text-gray-700">
                        {it.scoreText ?? "-"}
                      </div>

                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
=======
  return (
    <PageShell
      title={`${selectedCourse.code} Grades`}
      page={page}
      sessionExists={!!session}
      onNavigate={navigateTo}
      onLogout={logout}
    >
      <GradesPage
        selectedCourse={selectedCourse}
        items={items}
        onBackToCourse={() => navigateTo("course", { course: selectedCourse })}
        onBackHome={() => navigateTo("home")}
      />
>>>>>>> theirs
    </PageShell>
  );
}

if (page === "instructorCourse" && selectedInstructorCourse) {
  const items = DEMO_COURSE_ITEMS[selectedInstructorCourse.id] ?? [];

  return (
    <PageShell
      title={`${selectedInstructorCourse.code} (Instructor)`}
      page={page}
      sessionExists={!!session}
      onNavigate={navigateTo}
      onLogout={logout}
    >
      <InstructorCoursePage
        selectedInstructorCourse={selectedInstructorCourse}
        items={items}
        onOpenGradebook={() =>
          navigateTo("instructorGrades", {
            instructorCourse: selectedInstructorCourse,
          })
        }
        onBack={() => navigateTo("home")}
      />
    </PageShell>
  );
}

if (page === "instructorGrades" && selectedInstructorCourse) {
  const items = DEMO_COURSE_ITEMS[selectedInstructorCourse.id] ?? [];

  return (
    <PageShell
      title={`${selectedInstructorCourse.code} Gradebook`}
      page={page}
      sessionExists={!!session}
      onNavigate={navigateTo}
      onLogout={logout}
    >
      <InstructorGradesPage
        selectedInstructorCourse={selectedInstructorCourse}
        items={items}
        onBackToAssignments={() =>
          navigateTo("instructorCourse", {
            instructorCourse: selectedInstructorCourse,
          })
        }
        onBackHome={() => navigateTo("home")}
      />
    </PageShell>
  );
}

if (page === "grades" && selectedCourse) {
  const items = DEMO_COURSE_ITEMS[selectedCourse.id] ?? [];

  return (
    <PageShell
      title={`${selectedCourse.code} Grades`}
      page={page}
      sessionExists={!!session}
      onNavigate={navigateTo}
      onLogout={logout}
    >
      <GradesPage
        selectedCourse={selectedCourse}
        items={items}
        onBackToCourse={() => navigateTo("course", { course: selectedCourse })}
        onBackHome={() => navigateTo("home")}
      />
    </PageShell>
  );
}
<<<<<<< ours
  // ---------- Quiz Template ----------
if (page === "quiz" && selectedQuizId) {
  return <QuizTemplate setPage={setPage} quizId={selectedQuizId} />;
}
=======
>>>>>>> theirs

  // ---------- logged ----------
if (loginresult && session && (page === "login" || page === "home")) {
  const isInstructor = session.role === ROLES.instructor;

  return (
    <PageShell
      title={isInstructor ? "Instructor Home" : "Student Home"}
      page={page}
      sessionExists={!!session}
      onNavigate={navigateTo}
      onLogout={logout}
    >
      <HomePage
        role={session.role}
        username={loginresult.user.username}
        studentCourses={studentCourses}
        instructorCourses={instructorCourses}
        onOpenStudentCourse={(course: Course) => navigateTo("course", { course })}
        onOpenInstructorCourse={(course: Course) =>
          navigateTo("instructorCourse", { instructorCourse: course })
        }
        onCreateCourse={() => navigateTo("createCourse")}
      />
    </PageShell>
  );
}
        
// ---------- authenticated fallback ----------
if (session && loginresult) {
  return (
    <PageShell
  title="Home"
  page={page}
  sessionExists={!!session}
  onNavigate={navigateTo}
  onLogout={logout}
    >
      <div className="rounded-2xl bg-white border shadow-sm p-6">
        <div className="text-sm text-gray-700">
          You’re signed in, but that page isn’t available right now.
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={() => navigateTo("home")}
            className="px-4 py-2 rounded-full bg-white border shadow-sm hover:shadow transition text-sm font-semibold"
          >
            Back to Home
          </button>
        </div>
      </div>
    </PageShell>
  );
}

  // ---------- Forgot Password ----------
  if (page === "forgotPassword") {
    return <ForgotPassword />;
  }

  // ---------- login ----------
return (
  <PageShell
    title="Login"
    page={page}
    sessionExists={!!session}
    onNavigate={navigateTo}
    onLogout={logout}
  >
    <div className="max-w-md mx-auto rounded-3xl bg-white border shadow-sm p-6 md:p-7">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Login</h1>
        </div>
        <div className="h-10 w-10 rounded-2xl bg-[#FFC72C] flex items-center justify-center font-black text-[#4E3629]">
          ✓
        </div>
      </div>

      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={() => setRole("student")}
          className={[
            "flex-1 rounded-2xl border px-4 py-2 font-bold transition",
            role === "student"
              ? "bg-[#4E3629] text-white border-[#4E3629]"
              : "bg-white hover:bg-gray-50",
          ].join(" ")}
        >
          Student
        </button>

        <button
          type="button"
          onClick={() => setRole("instructor")}
          className={[
            "flex-1 rounded-2xl border px-4 py-2 font-bold transition",
            role === ROLES.instructor
              ? "bg-[#4E3629] text-white border-[#4E3629]"
              : "bg-white hover:bg-gray-50",
          ].join(" ")}
        >
          Instructor
        </button>
      </div>

      <form onSubmit={handleLogin} className="mt-5 space-y-4">
        <div>
          <label className="text-sm font-semibold text-gray-700">
            Email / Username
          </label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@wmich.edu"
            className="mt-1 w-full rounded-2xl border bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-[#FFC72C]/60 focus:border-[#FFC72C]"
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-700">
            Password
          </label>
          <input
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            type="password"
            placeholder="password"
            className="mt-1 w-full rounded-2xl border bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-[#FFC72C]/60 focus:border-[#FFC72C]"
          />
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {regSuccess && (
          <div className="rounded-2xl border border-gray-50 px-4 py-3 text-sm">
            Registered
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className={[
            "w-full rounded-2xl font-bold py-3 transition shadow-sm",
            canSubmit
              ? "bg-[#4E3629] text-white hover:opacity-95"
              : "bg-gray-200 text-gray-500 cursor-not-allowed",
          ].join(" ")}
        >
          Sign in
        </button>

        <div className="text-center mt-4">
          <button
            type="button"
            onClick={() => navigateTo("forgotPassword")}
            className="text-sm text-blue-600 hover:underline"
          >
            Forgot Password?
          </button>
        </div>
      </form>
    </div>
  </PageShell>
);
}          

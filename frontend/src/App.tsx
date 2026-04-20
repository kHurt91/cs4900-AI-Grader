import React, { useMemo, useState, useEffect } from "react";
import ForgotPassword from './ForgotPassword';
import QuizTemplate from './QuizTemplate';
import CreateQuiz from './CreateQuiz';
import ViewSubmissions from './ViewSubmissions';
import CreateAssignment from './CreateAssignment';

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
  | "createCourse"
  | "createQuiz"
  | "viewSubmissions"
  | "createAssignment";

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
      id: "q22",
      type: "Quiz",
      title: "Problem 8.3 - Antenna Definitions",
      dueText: "Available now",
      submissionsText: "Not started",
      scoreText: "- / 10",
      evalText: "Unlimited attempts",
    },
    {
      id: "q27",
      type: "Quiz",
      title: "Problem 8.4 - Beam Pattern Derivation",
      dueText: "Available now",
      submissionsText: "Not started",
      scoreText: "- / 25",
      evalText: "Unlimited attempts",
    },
    {
      id: "q25",
      type: "Quiz",
      title: "Problem 8.6 - Antenna Far-Field Pattern",
      dueText: "Available now",
      submissionsText: "Not started",
      scoreText: "- / 20",
      evalText: "Unlimited attempts",
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

interface Tokens {
  refresh: string;
  access: string;
}

interface LoginResult {
  user: User;
  tokens: Tokens;
}


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
  const courseId = selectedCourse?.id ?? selectedInstructorCourse?.id;
  if (courseId) {
    fetch(`http://127.0.0.1:8000/api/quizzes/?course=${courseId}`)
      .then(r => r.json())
      .then(data => {
        const mapped = data.map((q: any) => ({
          id: `q${q.id}`,
          type: "Quiz" as CourseItemType,
          title: q.title,
          dueText: "Available now",
          submissionsText: "Not started",
          scoreText: `- / ${q.total_points ?? 10}`,
          evalText: q.max_attempts >= 9999 ? "Unlimited attempts" : `Up to ${q.max_attempts} attempts`,
        }));
        setCourseQuizzes(mapped);
      })
      .catch(() => setCourseQuizzes([]));
  }
}, [selectedCourse, selectedInstructorCourse]);

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

      const mapped = data.map((c: any) => ({
        id: c.id,
        code: c.course_code ?? c.code ?? "",
        title: c.title ?? "",
        term: c.semester ?? c.term ?? "",
        instructor_name: c.instructor_name ?? "",
      }));
      if (userRole === "student") {
        setStudentCourses(mapped);
      } else {
        setInstructorCourses(mapped);
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
  const TopBar = (
    <header className="sticky top-0 z-10 bg-gray-50/90 backdrop-blur border-b">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* left simple mark */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-[#4E3629] flex items-center justify-center text-[#FFC72C] font-black">
            W
          </div>
          <div className="leading-tight">
            <div className="font-extrabold tracking-tight">Portal</div>
            <div className="text-xs text-gray-500 -mt-0.5">
              Western Michigan University
            </div>
          </div>
        </div>

        {/* right nav buttons */}

        <nav className="flex items-center gap-2">
          {session ? (
            <button
            onClick={() => navigateTo("home")}
            className={[
              "px-4 py-2 rounded-full border shadow-sm text-sm font-semibold transition",
              page === "home"
                ? "bg-[#4E3629] text-white border-[#4E3629]"
                : "bg-white hover:shadow",
            ].join(" ")}
            type="button"
          >
            Home
          </button>
          ): null}
          <button
            onClick={() => navigateTo("about")}
            className={[
              "px-4 py-2 rounded-full border shadow-sm text-sm font-semibold transition",
              page === "about"
                ? "bg-[#4E3629] text-white border-[#4E3629]"
                : "bg-white hover:shadow",
            ].join(" ")}
            type="button"
          >
            About
          </button>

          <button
            onClick={() => navigateTo("contact")}
            className={[
              "px-4 py-2 rounded-full border shadow-sm text-sm font-semibold transition",
              page === "contact"
                ? "bg-[#4E3629] text-white border-[#4E3629]"
                : "bg-white hover:shadow",
            ].join(" ")}
            type="button"
          >
            Contact
          </button>

          {session ? (
            <button
              onClick={logout}
              className="ml-1 px-4 py-2 rounded-full bg-white border shadow-sm hover:shadow transition text-sm font-semibold"
              type="button"
            >
              Log out
            </button>
          ) : (
            <button
              onClick={() => navigateTo("login")}
              className={[
                "ml-1 px-4 py-2 rounded-full border shadow-sm text-sm font-semibold transition",
                page === "login"
                  ? "bg-[#4E3629] text-white border-[#4E3629]"
                  : "bg-white hover:shadow",
              ].join(" ")}
              type="button"
            >
              Login
            </button>
          )}

          <button
            onClick={() => navigateTo("registration")}
            className={[
              "px-4 py-2 rounded-full border shadow-sm text-sm font-semibold transition",
              page === "registration"
                ? "bg-[#4E3629] text-white border-[#4E3629]"
                : "bg-white hover:shadow",
            ].join(" ")}
            type="button"
          >
            Register
          </button>
        </nav>
      </div>
    </header>
  );

  // ---------- pgs ----------
  function PageShell({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900">
        {TopBar}
        <main className="max-w-5xl mx-auto px-4 py-10">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            {title}
          </h1>
          <div className="mt-4">{children}</div>
        </main>
        <footer className="max-w-5xl mx-auto px-4 pb-10 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} • WMU
        </footer>
      </div>
    );
  }

  if (page === "about") {
    return (
      <PageShell title="About">
        <div className="rounded-2xl bg-white border shadow-sm p-6 text-gray-700">
          <p className="leading-relaxed">bla bla bla this is the explanation</p>
        </div>
      </PageShell>
    );
  }

  if (page === "contact") {
    return (
      <PageShell title="Contact">
        <div className="rounded-2xl bg-white border shadow-sm p-6 text-gray-700">
          <p className="leading-relaxed">contact details to us ig</p>
        </div>
      </PageShell>
    );
  }

  if (page === "createCourse") {
        return (
      <PageShell title="Create course">
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
                  term
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


            {/* button */}
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
    <PageShell title="Registration">
      <div className="w-full">
        <div className="rounded-3xl bg-white border shadow-sm p-6 md:p-8 w-full">
          <form method="post" onSubmit={registerUser} className="space-y-6">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  First name
                </label>
                <input
                  name="first_name"
                  required
                  placeholder="First"
                  className="mt-1 w-full rounded-2xl border bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-[#FFC72C]/60 focus:border-[#FFC72C]"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Last name
                </label>
                <input
                  name="last_name"
                  required
                  placeholder="Last"
                  className="mt-1 w-full rounded-2xl border bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-[#FFC72C]/60 focus:border-[#FFC72C]"
                />
              </div>
            </div>


            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Email
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="name@wmich.edu"
                  className="mt-1 w-full rounded-2xl border bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-[#FFC72C]/60 focus:border-[#FFC72C]"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Username
                </label>
                <input
                  name="username"
                  required
                  placeholder="username"
                  className="mt-1 w-full rounded-2xl border bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-[#FFC72C]/60 focus:border-[#FFC72C]"
                />
              </div>
            </div>


            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Password
                </label>
                <input
                  name="password"
                  type="password"
                  required
                  placeholder="password"
                  className="mt-1 w-full rounded-2xl border bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-[#FFC72C]/60 focus:border-[#FFC72C]"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Role
                </label>

                <div className="mt-2 flex gap-6">
                  <label className="flex items-center gap-2 rounded-2xl border px-4 py-3 bg-white hover:bg-gray-50 cursor-pointer w-full">
                    <input
                      type="radio"
                      name="role"
                      value="student"
                      defaultChecked
                      className="accent-[#4E3629]"
                    />
                    <span className="font-semibold">Student</span>
                  </label>

                  <label className="flex items-center gap-2 rounded-2xl border px-4 py-3 bg-white hover:bg-gray-50 cursor-pointer w-full">
                    <input
                      type="radio"
                      name="role"
                      value="instructor"
                      className="accent-[#4E3629]"
                    />
                    <span className="font-semibold">Instructor</span>
                  </label>
                </div>
              </div>
            </div>


            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}


            {/* button */}
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

if (page === "course" && selectedCourse) {
  const items = courseQuizzes;
  const pill = (t: CourseItemType) => (
    <span
      className={[
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
        t === "Assignment" ? "bg-gray-50" : "bg-white",
      ].join(" ")}
    >
      {t}
    </span>
  );

  return (
    <PageShell title={selectedCourse.code}>
      <div className="rounded-2xl bg-white border shadow-sm overflow-hidden">
        <div className="h-2 bg-[#FFC72C]" />

        <div className="p-6">
          {/* row */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="text-sm text-gray-600">
              {selectedCourse.term} • Instructor: {selectedCourse.instructor_name}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigateTo("grades", { course: selectedCourse })}
                className="px-4 py-2 rounded-full bg-white border shadow-sm hover:shadow transition text-sm font-semibold"
              >
                Grades
              </button>

              <button
                type="button"
                onClick={() => {
                  navigateTo("home");
                }}
                className="px-4 py-2 rounded-full bg-white border shadow-sm hover:shadow transition text-sm font-semibold"
              >
                Back to courses
              </button>
            </div>
          </div>

          {/* header */}
          <div className="mt-6 rounded-2xl border overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-12 bg-gray-50 text-xs font-bold text-gray-600">
              <div className="md:col-span-7 p-3 border-b md:border-b-0 md:border-r">
                Item
              </div>
              <div className="md:col-span-3 p-3 border-b md:border-b-0 md:border-r">
                Completion
              </div>
              <div className="md:col-span-2 p-3">
                Score
              </div>
            </div>

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
    </PageShell>
  );
}

if (page === "instructorCourse" && selectedInstructorCourse) {
  const items = courseQuizzes;

  const pill = (t: CourseItemType) => (
    <span
      className={[
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
        t === "Assignment" ? "bg-gray-50" : "bg-white",
      ].join(" ")}
    >
      {t}
    </span>
  );

  const statusFor = (it: CourseItem) => {
    const s = (it.submissionsText ?? "").toLowerCase();
    if (!s) return "—";
    if (s.includes("not started")) return "Not started";
    if (s.includes("submission")) return "Submissions received";
    return it.submissionsText ?? "—";
  };

  return (
    <PageShell title={`${selectedInstructorCourse.code} (Instructor)`}>
      <div className="rounded-2xl bg-white border shadow-sm overflow-hidden">
        <div className="h-2 bg-[#FFC72C]" />

        <div className="p-6">
          {/* top row */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="text-sm text-gray-600">
              {selectedInstructorCourse.term} • Instructor:{" "}
              {selectedInstructorCourse.instructor_name}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigateTo("instructorGrades", { instructorCourse: selectedInstructorCourse })}
                className="px-4 py-2 rounded-full bg-white border shadow-sm hover:shadow transition text-sm font-semibold"
              >
                Gradebook
              </button>

              <button
                type="button"
                onClick={() => {
                  navigateTo("home");
                }}
                className="px-4 py-2 rounded-full bg-white border shadow-sm hover:shadow transition text-sm font-semibold"
              >
                Back to courses
              </button>
            </div>
          </div>

          {/* instructor actions */}
          <div className="mt-6 rounded-2xl border bg-gray-50 p-4">
            <div className="text-xs font-bold text-gray-600">Instructor Actions</div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => navigateTo("createAssignment", { instructorCourse: selectedInstructorCourse })}
                className="px-4 py-2 rounded-full bg-white border shadow-sm hover:shadow transition text-sm font-semibold"
              >
                Create Assignment
              </button>

              <button
                type="button"
                onClick={() => navigateTo("createQuiz", { instructorCourse: selectedInstructorCourse })}
                className="px-4 py-2 rounded-full bg-white border shadow-sm hover:shadow transition text-sm font-semibold"
              >
                Create Quiz
              </button>

              <button
                type="button"
                onClick={() => navigateTo("viewSubmissions", { instructorCourse: selectedInstructorCourse })}
                className="px-4 py-2 rounded-full bg-white border shadow-sm hover:shadow transition text-sm font-semibold"
              >
                View Submissions
              </button>
            </div>
          </div>

          {/* table */}
          <div className="mt-6 rounded-2xl border overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-12 bg-gray-50 text-xs font-bold text-gray-600">
              <div className="md:col-span-7 p-3 border-b md:border-b-0 md:border-r">
                Item
              </div>
              <div className="md:col-span-3 p-3 border-b md:border-b-0 md:border-r">
                Submissions
              </div>
              <div className="md:col-span-2 p-3">Actions</div>
            </div>

            <div className="divide-y">
              {items.length === 0 ? (
                <div className="p-4 text-sm text-gray-600">
                  No assignments or quizzes yet.
                </div>
              ) : (
                items.map((it) => (
                  <div key={it.id} className="grid grid-cols-1 md:grid-cols-12">
                    {/* item */}
                    <div className="md:col-span-7 p-4 md:border-r">
                      <div className="flex items-start justify-between gap-3">
                        <button type="button" onClick={() => { if (it.type === "Quiz") { setSelectedQuizId(parseInt(it.id.replace("q", ""))); navigateTo("quiz"); } }} className="font-bold text-[#4E3629] text-left hover:underline">{it.title}</button>
                        <div className="shrink-0">{pill(it.type)}</div>
                      </div>

                      <div className="text-sm text-gray-600 mt-1">{it.dueText}</div>

                      {it.windowText ? (
                        <div className="text-xs text-gray-500 mt-1">{it.windowText}</div>
                      ) : null}
                    </div>

                    {/* submissions */}
                    <div className="md:col-span-3 p-4 md:border-r">
                      <div className="text-sm text-gray-700">
                        {it.submissionsText ?? "—"}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Status: {statusFor(it)}
                      </div>
                    </div>

                    {/* actions */}
                    <div className="md:col-span-2 p-4 flex md:block items-center gap-2">
                      <button
                        type="button"
                        onClick={() => navigateTo("viewSubmissions", { instructorCourse: selectedInstructorCourse })}
                        className="px-3 py-2 rounded-full bg-white border shadow-sm hover:shadow transition text-xs font-semibold"
                      >
                        Submissions
                      </button>

                      <button
                        type="button"
                        onClick={() => navigateTo("instructorGrades", { instructorCourse: selectedInstructorCourse })}
                        className="mt-0 md:mt-2 px-3 py-2 rounded-full bg-[#4E3629] text-white border border-[#4E3629] shadow-sm hover:opacity-95 transition text-xs font-semibold"
                      >
                        Gradebook
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

if (page === "instructorGrades" && selectedInstructorCourse) {
  const items = DEMO_COURSE_ITEMS[selectedInstructorCourse.id] ?? [];

  const pill = (t: CourseItemType) => (
    <span
      className={[
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
        t === "Assignment" ? "bg-gray-50" : "bg-white",
      ].join(" ")}
    >
      {t}
    </span>
  );

  return (
    <PageShell title={`${selectedInstructorCourse.code ?? selectedInstructorCourse.title ?? "Course"} Gradebook`}>
      <div className="rounded-2xl bg-white border shadow-sm overflow-hidden">
        <div className="h-2 bg-[#FFC72C]" />

        <div className="p-6">
          {/* Top row */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="text-sm text-gray-600">
              {selectedInstructorCourse.term} • Instructor:{" "}
              {selectedInstructorCourse.instructor_name}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigateTo("instructorCourse", { instructorCourse: selectedInstructorCourse })}
                className="px-4 py-2 rounded-full bg-white border shadow-sm hover:shadow transition text-sm font-semibold"
              >
                Assignments &amp; Quizzes
              </button>

              <button
                type="button"
                onClick={() => {
                  navigateTo("home");
                }}
                className="px-4 py-2 rounded-full bg-white border shadow-sm hover:shadow transition text-sm font-semibold"
              >
                Back to courses
              </button>
            </div>
          </div>

          {/* header */}
          <div className="mt-6 rounded-2xl border overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-12 bg-gray-50 text-xs font-bold text-gray-600">
              <div className="md:col-span-7 p-3 border-b md:border-b-0 md:border-r">
                Item
              </div>

              <div className="md:col-span-3 p-3 border-b md:border-b-0 md:border-r">
                Score
              </div>

              <div className="md:col-span-2 p-3">Eval</div>
            </div>

            <div className="divide-y">
              {items.length === 0 ? (
                <div className="p-4 text-sm text-gray-600">No grades yet.</div>
              ) : (
                items.map((it) => (
                  <div key={it.id} className="grid grid-cols-1 md:grid-cols-12">
                    {/* item */}
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

                    {/* score */}
                    <div className="md:col-span-3 p-4 md:border-r text-sm text-gray-700">
                      {it.scoreText ?? "-"}
                    </div>

                    {/* eval */}
                    <div className="md:col-span-2 p-4 text-sm text-gray-700">
                      {it.evalText ?? ""}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

if (page === "grades" && selectedCourse) {
  const items = DEMO_COURSE_ITEMS[selectedCourse.id] ?? [];

  const pill = (t: CourseItemType) => (
    <span
      className={[
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
        t === "Assignment" ? "bg-gray-50" : "bg-white",
      ].join(" ")}
    >
      {t}
    </span>
  );

  return (
    <PageShell title={`${selectedCourse.code} Grades`}>
      <div className="rounded-2xl bg-white border shadow-sm overflow-hidden">
        <div className="h-2 bg-[#FFC72C]" />

        <div className="p-6">
          {/* Top row */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="text-sm text-gray-600">
              {selectedCourse.term} • Instructor: {selectedCourse.instructor_name}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigateTo("course", { course: selectedCourse })}
                className="px-4 py-2 rounded-full bg-white border shadow-sm hover:shadow transition text-sm font-semibold"
              >
                Assignments &amp; Quizzes
              </button>

              <button
                type="button"
                onClick={() => {
                  navigateTo("home");
                }}
                className="px-4 py-2 rounded-full bg-white border shadow-sm hover:shadow transition text-sm font-semibold"
              >
                Back to courses
              </button>
            </div>
          </div>

          {/* header */}
          <div className="mt-6 rounded-2xl border overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-12 bg-gray-50 text-xs font-bold text-gray-600">
              <div className="md:col-span-7 p-3 border-b md:border-b-0 md:border-r">
                Item
              </div>

              <div className="md:col-span-3 p-3 border-b md:border-b-0 md:border-r">
                Score
              </div>

              <div className="md:col-span-2 p-3">
                Eval
              </div>
            </div>

            <div className="divide-y">
              {items.length === 0 ? (
                <div className="p-4 text-sm text-gray-600">
                  No grades yet.
                </div>
              ) : (
                items.map((it) => (
                  <div key={it.id} className="grid grid-cols-1 md:grid-cols-12">

                    {/* item */}
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

                    {/* score */}
                    <div className="md:col-span-3 p-4 md:border-r text-sm text-gray-700">
                      {it.scoreText ?? "-"}
                    </div>

                    {/* eval */}
                    <div className="md:col-span-2 p-4 text-sm text-gray-700">
                      {it.evalText ?? ""}
                    </div>

                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
  // ---------- Quiz Template ----------
if (page === "createAssignment" && selectedInstructorCourse) {
  return (
    <CreateAssignment
      courseId={selectedInstructorCourse.id}
      courseCode={selectedInstructorCourse.code}
      accessToken={loginresult?.tokens?.access ?? ""}
      onCreated={() => navigateTo("instructorCourse", { instructorCourse: selectedInstructorCourse })}
    />
  );
}

if (page === "viewSubmissions" && selectedInstructorCourse) {
  return (
    <ViewSubmissions
      courseId={selectedInstructorCourse.id}
      courseCode={selectedInstructorCourse.code}
      onBack={() => navigateTo("instructorCourse", { instructorCourse: selectedInstructorCourse })}
    />
  );
}

if (page === "createQuiz" && selectedInstructorCourse) {
  return (
    <CreateQuiz
      setPage={setPage}
      courseId={selectedInstructorCourse.id}
      courseCode={selectedInstructorCourse.code}
      accessToken={loginresult?.tokens?.access ?? ""}
      onCreated={() => {
        navigateTo("instructorCourse", { instructorCourse: selectedInstructorCourse });
      }}
    />
  );
}

if (page === "quiz" && selectedQuizId) {
  return <QuizTemplate setPage={setPage} quizId={selectedQuizId} />;
}

  // ---------- logged ----------
if (loginresult && session && (page === "login" || page === "home")) {
  const isInstructor = session.role === ROLES.instructor;

  return (
    <PageShell title={isInstructor ? "Instructor Home" : "Student Home"}>
      <div className="rounded-2xl bg-white border shadow-sm p-6">
        <p className="text-gray-700">
          Signed in as{" "}
          <span className="font-semibold">{loginresult.user.username}</span>{" "}
          ({isInstructor ? "Instructor" : "Student"}).
        </p>

        {isInstructor ? (
          <div className="mt-6">
            <div className="flex items-end justify-between gap-4">
              <div className="text-lg font-extrabold tracking-tight">
                My Courses
              </div>

              <div className="text-xs text-gray-500">
                {instructorCourses.length} teaching
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {instructorCourses.map((course) => (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => {
                    navigateTo("instructorCourse", { instructorCourse: course });
                  }}
                  className="text-left rounded-2xl bg-white border shadow-sm hover:shadow-md transition overflow-hidden"
                >
                  <div className="h-2 bg-[#FFC72C]" />

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-base font-bold">
                          {course.code}
                        </div>

                        <div className="text-sm text-gray-700 mt-1">
                          {course.title}
                        </div>
                      </div>

                      <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold bg-gray-50">
                        {course.term}
                      </span>
                    </div>

                    <div className="text-xs text-gray-500 mt-3">
                      Instructor: {course.instructor_name}
                    </div>

                    <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#4E3629]">
                      Open course <span aria-hidden>→</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {instructorCourses.length === 0 && (
              <div className="mt-4 rounded-2xl border bg-gray-50 px-4 py-3 text-sm text-gray-700">
                You’re not teaching any courses yet.
              </div>
            )}
            <div className="flex justify-end gap-6">
              <div className="">
                <button
                  type="button"
                  onClick={() => {
                    navigateTo("createCourse", );
                  }}
                  className="px-4 py-2 rounded-full bg-white border shadow-sm hover:shadow transition text-sm font-semibold"
                >
                  Create course
                </button>
              </div>
            </div>

          </div>
        ) : (
          <div className="mt-6">
            <div className="flex items-end justify-between gap-4">
              <div className="text-lg font-extrabold tracking-tight">
                My Courses
              </div>

              <div className="text-xs text-gray-500">
                {studentCourses.length} enrolled
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {studentCourses.map((course) => (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => {
                    navigateTo("course", { course });
                  }}
                  className="text-left rounded-2xl bg-white border shadow-sm hover:shadow-md transition overflow-hidden"
                >
                  <div className="h-2 bg-[#FFC72C]" />

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-base font-bold">
                          {course.code}
                        </div>

                        <div className="text-sm text-gray-700 mt-1">
                          {course.title}
                        </div>
                      </div>

                      <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold bg-gray-50">
                        {course.term}
                      </span>
                    </div>

                    <div className="text-xs text-gray-500 mt-3">
                      Instructor: {course.instructor_name}
                    </div>

                    <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#4E3629]">
                      Open course <span aria-hidden>→</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {studentCourses.length === 0 && (
              <div className="mt-4 rounded-2xl border bg-gray-50 px-4 py-3 text-sm text-gray-700">
                You’re not enrolled in any courses yet.
              </div>
            )}
          </div>
        )}
      </div>
    </PageShell>
  );
}

// ---------- authenticated fallback ----------
if (session && loginresult) {
  return (
    <PageShell title="Home">
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
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {TopBar}

      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="max-w-md mx-auto rounded-3xl bg-white border shadow-sm p-6 md:p-7">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">Login</h1>
            </div>
            <div className="h-10 w-10 rounded-2xl bg-[#FFC72C] flex items-center justify-center font-black text-[#4E3629]">
              ✓
            </div>
          </div>

          {/* roles */}
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
      </main>

      <footer className="max-w-5xl mx-auto px-4 pb-10 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} • WMU
      </footer>
    </div>
  );
}



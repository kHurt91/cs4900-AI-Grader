import React, { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createApiClient, publicClient } from "../api/client";
import type { Course, LoginResult, Role } from "../types";

type Session = { role: Role; email: string };

type AuthContextValue = {
  loginresult: LoginResult | null;
  session: Session | null;
  isInitializing: boolean;
  studentCourses: Course[];
  instructorCourses: Course[];
  login: (username: string, password: string, role: Role) => Promise<string | null>;
  logout: () => Promise<void>;
  fetchCourses: (accessToken: string, role: Role) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const SESSION_RESTORE_TIMEOUT_MS = 5000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [loginresult, setLoginResult] = useState<LoginResult | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [studentCourses, setStudentCourses] = useState<Course[]>([]);
  const [instructorCourses, setInstructorCourses] = useState<Course[]>([]);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), SESSION_RESTORE_TIMEOUT_MS);

    async function restoreSession() {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL || ""}/api/users/auth/refresh/`,
          { method: "POST", credentials: "include", signal: controller.signal }
        );
        if (res.ok) {
          const data = await res.json();
          setLoginResult({ user: data.user, tokens: { access: data.access } });
          const role = data.user.role as Role;
          setSession({ role, email: data.user.email });
          fetchCourses(data.access, role).catch(() => {});
          if (window.location.pathname === "/login") {
            navigate("/", { replace: true });
          }
        }
      } catch {
        // network error — leave state null, user will see login page
      } finally {
        window.clearTimeout(timeoutId);
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    }
    restoreSession();

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchCourses(accessToken: string, role: Role) {
    const api = createApiClient(accessToken);
    const { data, error } = await api.GET("/api/courses/");
    if (error) throw new Error("Failed to fetch courses");
    const courses: Course[] = Array.isArray(data) ? data : ((data as any)?.results ?? []);
    if (role === "student") {
      setStudentCourses(courses);
    } else {
      setInstructorCourses(courses);
    }
  }

  async function login(username: string, password: string, role: Role): Promise<string | null> {
    const { data, error, response } = await publicClient.POST("/api/users/auth/login/", {
      body: { username, password, role },
      credentials: "include",
    });

    if (error || !response.ok) {
      return (error as any)?.error ?? "Login failed.";
    }

    setLoginResult(data);
    setSession({ role, email: username.trim() });
    await fetchCourses(data.tokens.access, role);
    navigate("/", { replace: true });
    return null;
  }

  async function logout() {
    try {
      const api = createApiClient(loginresult?.tokens.access);
      await api.POST("/api/users/auth/logout/", { credentials: "include" } as any);
    } catch {
      // proceed with local logout even if backend call fails
    }

    setLoginResult(null);
    setSession(null);
    setStudentCourses([]);
    setInstructorCourses([]);
    navigate("/login", { replace: true });
  }

  return (
    <AuthContext.Provider
      value={{ loginresult, session, isInitializing, studentCourses, instructorCourses, login, logout, fetchCourses }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

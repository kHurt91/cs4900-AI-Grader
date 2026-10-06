import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { Role } from "../types";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("student");
  const [username, setUsername] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => username.trim().length > 0 && pw.trim().length > 0, [username, pw]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const err = await login(username, pw, role);
      if (err) setError(err);
    } catch {
      setError("Failed to connect to database.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-10">
      <div className="max-w-md mx-auto rounded-3xl bg-white border shadow-sm p-6 md:p-7">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-5">Login</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setRole("student")}
            className={[
              "flex-1 rounded-2xl border px-4 py-2 font-bold transition",
              role === "student" ? "bg-[#4E3629] text-white border-[#4E3629]" : "bg-white hover:bg-gray-50",
            ].join(" ")}
          >
            Student
          </button>
          <button
            type="button"
            onClick={() => setRole("instructor")}
            className={[
              "flex-1 rounded-2xl border px-4 py-2 font-bold transition",
              role === "instructor" ? "bg-[#4E3629] text-white border-[#4E3629]" : "bg-white hover:bg-gray-50",
            ].join(" ")}
          >
            Instructor
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="text-sm font-semibold text-gray-700">Email / Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="name@wmich.edu"
              className="mt-1 w-full rounded-2xl border bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-[#FFC72C]/60 focus:border-[#FFC72C]"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700">Password</label>
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

          <button
            type="submit"
            disabled={!canSubmit || loading}
            className={[
              "w-full rounded-2xl font-bold py-3 transition shadow-sm",
              canSubmit && !loading
                ? "bg-[#4E3629] text-white hover:opacity-95"
                : "bg-gray-200 text-gray-500 cursor-not-allowed",
            ].join(" ")}
          >
            Sign in
          </button>

          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => navigate("/forgot-password")}
              className="text-sm text-blue-600 hover:underline"
            >
              Forgot password?
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

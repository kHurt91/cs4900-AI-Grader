import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatApiError } from "../../api/client";
import PageShell from "../../components/PageShell";
import { useApi } from "../../api/useApi";
import { useAuth } from "../../context/AuthContext";

export default function CreateCourse() {
  const { loginresult, fetchCourses, session } = useAuth();
  const api = useApi();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = e.target as HTMLFormElement;
    const formObj = Object.fromEntries(new FormData(form).entries());

    try {
      const { error: apiError } = await api.POST("/api/courses/create_course/", {
        body: {
          course_code: String(formObj.course_code),
          title: String(formObj.title),
          term: formObj.term as "fall" | "winter" | "spring" | "summer",
          instructor_name: loginresult!.user.username ?? "username failed",
          instructor_id: loginresult!.user.id ?? -1,
        },
      });

      if (!apiError) {
        form.reset();
        await fetchCourses(loginresult!.tokens.access, session!.role);
        navigate("/", { replace: true });
      } else {
        setError(formatApiError(apiError, "Failed to create course."));
      }
    } catch {
      setError("Failed to connect.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageShell>
      <div className="w-full">
        <div className="rounded-3xl bg-white border shadow-sm p-6 md:p-8 w-full">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-6">Create Course</h1>
          <form method="post" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-semibold text-gray-700">Title</label>
                <input
                  name="title"
                  required
                  placeholder="Software Systems Development II"
                  className="mt-1 w-full rounded-2xl border bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-[#FFC72C]/60 focus:border-[#FFC72C]"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">Course code</label>
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
                <label className="text-sm font-semibold text-gray-700">Term</label>
                <select
                  name="term"
                  required
                  defaultValue=""
                  className="mt-1 w-full rounded-2xl border bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-[#FFC72C]/60 focus:border-[#FFC72C] cursor-pointer"
                >
                  <option value="" disabled>Select a term</option>
                  <option value="fall">Fall</option>
                  <option value="winter">Winter</option>
                  <option value="spring">Spring</option>
                  <option value="summer">Summer</option>
                </select>
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
                disabled={loading}
                className="px-8 py-3 rounded-2xl font-bold transition shadow-sm bg-[#4E3629] text-white hover:opacity-95 disabled:opacity-60"
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

import { useLocation, useNavigate, useParams } from "react-router-dom";
import PageShell from "../../components/PageShell";
import type { Submission } from "../../types";

export default function SubmissionDetails() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const submission = location.state?.submission as Submission | undefined;

  if (!submission) {
    return (
      <PageShell title="Submission Details">
        <p className="text-gray-500">No submission selected.</p>
        <button
          type="button"
          onClick={() => navigate(`/instructor/course/${courseId}/submissions`)}
          className="mt-4 px-4 py-2 rounded-full bg-white border shadow-sm hover:shadow transition text-sm font-semibold"
        >
          Back to Submissions
        </button>
      </PageShell>
    );
  }

  const field = (label: string, value: React.ReactNode) => (
    <div className="rounded-2xl border bg-gray-50 p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="font-semibold text-gray-900">{value}</div>
    </div>
  );

  return (
    <PageShell>
      <div className="rounded-2xl bg-white border shadow-sm overflow-hidden">
        <div className="h-2 bg-[#FFC72C]" />

        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Submission Details</h1>
              <div className="text-sm text-gray-500 mt-1">{submission.quiz_title}</div>
            </div>
            <button
              type="button"
              onClick={() => navigate(`/instructor/course/${courseId}/submissions`)}
              className="px-4 py-2 rounded-full bg-white border shadow-sm hover:shadow transition text-sm font-semibold"
            >
              Back to Submissions
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {field("Student", submission.student)}
            {field("Attempt", `#${submission.attempt_number}`)}
            {field("Status", submission.status.replace("_", " "))}
            {field("Score", submission.score ?? "—")}
            {field("Started At", submission.grading_started_at || "—")}
            {field("Submitted At", submission.submitted_at || "—")}
          </div>
        </div>
      </div>
    </PageShell>
  );
}

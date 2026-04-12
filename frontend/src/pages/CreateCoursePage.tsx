import type React from "react";
import ErrorAlert from "../elements/ErrorNotice";

type Props = {
  error: string | null;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
};

export default function CreateCoursePage({ error, onSubmit }: Props) {
  return (
    <div className="w-full">
      <div className="rounded-3xl bg-white border shadow-sm p-6 md:p-8 w-full">
        <form method="post" onSubmit={onSubmit} className="space-y-6">
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

          <div>
            <label className="text-sm font-semibold text-gray-700">Term</label>
            <input
              name="term"
              required
              placeholder="spring"
              className="mt-1 w-full rounded-2xl border bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-[#FFC72C]/60 focus:border-[#FFC72C]"
            />
          </div>

          <ErrorAlert message={error} />

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
  );
}
import type React from "react";
import ErrorAlert from "../elements/ErrorNotice";

type Props = {
  error: string | null;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
};

export default function RegistrationPage({ error, onSubmit }: Props) {
  return (
    <div className="w-full">
      <div className="rounded-3xl bg-white border shadow-sm p-6 md:p-8 w-full">
        <form method="post" onSubmit={onSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-semibold text-gray-700">First name</label>
              <input
                name="first_name"
                required
                placeholder="First"
                className="mt-1 w-full rounded-2xl border bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-[#FFC72C]/60 focus:border-[#FFC72C]"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">Last name</label>
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
              <label className="text-sm font-semibold text-gray-700">Email</label>
              <input
                name="email"
                type="email"
                required
                placeholder="name@wmich.edu"
                className="mt-1 w-full rounded-2xl border bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-[#FFC72C]/60 focus:border-[#FFC72C]"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">Username</label>
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
              <label className="text-sm font-semibold text-gray-700">Password</label>
              <input
                name="password"
                type="password"
                required
                placeholder="password"
                className="mt-1 w-full rounded-2xl border bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-[#FFC72C]/60 focus:border-[#FFC72C]"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">Role</label>
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
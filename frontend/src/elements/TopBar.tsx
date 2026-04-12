import type { Page } from "../types";

type Props= {
  page: Page;
  sessionExists: boolean;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
};

export default function TopBar({
  page,
  sessionExists,
  onNavigate,
  onLogout,
}: Props) {
  return (
    <header className="sticky top-0 z-10 bg-gray-50/90 backdrop-blur border-b">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
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

        <nav className="flex items-center gap-2">
          {sessionExists ? (
            <button
              onClick={() => onNavigate("home")}
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
          ) : null}

          <button
            onClick={() => onNavigate("about")}
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
            onClick={() => onNavigate("contact")}
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

          {sessionExists ? (
            <button
              onClick={onLogout}
              className="ml-1 px-4 py-2 rounded-full bg-white border shadow-sm hover:shadow transition text-sm font-semibold"
              type="button"
            >
              Log out
            </button>
          ) : (
            <button
              onClick={() => onNavigate("login")}
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
            onClick={() => onNavigate("registration")}
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
}
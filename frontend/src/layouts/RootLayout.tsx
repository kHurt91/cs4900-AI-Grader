import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RootLayout() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const navBtn = (label: string, path: string) => (
    <button
      type="button"
      onClick={() => navigate(path)}
      className={[
        "px-4 py-2 rounded-full border shadow-sm text-sm font-semibold transition cursor-pointer",
        pathname === path
          ? "bg-[#4E3629] text-white border-[#4E3629]"
          : "bg-white hover:shadow",
      ].join(" ")}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-10 bg-gray-50/90 backdrop-blur border-b">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-[#4E3629] flex items-center justify-center text-[#FFC72C] font-black">
              W
            </div>
            <div className="leading-tight">
              <div className="font-extrabold tracking-tight">AI Grader</div>
              <div className="text-xs text-gray-500 -mt-0.5">Western Michigan University</div>
            </div>
          </div>

          <nav className="flex items-center gap-2">
            {session ? navBtn("Home", "/") : null}
            {navBtn("About", "/about")}

            {session ? (
              <button
                type="button"
                onClick={logout}
                className="ml-1 px-4 py-2 rounded-full bg-white border shadow-sm hover:shadow transition text-sm font-semibold cursor-pointer"
              >
                Log out
              </button>
            ) : (
              <>
                {navBtn("Login", "/login")}
                {navBtn("Register", "/register")}
              </>
            )}
          </nav>
        </div>
      </header>

      <Outlet />

      <footer className="max-w-5xl mx-auto px-4 pb-10 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} • WMU
      </footer>
    </div>
  );
}

import type { ReactNode } from "react";
import type { Page } from "../types";
import TopBar from "./TopBar";

type Props= {
  title: string;
  children: ReactNode;
  page: Page;
  sessionExists: boolean;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
};

export default function PageShell({
  title,
  children,
  page,
  sessionExists,
  onNavigate,
  onLogout,
}: Props) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <TopBar
        page={page}
        sessionExists={sessionExists}
        onNavigate={onNavigate}
        onLogout={onLogout}
      />
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
import React from "react";

export default function PageShell({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="max-w-5xl mx-auto px-4 py-10">
      {title && <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">{title}</h1>}
      <div className={title ? "mt-4" : ""}>{children}</div>
    </main>
  );
}

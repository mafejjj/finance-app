import { ReactNode } from "react";

interface Props {
  title: string;
  children: ReactNode;
}

export function AppShell({ title, children }: Props) {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="mb-6 text-2xl font-bold">{title}</h1>
        {children}
      </div>
    </main>
  );
}
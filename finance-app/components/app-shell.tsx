"use client";

import Link from "next/link";
import { ReactNode } from "react";

interface AppShellProps {
  title: string;
  children: ReactNode;
}

const items = [
  { label: "Minha conta", view: "account" },
  { label: "Criar mês", view: "create-month" },
  { label: "Selecionar mês", view: "dashboard" },
  { label: "Receitas recorrentes", view: "recurring-incomes" },
  { label: "Despesas recorrentes", view: "recurring-expenses" },
  { label: "Meses cadastrados", view: "months" },
];

export function AppShell({ title, children }: AppShellProps) {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex min-h-screen">
        <aside className="w-72 border-r border-slate-800 bg-slate-900/90 p-6">
          <div className="mb-8">
            <h1 className="text-2xl font-bold">Finance App</h1>
            <p className="mt-1 text-sm text-slate-400">
              Seu controle financeiro
            </p>
          </div>

          <nav className="space-y-2">
            {items.map((item) => (
              <Link
                key={item.view}
                href={`/dashboard?view=${item.view}`}
                className="block rounded-xl px-4 py-3 text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <section className="flex-1 p-8">
          <header className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
          </header>

          {children}
        </section>
      </div>
    </main>
  );
}
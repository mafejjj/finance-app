"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ReactNode } from "react";

interface AppShellProps {
  title: string;
  children: ReactNode;
}

const items: Array<{
  label: string;
  view?: string;
  href?: string;
  icon: ReactNode;
}> = [
  {
    label: "Minha conta",
    view: "account",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path
          d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5Z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    label: "Categorias",
    view: "categories",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path
          d="M4 6h16v4H4Zm0 8h10v4H4Zm12 0h4v4h-4Z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    label: "Cofrinhos",
    href: "/cofrinhos",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path
          d="M7 6a5 5 0 1 1 10 0h2a3 3 0 0 1 0 6h-1a6 6 0 0 1-12 0H5a3 3 0 0 1 0-6h2Zm10 6a5 5 0 0 0-10 0 5 5 0 0 0 10 0Z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    label: "Criar mês",
    view: "create-month",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path
          d="M7 3h2v2h6V3h2v2h3v16H4V5h3Zm-1 8h12v2H6v-2Zm0 4h8v2H6v-2Z"
          fill="currentColor"
        />
        <path d="M18 11h2v2h-2v2h-2v-2h-2v-2h2V9h2Z" fill="currentColor" />
      </svg>
    ),
  },
  {
    label: "Selecionar mês",
    view: "dashboard",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path
          d="M4 5h16v14H4Zm2 2v10h12V7H6Zm2 2h8v2H8Zm0 4h5v2H8Z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    label: "Receitas recorrentes",
    view: "recurring-incomes",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path
          d="M12 4a8 8 0 1 1-7.7 6H2l3-3 3 3H6.3A6 6 0 1 0 12 6v2l4-3-4-3v2Z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    label: "Despesas recorrentes",
    view: "recurring-expenses",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path
          d="M12 20a8 8 0 1 1 7.7-6H22l-3 3-3-3h1.7A6 6 0 1 0 12 18v-2l-4 3 4 3v-2Z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    label: "Meses cadastrados",
    view: "months",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path
          d="M4 4h16v16H4Zm2 4h12V6H6Zm0 4h6v-2H6Zm0 4h8v-2H6Z"
          fill="currentColor"
        />
      </svg>
    ),
  },
];

export function AppShell({ title, children }: AppShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentView = searchParams.get("view") || "dashboard";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex min-h-screen">
        <aside className="group/sidebar w-20 overflow-hidden border-r border-slate-800 bg-slate-900/90 p-4 transition-all duration-300 ease-out hover:w-72">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-800 text-lg font-semibold">
              F
            </div>
            <div className="hidden whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover/sidebar:block group-hover/sidebar:opacity-100">
              <h1 className="text-lg font-bold">Finance App</h1>
              <p className="mt-1 text-xs text-slate-400">
                Seu controle financeiro
              </p>
            </div>
          </div>

          <nav className="space-y-1">
            {items.map((item) => {
              const href = item.href || `/dashboard?view=${item.view}`;
              const isActive = item.href
                ? pathname.startsWith(item.href)
                : pathname.startsWith("/dashboard") && currentView === item.view;

              return (
                <Link
                  key={item.href || item.view}
                  href={href}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${
                    isActive
                      ? "bg-slate-800 text-white"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800/60 text-slate-200 transition group-hover:bg-slate-700">
                    {item.icon}
                  </span>
                  <span className="hidden whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover/sidebar:block group-hover/sidebar:opacity-100">
                    {item.label}
                  </span>
                </Link>
              );
            })}
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
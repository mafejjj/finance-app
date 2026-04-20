"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { AppShell } from "@/components/app-shell";
import { Month } from "@/types";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [months, setMonths] = useState<Month[]>([]);
  const [monthName, setMonthName] = useState("");
  const [monthNumber, setMonthNumber] = useState("");
  const [year, setYear] = useState("");

  useEffect(() => {
    async function loadData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      setEmail(user.email || "");
      setUserId(user.id);

      const { data, error } = await supabase
        .from("months")
        .select("*")
        .order("year", { ascending: false })
        .order("month", { ascending: false });

      if (!error && data) {
        setMonths(data);
      }

      setLoading(false);
    }

    loadData();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  async function handleCreateMonth(e: React.FormEvent) {
    e.preventDefault();

    if (!monthName || !monthNumber || !year) {
      alert("Preencha nome, mês e ano.");
      return;
    }

    const { error } = await supabase.from("months").insert({
      user_id: userId,
      name: monthName,
      month: Number(monthNumber),
      year: Number(year),
    });

    if (error) {
      alert("Erro ao criar mês.");
      return;
    }

    setMonthName("");
    setMonthNumber("");
    setYear("");

    await refreshMonths();
  }

  async function refreshMonths() {
    const { data, error } = await supabase
      .from("months")
      .select("*")
      .order("year", { ascending: false })
      .order("month", { ascending: false });

    if (!error && data) {
      setMonths(data);
    }
  }

  async function handleDeleteMonth(id: string) {
    const { error } = await supabase.from("months").delete().eq("id", id);

    if (error) {
      alert("Erro ao deletar mês.");
      return;
    }

    await refreshMonths();
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p>Carregando...</p>
      </main>
    );
  }

  return (
    <AppShell title="Dashboard">
      <div className="grid gap-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <p className="mb-2 text-slate-300">Bem-vinda ao seu sistema financeiro 🚀</p>
          <p className="text-sm text-slate-400">Usuária logada: {email}</p>

          <button
            onClick={handleLogout}
            className="mt-4 rounded-xl bg-white px-4 py-2 font-medium text-slate-900"
          >
            Sair
          </button>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-xl font-semibold">Criar novo mês</h2>

          <form onSubmit={handleCreateMonth} className="grid gap-4 md:grid-cols-4">
            <input
              type="text"
              placeholder="Nome (ex: Abril/2026)"
              className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none"
              value={monthName}
              onChange={(e) => setMonthName(e.target.value)}
            />

            <input
              type="number"
              placeholder="Mês"
              className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none"
              value={monthNumber}
              onChange={(e) => setMonthNumber(e.target.value)}
            />

            <input
              type="number"
              placeholder="Ano"
              className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />

            <button
              type="submit"
              className="rounded-xl bg-white px-4 py-3 font-medium text-slate-900"
            >
              Criar mês
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-xl font-semibold">Meses cadastrados</h2>

          {months.length === 0 ? (
            <p className="text-slate-400">Nenhum mês cadastrado ainda.</p>
          ) : (
            <div className="grid gap-3">
              {months.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-4"
                >
                  <div>
                    <p className="font-medium text-white">{item.name}</p>
                    <p className="text-sm text-slate-400">
                      Mês {item.month} / {item.year}
                    </p>
                  </div>

                  <button
                    onClick={() => handleDeleteMonth(item.id)}
                    className="rounded-lg border border-red-500 px-3 py-2 text-sm text-red-400"
                  >
                    Deletar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
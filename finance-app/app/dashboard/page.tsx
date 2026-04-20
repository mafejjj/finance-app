"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { AppShell } from "@/components/app-shell";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");

  useEffect(() => {
    async function getUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      setEmail(user.email || "");
      setLoading(false);
    }

    getUser();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
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
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <p className="mb-4 text-slate-300">
          Bem-vinda ao seu sistema financeiro 🚀
        </p>

        <p className="mb-6 text-sm text-slate-400">
          Usuária logada: {email}
        </p>

        <button
          onClick={handleLogout}
          className="rounded-xl bg-white px-4 py-2 font-medium text-slate-900"
        >
          Sair
        </button>
      </div>
    </AppShell>
  );
}
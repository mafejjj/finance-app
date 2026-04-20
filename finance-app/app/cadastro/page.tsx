"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Cadastro() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      alert("Erro ao cadastrar");
      return;
    }

    const userId = data.user?.id;

    if (userId) {
      await supabase.from("profiles").upsert({
        id: userId,
        full_name: fullName,
        email,
      });
    }

    alert("Conta criada! Verifique seu e-mail antes de fazer login.");
    window.location.href = "/login";
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <form
        onSubmit={handleCadastro}
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-sm"
      >
        <h1 className="mb-6 text-2xl font-bold">Criar conta</h1>

        <div className="grid gap-4">
          <input
            type="text"
            placeholder="Nome completo"
            className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />

          <input
            type="email"
            placeholder="Email"
            className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Senha"
            className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button className="rounded-xl bg-white p-3 font-medium text-slate-900">
            Criar conta
          </button>
        </div>
      </form>
    </main>
  );
}
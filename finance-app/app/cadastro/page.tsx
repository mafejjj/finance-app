"use client";

import { useState } from "react";
import { CenterModal } from "@/components/center-modal";
import { supabase } from "@/lib/supabase";

export default function Cadastro() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [modal, setModal] = useState<{
    title: string;
    message: string;
    intent: "error" | "success";
    onConfirm?: () => void;
  } | null>(null);

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setModal({
        title: "Erro",
        message: "Erro ao cadastrar",
        intent: "error",
      });
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

    setModal({
      title: "Conta criada",
      message: "Conta criada! Verifique seu e-mail antes de fazer login.",
      intent: "success",
      onConfirm: () => {
        window.location.href = "/login";
      },
    });
  }

  return (
    <>
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

      <CenterModal
        open={Boolean(modal)}
        title={modal?.title || ""}
        message={modal?.message || ""}
        intent={modal?.intent}
        confirmLabel="Ok"
        onConfirm={modal?.onConfirm}
        onClose={() => setModal(null)}
      />
    </>
  );
}
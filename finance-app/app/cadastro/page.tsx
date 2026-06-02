"use client";

import Link from "next/link";
import { useState } from "react";
import { CenterModal } from "@/components/center-modal";
import { supabase } from "@/lib/supabase";

export default function Cadastro() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [modal, setModal] = useState<{
    title: string;
    message: string;
    intent: "error" | "success";
    onConfirm?: () => void;
  } | null>(null);

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault();

    if (password.length < 6) {
      setModal({
        title: "Erro",
        message: "A senha deve ter pelo menos 6 caracteres.",
        intent: "error",
      });
      return;
    }

    if (password !== confirmPassword) {
      setModal({
        title: "Erro",
        message: "As senhas nao conferem.",
        intent: "error",
      });
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();

    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      let msg = "Erro ao cadastrar.";
      if (error.message.includes("already registered")) {
        msg = "Este e-mail já está cadastrado.";
      } else if (error.message.includes("disabled")) {
        msg = "Cadastro de novos usuários está desabilitado.";
      } else if (error.message) {
        msg = error.message;
      }
      setModal({
        title: "Erro",
        message: msg,
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
      <main className="relative min-h-screen overflow-hidden bg-slate-950 px-6 text-white">
        <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-rose-500/20 blur-3xl" />

        <div className="relative mx-auto flex min-h-screen w-full max-w-5xl items-center">
          <div className="grid w-full gap-12 md:grid-cols-2">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-3 rounded-full border border-slate-800 bg-slate-900/60 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-300">
                Finance App
              </div>
              <h1 className="text-4xl font-bold leading-tight md:text-5xl">
                Comece a organizar sua vida financeira.
              </h1>
              <p className="text-slate-300">
                Crie sua conta gratuitamente e tenha controle total das suas
                receitas, despesas e metas.
              </p>

              <div className="grid gap-3 text-sm text-slate-300">
                <div className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Receita, despesa e saldo sempre visiveis
                </div>
                <div className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-cyan-400" />
                  Comparativos e filtros por mes
                </div>
                <div className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-rose-400" />
                  Controle recorrente sem planilhas
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl">
              <div className="mb-8">
                <h2 className="text-2xl font-semibold">Criar conta</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Crie sua conta gratuitamente e comece agora.
                </p>
              </div>

              <form onSubmit={handleCadastro} className="grid gap-4">
                <div className="grid gap-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Nome completo
                  </label>
                  <input
                    type="text"
                    placeholder="Seu nome"
                    className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none transition focus:border-cyan-400"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    E-mail
                  </label>
                  <input
                    type="email"
                    placeholder="voce@exemplo.com"
                    className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none transition focus:border-cyan-400"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Senha
                  </label>
                  <input
                    type="password"
                    placeholder="Crie uma senha"
                    className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none transition focus:border-cyan-400"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Confirmar senha
                  </label>
                  <input
                    type="password"
                    placeholder="Repita a senha"
                    className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none transition focus:border-cyan-400"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <p className="text-xs text-slate-500">
                    Minimo de 6 caracteres.
                  </p>
                </div>

                <button className="rounded-xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950">
                  Criar conta
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-slate-400">
                Ja tem conta?{" "}
                <Link href="/login" className="text-cyan-300 hover:text-cyan-200">
                  Entrar
                </Link>
              </p>
            </div>
          </div>
        </div>
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
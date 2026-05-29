"use client";

import Link from "next/link";
import { useState } from "react";
import { CenterModal } from "@/components/center-modal";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [modalMessage, setModalMessage] = useState<string | null>(null);
  const [modalIntent, setModalIntent] = useState<"error" | "success">("error");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setModalIntent("error");
      setModalMessage("Erro ao logar");
    } else {
      window.location.href = "/dashboard?view=home";
    }
  }

  async function handleForgotPassword() {
    if (!email) {
      setModalIntent("error");
      setModalMessage("Informe o e-mail para recuperar a senha.");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "http://localhost:3000/login",
    });

    if (error) {
      setModalIntent("error");
      setModalMessage("Erro ao enviar o email de recuperacao.");
      return;
    }

    setModalIntent("success");
    setModalMessage("Email de recuperacao enviado.");
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
                Bem-vindo(a) de volta!
              </h1>
              <p className="text-slate-300">
                Acesse sua conta e continue acompanhando sua evolucao financeira.
              </p>

              <div className="grid gap-3 text-sm text-slate-300">
                <div className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Saldo e movimentacoes do mes atual
                </div>
                <div className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-cyan-400" />
                  Comparativo com meses anteriores
                </div>
                <div className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-rose-400" />
                  Receitas e despesas organizadas
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl">
              <div className="mb-8">
                <h2 className="text-2xl font-semibold">Entrar</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Acesse sua conta e continue de onde parou.
                </p>
              </div>

              <form onSubmit={handleLogin} className="grid gap-4">
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
                    placeholder="Sua senha"
                    className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none transition focus:border-cyan-400"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <button className="rounded-xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950">
                  Entrar
                </button>
              </form>

              <div className="mt-6 flex flex-col gap-3 text-center text-sm">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-slate-400 transition hover:text-cyan-200"
                >
                  Esqueci minha senha
                </button>
                <p className="text-slate-400">
                  Ainda nao tem conta?{" "}
                  <Link
                    href="/cadastro"
                    className="text-cyan-300 hover:text-cyan-200"
                  >
                    Criar conta
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <CenterModal
        open={Boolean(modalMessage)}
        title="Erro"
        message={modalMessage || ""}
        intent={modalIntent}
        confirmLabel="Ok"
        onClose={() => setModalMessage(null)}
      />
    </>
  );
}
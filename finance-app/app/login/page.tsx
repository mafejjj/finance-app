"use client";

import { useState } from "react";
import { CenterModal } from "@/components/center-modal";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [modalMessage, setModalMessage] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setModalMessage("Erro ao logar");
    } else {
      window.location.href = "/dashboard";
    }
  }

  return (
    <>
      <main className="flex min-h-screen items-center justify-center text-white">
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            className="p-2 text-black"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Senha"
            className="p-2 text-black"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button className="bg-white text-black p-2">Entrar</button>
        </form>
      </main>

      <CenterModal
        open={Boolean(modalMessage)}
        title="Erro"
        message={modalMessage || ""}
        intent="error"
        confirmLabel="Ok"
        onClose={() => setModalMessage(null)}
      />
    </>
  );
}
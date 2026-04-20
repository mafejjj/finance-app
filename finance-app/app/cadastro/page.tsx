"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Cadastro() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault();

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      alert("Erro ao cadastrar");
    } else {
      alert("Conta criada!");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center text-white">
      <form onSubmit={handleCadastro} className="flex flex-col gap-4">
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

        <button className="bg-white text-black p-2">
          Criar conta
        </button>
      </form>
    </main>
  );
}
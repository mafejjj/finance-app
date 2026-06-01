"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { CenterModal } from "@/components/center-modal";
import { usePreferences } from "@/components/preferences-provider";
import { formatCurrency } from "@/lib/formatters";
import { supabase } from "@/lib/supabase";

type SavingsGoal = {
  id: string;
  name: string;
  target_amount: number | null;
};

type SavingsEntry = {
  id: string;
  goal_id: string;
  month: number;
  year: number;
  saved_amount: number;
  withdrawn_amount: number;
  earned_amount: number;
};

type ModalState = {
  title: string;
  message: string;
  intent?: "info" | "success" | "warning" | "error";
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void | Promise<void>;
};

export default function CofrinhosPage() {
  const { preferences } = usePreferences();
  const hideValues = preferences.hideValues;

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");

  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [entries, setEntries] = useState<SavingsEntry[]>([]);

  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");

  const [modal, setModal] = useState<ModalState | null>(null);

  const refreshGoals = useCallback(async (userIdOverride?: string) => {
    const targetUserId = userIdOverride || userId;

    if (!targetUserId) return;

    const { data } = await supabase
      .from("savings_goals")
      .select("id, name, target_amount")
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: false });

    if (data) setGoals(data as SavingsGoal[]);
  }, [userId]);

  const refreshEntries = useCallback(async (userIdOverride?: string) => {
    const targetUserId = userIdOverride || userId;

    if (!targetUserId) return;

    const { data } = await supabase
      .from("savings_entries")
      .select("id, goal_id, month, year, saved_amount, withdrawn_amount, earned_amount")
      .eq("user_id", targetUserId)
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .order("created_at", { ascending: false });

    if (data) setEntries(data as SavingsEntry[]);
  }, [userId]);

  useEffect(() => {
    async function loadData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      setUserId(user.id);

      await Promise.all([refreshGoals(user.id), refreshEntries(user.id)]);

      setLoading(false);
    }

    loadData();
  }, [refreshEntries, refreshGoals]);

  function openAlert(message: string, intent: ModalState["intent"] = "info") {
    const titleMap: Record<string, string> = {
      info: "Atenção",
      success: "Pronto",
      warning: "Atenção",
      error: "Erro",
    };

    setModal({
      title: titleMap[intent || "info"],
      message,
      intent,
      confirmLabel: "Ok",
    });
  }

  async function handleModalConfirm() {
    if (modal?.onConfirm) {
      await modal.onConfirm();
    }
    setModal(null);
  }

  async function handleCreateGoal(e: React.FormEvent) {
    e.preventDefault();

    if (!goalName.trim()) {
      openAlert("Informe o nome do cofrinho.", "warning");
      return;
    }

    if (!userId) {
      openAlert("Usuário não encontrado.", "error");
      return;
    }

    const targetValue = goalTarget.trim() ? Number(goalTarget) : null;

    const { error } = await supabase.from("savings_goals").insert({
      user_id: userId,
      name: goalName.trim(),
      target_amount: targetValue,
    });

    if (error) {
      openAlert("Erro ao criar cofrinho.", "error");
      return;
    }

    setGoalName("");
    setGoalTarget("");

    await refreshGoals();
  }

  const entriesByGoal = useMemo(() => {
    const grouped: Record<string, SavingsEntry[]> = {};

    entries.forEach((entry) => {
      if (!grouped[entry.goal_id]) grouped[entry.goal_id] = [];
      grouped[entry.goal_id].push(entry);
    });

    return grouped;
  }, [entries]);

  const totalsByGoal = useMemo(() => {
    const totals: Record<
      string,
      { saved: number; withdrawn: number; earned: number; balance: number }
    > = {};

    goals.forEach((goal) => {
      const goalEntries = entriesByGoal[goal.id] || [];
      const saved = goalEntries.reduce((total, item) => total + item.saved_amount, 0);
      const withdrawn = goalEntries.reduce(
        (total, item) => total + item.withdrawn_amount,
        0
      );
      const earned = goalEntries.reduce(
        (total, item) => total + item.earned_amount,
        0
      );
      const balance = saved - withdrawn + earned;

      totals[goal.id] = { saved, withdrawn, earned, balance };
    });

    return totals;
  }, [goals, entriesByGoal]);

  const totalGross = useMemo(() => {
    return Object.values(totalsByGoal).reduce(
      (total, item) => total + item.balance,
      0
    );
  }, [totalsByGoal]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p>Carregando...</p>
      </main>
    );
  }

  return (
    <>
      <AppShell title="Cofrinhos">
        <div className="grid gap-6">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Total bruto das caixinhas</p>
            <h2 className="mt-2 text-3xl font-bold text-emerald-400">
              {formatCurrency(totalGross, hideValues)}
            </h2>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-4 text-xl font-semibold">Novo cofrinho</h2>

            <form onSubmit={handleCreateGoal} className="grid gap-4 md:grid-cols-3">
              <input
                type="text"
                placeholder="Nome do cofrinho"
                className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none"
                value={goalName}
                onChange={(e) => setGoalName(e.target.value)}
              />

              <input
                type="number"
                step="0.01"
                placeholder="Meta (opcional)"
                className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none"
                value={goalTarget}
                onChange={(e) => setGoalTarget(e.target.value)}
              />

              <button
                type="submit"
                className="rounded-xl bg-white px-4 py-3 font-medium text-slate-900"
              >
                Criar cofrinho
              </button>
            </form>
          </section>

          {goals.length === 0 ? (
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <p className="text-slate-400">Nenhum cofrinho criado ainda.</p>
            </section>
          ) : (
            <section className="grid gap-6">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {goals.map((goal) => {
                  const goalTotals = totalsByGoal[goal.id];

                  return (
                    <Link
                      key={goal.id}
                      href={`/cofrinhos/${goal.id}`}
                      className="group flex min-h-[180px] flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900 p-5 text-left transition hover:border-cyan-400/60"
                    >
                      <div>
                        <p className="text-xs uppercase tracking-widest text-slate-400">
                          Cofrinho
                        </p>
                        <h3 className="mt-2 text-lg font-semibold text-white">
                          {goal.name}
                        </h3>
                        <p className="mt-2 text-sm text-slate-400">
                          Meta: {goal.target_amount ? formatCurrency(goal.target_amount, hideValues) : "Nao definida"}
                        </p>
                      </div>

                      <div className="mt-4">
                        <p className="text-xs text-slate-400">Total bruto</p>
                        <p className="text-xl font-semibold text-emerald-400">
                          {formatCurrency(goalTotals?.balance || 0, hideValues)}
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                          Clique para abrir
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </AppShell>

      <CenterModal
        open={Boolean(modal)}
        title={modal?.title || ""}
        message={modal?.message || ""}
        intent={modal?.intent}
        confirmLabel={modal?.confirmLabel}
        cancelLabel={modal?.cancelLabel}
        onConfirm={handleModalConfirm}
        onClose={() => setModal(null)}
      />
    </>
  );
}

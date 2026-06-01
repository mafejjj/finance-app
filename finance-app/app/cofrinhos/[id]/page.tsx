"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
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

export default function CofrinhoDetailPage() {
  const { preferences } = usePreferences();
  const hideValues = preferences.hideValues;

  const params = useParams();
  const goalId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [goal, setGoal] = useState<SavingsGoal | null>(null);
  const [entries, setEntries] = useState<SavingsEntry[]>([]);

  const [monthValue, setMonthValue] = useState(String(new Date().getMonth() + 1));
  const [yearValue, setYearValue] = useState(String(new Date().getFullYear()));
  const [savedValue, setSavedValue] = useState("");
  const [withdrawnValue, setWithdrawnValue] = useState("");
  const [earnedValue, setEarnedValue] = useState("");

  const [modal, setModal] = useState<ModalState | null>(null);

  const refreshGoal = useCallback(async (userIdOverride?: string) => {
    const targetUserId = userIdOverride || userId;

    if (!targetUserId) return;

    const { data } = await supabase
      .from("savings_goals")
      .select("id, name, target_amount")
      .eq("user_id", targetUserId)
      .eq("id", goalId)
      .single();

    if (data) setGoal(data as SavingsGoal);
  }, [goalId, userId]);

  const refreshEntries = useCallback(async (userIdOverride?: string) => {
    const targetUserId = userIdOverride || userId;

    if (!targetUserId) return;

    const { data } = await supabase
      .from("savings_entries")
      .select("id, goal_id, month, year, saved_amount, withdrawn_amount, earned_amount")
      .eq("user_id", targetUserId)
      .eq("goal_id", goalId)
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .order("created_at", { ascending: false });

    if (data) setEntries(data as SavingsEntry[]);
  }, [goalId, userId]);

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

      await Promise.all([refreshGoal(user.id), refreshEntries(user.id)]);

      setLoading(false);
    }

    loadData();
  }, [refreshEntries, refreshGoal]);

  function openAlert(message: string, intent: ModalState["intent"] = "info") {
    const titleMap: Record<string, string> = {
      info: "Atencao",
      success: "Pronto",
      warning: "Atencao",
      error: "Erro",
    };

    setModal({
      title: titleMap[intent || "info"],
      message,
      intent,
      confirmLabel: "Ok",
    });
  }

  function openConfirm(options: {
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void | Promise<void>;
  }) {
    setModal({
      title: options.title,
      message: options.message,
      intent: "warning",
      confirmLabel: options.confirmLabel || "Confirmar",
      cancelLabel: "Cancelar",
      onConfirm: options.onConfirm,
    });
  }

  async function handleModalConfirm() {
    if (modal?.onConfirm) {
      await modal.onConfirm();
    }
    setModal(null);
  }

  async function handleAddEntry() {
    if (!userId || !goalId) {
      openAlert("Usuario nao encontrado.", "error");
      return;
    }

    const month = Number(monthValue);
    const year = Number(yearValue);

    if (!month || !year) {
      openAlert("Informe o mes e o ano.", "warning");
      return;
    }

    const saved = Number(savedValue || 0);
    const withdrawn = Number(withdrawnValue || 0);
    const earned = Number(earnedValue || 0);

    const { error } = await supabase.from("savings_entries").insert({
      user_id: userId,
      goal_id: goalId,
      month,
      year,
      saved_amount: saved,
      withdrawn_amount: withdrawn,
      earned_amount: earned,
    });

    if (error) {
      openAlert("Erro ao adicionar lancamento.", "error");
      return;
    }

    setSavedValue("");
    setWithdrawnValue("");
    setEarnedValue("");

    await refreshEntries();
  }

  async function handleDeleteEntry(entry: SavingsEntry) {
    openConfirm({
      title: "Deletar lancamento",
      message: `Deseja deletar o lancamento de ${entry.month}/${entry.year}?`,
      confirmLabel: "Deletar",
      onConfirm: async () => {
        if (!userId) {
          openAlert("Usuario nao encontrado.", "error");
          return;
        }

        const { error } = await supabase
          .from("savings_entries")
          .delete()
          .eq("id", entry.id)
          .eq("user_id", userId);

        if (error) {
          openAlert("Erro ao deletar lancamento.", "error");
          return;
        }

        await refreshEntries();
      },
    });
  }

  async function handleDeleteGoal() {
    if (!goal) return;

    openConfirm({
      title: "Deletar cofrinho",
      message: `Deseja deletar o cofrinho "${goal.name}"?`,
      confirmLabel: "Deletar",
      onConfirm: async () => {
        if (!userId) {
          openAlert("Usuario nao encontrado.", "error");
          return;
        }

        const { error } = await supabase
          .from("savings_goals")
          .delete()
          .eq("id", goal.id)
          .eq("user_id", userId);

        if (error) {
          openAlert("Erro ao deletar cofrinho.", "error");
          return;
        }

        window.location.href = "/cofrinhos";
      },
    });
  }

  const totals = useMemo(() => {
    const saved = entries.reduce((total, item) => total + item.saved_amount, 0);
    const withdrawn = entries.reduce(
      (total, item) => total + item.withdrawn_amount,
      0
    );
    const earned = entries.reduce((total, item) => total + item.earned_amount, 0);
    const balance = saved - withdrawn + earned;

    return { saved, withdrawn, earned, balance };
  }, [entries]);

  const savedHistory = useMemo(
    () => entries.filter((entry) => entry.saved_amount > 0),
    [entries]
  );

  const withdrawnHistory = useMemo(
    () => entries.filter((entry) => entry.withdrawn_amount > 0),
    [entries]
  );

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p>Carregando...</p>
      </main>
    );
  }

  if (!goal) {
    return (
      <AppShell title="Cofrinhos">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-slate-400">Cofrinho nao encontrado.</p>
          <Link
            href="/cofrinhos"
            className="mt-4 inline-flex text-sm text-cyan-400"
          >
            Voltar para cofrinhos
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <>
      <AppShell title="Cofrinho">
        <div className="grid gap-6">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <Link
              href="/cofrinhos"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-cyan-400/60 hover:text-white"
            >
              Voltar para os cofrinhos
            </Link>
            <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-white">{goal.name}</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Meta: {goal.target_amount ? formatCurrency(goal.target_amount, hideValues) : "Nao definida"}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2">
                  <p className="text-xs text-slate-400">Total bruto</p>
                  <p className="text-sm font-semibold text-emerald-400">
                    {formatCurrency(totals.balance, hideValues)}
                  </p>
                </div>
                <button
                  onClick={handleDeleteGoal}
                  className="rounded-xl border border-rose-500 px-4 py-2 text-sm text-rose-400"
                >
                  Deletar
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h3 className="mb-4 text-lg font-semibold">Novo lancamento do mes</h3>
            <div className="grid gap-4 md:grid-cols-6">
              <input
                type="number"
                placeholder="Mes"
                className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none"
                value={monthValue}
                onChange={(e) => setMonthValue(e.target.value)}
              />
              <input
                type="number"
                placeholder="Ano"
                className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none"
                value={yearValue}
                onChange={(e) => setYearValue(e.target.value)}
              />
              <input
                type="number"
                step="0.01"
                placeholder="Guardou"
                className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none"
                value={savedValue}
                onChange={(e) => setSavedValue(e.target.value)}
              />
              <input
                type="number"
                step="0.01"
                placeholder="Retirou"
                className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none"
                value={withdrawnValue}
                onChange={(e) => setWithdrawnValue(e.target.value)}
              />
              <input
                type="number"
                step="0.01"
                placeholder="Rendeu"
                className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none"
                value={earnedValue}
                onChange={(e) => setEarnedValue(e.target.value)}
              />
              <button
                type="button"
                onClick={handleAddEntry}
                className="rounded-xl bg-cyan-400 px-4 py-3 font-medium text-slate-950"
              >
                Salvar mes
              </button>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h4 className="mb-3 text-sm font-semibold text-slate-200">
                Historico de receita
              </h4>
              {savedHistory.length === 0 ? (
                <p className="text-sm text-slate-400">
                  Nenhum registro de guardou.
                </p>
              ) : (
                <div className="grid gap-2">
                  {savedHistory.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-4 py-2"
                    >
                      <div>
                        <p className="text-sm text-white">
                          {entry.month}/{entry.year}
                        </p>
                        <p className="text-xs text-slate-400">
                          Guardou: {formatCurrency(entry.saved_amount, hideValues)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteEntry(entry)}
                        className="rounded-lg border border-rose-500 px-3 py-1 text-xs text-rose-400"
                      >
                        Deletar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h4 className="mb-3 text-sm font-semibold text-slate-200">
                Historico de resgate
              </h4>
              {withdrawnHistory.length === 0 ? (
                <p className="text-sm text-slate-400">
                  Nenhum registro de resgate.
                </p>
              ) : (
                <div className="grid gap-2">
                  {withdrawnHistory.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-4 py-2"
                    >
                      <div>
                        <p className="text-sm text-white">
                          {entry.month}/{entry.year}
                        </p>
                        <p className="text-xs text-slate-400">
                          Retirou: {formatCurrency(entry.withdrawn_amount, hideValues)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteEntry(entry)}
                        className="rounded-lg border border-rose-500 px-3 py-1 text-xs text-rose-400"
                      >
                        Deletar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
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

"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { AppShell } from "@/components/app-shell";
import { Expense, Income, Month } from "@/types";
import { EXPENSE_CATEGORIES } from "@/lib/constants";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");

  const [months, setMonths] = useState<Month[]>([]);
  const [selectedMonthId, setSelectedMonthId] = useState("");

  const [monthName, setMonthName] = useState("");
  const [monthNumber, setMonthNumber] = useState("");
  const [year, setYear] = useState("");

  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const [incomeDescription, setIncomeDescription] = useState("");
  const [incomeAmount, setIncomeAmount] = useState("");

  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("Moradia");
  const [categoryFilter, setCategoryFilter] = useState("");

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

      const { data: monthsData, error: monthsError } = await supabase
        .from("months")
        .select("*")
        .order("year", { ascending: false })
        .order("month", { ascending: false });

      if (!monthsError && monthsData) {
        setMonths(monthsData);

        if (monthsData.length > 0) {
          setSelectedMonthId(monthsData[0].id);
        }
      }

      setLoading(false);
    }

    loadData();
  }, []);

  useEffect(() => {
    if (!selectedMonthId) return;

    refreshEntries(selectedMonthId);
  }, [selectedMonthId]);

  async function refreshMonths() {
    const { data, error } = await supabase
      .from("months")
      .select("*")
      .order("year", { ascending: false })
      .order("month", { ascending: false });

    if (!error && data) {
      setMonths(data);

      if (!selectedMonthId && data.length > 0) {
        setSelectedMonthId(data[0].id);
      }
    }
  }

  async function refreshEntries(monthId: string) {
    const { data: incomesData, error: incomesError } = await supabase
      .from("incomes")
      .select("*")
      .eq("month_id", monthId)
      .order("created_at", { ascending: false });

    const { data: expensesData, error: expensesError } = await supabase
      .from("expenses")
      .select("*")
      .eq("month_id", monthId)
      .order("created_at", { ascending: false });

    if (!incomesError && incomesData) {
      setIncomes(incomesData);
    }

    if (!expensesError && expensesData) {
      setExpenses(expensesData);
    }
  }

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

  async function handleDeleteMonth(id: string) {
    const { error } = await supabase.from("months").delete().eq("id", id);

    if (error) {
      alert("Erro ao deletar mês.");
      return;
    }

    if (selectedMonthId === id) {
      setSelectedMonthId("");
      setIncomes([]);
      setExpenses([]);
    }

    await refreshMonths();
  }

  async function handleCreateIncome(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedMonthId) {
      alert("Selecione um mês.");
      return;
    }

    if (!incomeDescription || !incomeAmount) {
      alert("Preencha descrição e valor da receita.");
      return;
    }

    const { error } = await supabase.from("incomes").insert({
      user_id: userId,
      month_id: selectedMonthId,
      description: incomeDescription,
      amount: Number(incomeAmount),
    });

    if (error) {
      alert("Erro ao adicionar receita.");
      return;
    }

    setIncomeDescription("");
    setIncomeAmount("");

    await refreshEntries(selectedMonthId);
  }

  async function handleCreateExpense(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedMonthId) {
      alert("Selecione um mês.");
      return;
    }

    if (!expenseDescription || !expenseAmount || !expenseCategory) {
      alert("Preencha descrição, valor e categoria da despesa.");
      return;
    }

    const { error } = await supabase.from("expenses").insert({
      user_id: userId,
      month_id: selectedMonthId,
      description: expenseDescription,
      amount: Number(expenseAmount),
      category: expenseCategory,
    });

    if (error) {
      alert("Erro ao adicionar despesa.");
      return;
    }

    setExpenseDescription("");
    setExpenseAmount("");
    setExpenseCategory("Moradia");

    await refreshEntries(selectedMonthId);
  }

  async function handleDeleteIncome(id: string) {
    const { error } = await supabase.from("incomes").delete().eq("id", id);

    if (error) {
      alert("Erro ao deletar receita.");
      return;
    }

    await refreshEntries(selectedMonthId);
  }

  async function handleDeleteExpense(id: string) {
    const { error } = await supabase.from("expenses").delete().eq("id", id);

    if (error) {
      alert("Erro ao deletar despesa.");
      return;
    }

    await refreshEntries(selectedMonthId);
  }

  const filteredExpenses = useMemo(() => {
    if (!categoryFilter) return expenses;
    return expenses.filter((item) => item.category === categoryFilter);
  }, [expenses, categoryFilter]);

  const totalIncomes = useMemo(() => {
    return incomes.reduce((total, item) => total + Number(item.amount), 0);
  }, [incomes]);

  const totalExpenses = useMemo(() => {
    return expenses.reduce((total, item) => total + Number(item.amount), 0);
  }, [expenses]);

  const balance = totalIncomes - totalExpenses;

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
          <h2 className="mb-4 text-xl font-semibold">Selecionar mês</h2>

          <select
            className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none"
            value={selectedMonthId}
            onChange={(e) => setSelectedMonthId(e.target.value)}
          >
            <option value="">Selecione um mês</option>

            {months.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Receitas</p>
            <h3 className="mt-2 text-2xl font-bold">R$ {totalIncomes.toFixed(2)}</h3>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Despesas</p>
            <h3 className="mt-2 text-2xl font-bold">R$ {totalExpenses.toFixed(2)}</h3>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Saldo</p>
            <h3 className="mt-2 text-2xl font-bold">R$ {balance.toFixed(2)}</h3>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-4 text-xl font-semibold">Nova receita</h2>

            <form onSubmit={handleCreateIncome} className="grid gap-4">
              <input
                type="text"
                placeholder="Descrição"
                className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none"
                value={incomeDescription}
                onChange={(e) => setIncomeDescription(e.target.value)}
              />

              <input
                type="number"
                step="0.01"
                placeholder="Valor"
                className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none"
                value={incomeAmount}
                onChange={(e) => setIncomeAmount(e.target.value)}
              />

              <button
                type="submit"
                className="rounded-xl bg-white px-4 py-3 font-medium text-slate-900"
              >
                Adicionar receita
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-4 text-xl font-semibold">Nova despesa</h2>

            <form onSubmit={handleCreateExpense} className="grid gap-4">
              <input
                type="text"
                placeholder="Descrição"
                className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none"
                value={expenseDescription}
                onChange={(e) => setExpenseDescription(e.target.value)}
              />

              <input
                type="number"
                step="0.01"
                placeholder="Valor"
                className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
              />

              <select
                className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none"
                value={expenseCategory}
                onChange={(e) => setExpenseCategory(e.target.value)}
              >
                {EXPENSE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <button
                type="submit"
                className="rounded-xl bg-white px-4 py-3 font-medium text-slate-900"
              >
                Adicionar despesa
              </button>
            </form>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <h2 className="text-xl font-semibold">Despesas cadastradas</h2>

            <select
              className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">Todas as categorias</option>

              {EXPENSE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {filteredExpenses.length === 0 ? (
            <p className="text-slate-400">Nenhuma despesa encontrada.</p>
          ) : (
            <div className="grid gap-3">
              {filteredExpenses.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-4"
                >
                  <div>
                    <p className="font-medium text-white">{item.description}</p>
                    <p className="text-sm text-slate-400">
                      {item.category} • R$ {Number(item.amount).toFixed(2)}
                    </p>
                  </div>

                  <button
                    onClick={() => handleDeleteExpense(item.id)}
                    className="rounded-lg border border-red-500 px-3 py-2 text-sm text-red-400"
                  >
                    Deletar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-xl font-semibold">Receitas cadastradas</h2>

          {incomes.length === 0 ? (
            <p className="text-slate-400">Nenhuma receita encontrada.</p>
          ) : (
            <div className="grid gap-3">
              {incomes.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-4"
                >
                  <div>
                    <p className="font-medium text-white">{item.description}</p>
                    <p className="text-sm text-slate-400">
                      R$ {Number(item.amount).toFixed(2)}
                    </p>
                  </div>

                  <button
                    onClick={() => handleDeleteIncome(item.id)}
                    className="rounded-lg border border-red-500 px-3 py-2 text-sm text-red-400"
                  >
                    Deletar
                  </button>
                </div>
              ))}
            </div>
          )}
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
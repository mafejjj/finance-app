"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/lib/supabase";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/constants";
import { Expense, Income, Month, RecurringEntry } from "@/types";
import {
  BarChart,
  Bar,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Legend,
} from "recharts";

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
};

export default function Dashboard() {
  const searchParams = useSearchParams();
  const currentView = searchParams.get("view") || "dashboard";

  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);

  const [months, setMonths] = useState<Month[]>([]);
  const [selectedMonthId, setSelectedMonthId] = useState("");

  const [monthName, setMonthName] = useState("");
  const [monthNumber, setMonthNumber] = useState("");
  const [year, setYear] = useState("");

  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const [incomeDescription, setIncomeDescription] = useState("");
  const [incomeAmount, setIncomeAmount] = useState("");
  const [incomeCategory, setIncomeCategory] = useState("Salário");

  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("Moradia");

  const [recurringEntries, setRecurringEntries] = useState<RecurringEntry[]>([]);
  const [recurringDescription, setRecurringDescription] = useState("");
  const [recurringAmount, setRecurringAmount] = useState("");
  const [recurringCategory, setRecurringCategory] = useState("Moradia");

  const [monthsYearFilter, setMonthsYearFilter] = useState("");

  const chartColors = [
    "#38bdf8",
    "#f43f5e",
    "#34d399",
    "#f59e0b",
    "#a78bfa",
    "#fb7185",
    "#94a3b8",
  ];

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

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      const { data: monthsData } = await supabase
        .from("months")
        .select("*")
        .order("year", { ascending: false })
        .order("month", { ascending: false });

      if (monthsData) {
        setMonths(monthsData);

        if (monthsData.length > 0) {
          setSelectedMonthId(monthsData[0].id);
        }
      }

      const { data: recurringData } = await supabase
        .from("recurring_entries")
        .select("*")
        .order("created_at", { ascending: false });

      if (recurringData) {
        setRecurringEntries(recurringData);
      }

      setLoading(false);
    }

    loadData();
  }, []);

  useEffect(() => {
    if (!selectedMonthId) {
      setIncomes([]);
      setExpenses([]);
      return;
    }

    refreshEntries(selectedMonthId);
  }, [selectedMonthId]);

  async function refreshEntries(monthId: string) {
    const { data: incomesData } = await supabase
      .from("incomes")
      .select("*")
      .eq("month_id", monthId)
      .order("created_at", { ascending: false });

    const { data: expensesData } = await supabase
      .from("expenses")
      .select("*")
      .eq("month_id", monthId)
      .order("created_at", { ascending: false });

    if (incomesData) setIncomes(incomesData);
    if (expensesData) setExpenses(expensesData);
  }

  async function refreshMonths() {
    const { data } = await supabase
      .from("months")
      .select("*")
      .order("year", { ascending: false })
      .order("month", { ascending: false });

    if (data) {
      setMonths(data);

      if (data.length === 0) {
        setSelectedMonthId("");
        setIncomes([]);
        setExpenses([]);
        return;
      }

      const stillExists = data.some((item) => item.id === selectedMonthId);

      if (!stillExists) {
        setSelectedMonthId(data[0].id);
      }
    }
  }

  async function refreshRecurringEntries() {
    const { data } = await supabase
      .from("recurring_entries")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) setRecurringEntries(data);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  async function handleResetPassword() {
    if (!email) return;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "http://localhost:3000/login",
    });

    if (error) {
      alert("Erro ao enviar email de redefinição.");
      return;
    }

    alert("Email de redefinição enviado.");
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
      category: incomeCategory,
    });

    if (error) {
      alert("Erro ao adicionar receita.");
      return;
    }

    setIncomeDescription("");
    setIncomeAmount("");
    setIncomeCategory("Salário");

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

  async function handleDeleteExpense(id: string) {
    const { error } = await supabase.from("expenses").delete().eq("id", id);

    if (error) {
      alert("Erro ao deletar despesa.");
      return;
    }

    await refreshEntries(selectedMonthId);
  }

  async function handleCreateRecurringIncome(e: React.FormEvent) {
    e.preventDefault();

    if (!recurringDescription || !recurringAmount) {
      alert("Preencha descrição e valor.");
      return;
    }

    const { error } = await supabase.from("recurring_entries").insert({
      user_id: userId,
      description: recurringDescription,
      amount: Number(recurringAmount),
      type: "income",
      category: recurringCategory,
    });

    if (error) {
      alert("Erro ao adicionar receita recorrente.");
      return;
    }

    setRecurringDescription("");
    setRecurringAmount("");
    setRecurringCategory("Salário");

    await refreshRecurringEntries();
  }

  async function handleCreateRecurringExpense(e: React.FormEvent) {
    e.preventDefault();

    if (!recurringDescription || !recurringAmount) {
      alert("Preencha descrição e valor.");
      return;
    }

    const { error } = await supabase.from("recurring_entries").insert({
      user_id: userId,
      description: recurringDescription,
      amount: Number(recurringAmount),
      type: "expense",
      category: recurringCategory,
    });

    if (error) {
      alert("Erro ao adicionar despesa recorrente.");
      return;
    }

    setRecurringDescription("");
    setRecurringAmount("");
    setRecurringCategory("Moradia");

    await refreshRecurringEntries();
  }

  async function handleDeleteRecurringEntry(id: string) {
    const { error } = await supabase
      .from("recurring_entries")
      .delete()
      .eq("id", id);

    if (error) {
      alert("Erro ao deletar recorrente.");
      return;
    }

    await refreshRecurringEntries();
  }

  async function handleApplyRecurringToMonth(entry: RecurringEntry) {
    if (!selectedMonthId) {
      alert("Selecione um mês para adicionar o recorrente.");
      return;
    }

    if (entry.type === "income") {
      const { error } = await supabase.from("incomes").insert({
        user_id: userId,
        month_id: selectedMonthId,
        description: entry.description,
        amount: Number(entry.amount),
        category: entry.category || "Outros",
      });

      if (error) {
        alert("Erro ao adicionar receita recorrente ao mês.");
        return;
      }
    } else {
      const { error } = await supabase.from("expenses").insert({
        user_id: userId,
        month_id: selectedMonthId,
        description: entry.description,
        amount: Number(entry.amount),
        category: entry.category || "Outros",
      });

      if (error) {
        alert("Erro ao adicionar despesa recorrente ao mês.");
        return;
      }
    }

    await refreshEntries(selectedMonthId);
  }

  const recurringIncomes = useMemo(
    () => recurringEntries.filter((item) => item.type === "income"),
    [recurringEntries]
  );

  const recurringExpenses = useMemo(
    () => recurringEntries.filter((item) => item.type === "expense"),
    [recurringEntries]
  );

  const totalIncomes = useMemo(
    () => incomes.reduce((total, item) => total + Number(item.amount), 0),
    [incomes]
  );

  const totalExpenses = useMemo(
    () => expenses.reduce((total, item) => total + Number(item.amount), 0),
    [expenses]
  );

  const balance = totalIncomes - totalExpenses;

  const categoryChartData = useMemo(() => {
    const grouped: Record<string, number> = {};

    expenses.forEach((item) => {
      grouped[item.category] = (grouped[item.category] || 0) + Number(item.amount);
    });

    return Object.entries(grouped).map(([name, value]) => ({
      name,
      value,
    }));
  }, [expenses]);

  const years = useMemo(() => {
    const uniqueYears = [...new Set(months.map((item) => item.year))];
    return uniqueYears.sort((a, b) => b - a);
  }, [months]);

  const filteredMonths = useMemo(() => {
    if (!monthsYearFilter) return months;
    return months.filter((item) => String(item.year) === monthsYearFilter);
  }, [months, monthsYearFilter]);

  const monthlyComparisonData = useMemo(() => {
    return months
      .slice(0, 6)
      .map((month) => ({
        name: month.name,
        receitas: month.id === selectedMonthId ? totalIncomes : 0,
        despesas: month.id === selectedMonthId ? totalExpenses : 0,
      }))
      .reverse();
  }, [months, selectedMonthId, totalIncomes, totalExpenses]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p>Carregando...</p>
      </main>
    );
  }

  function renderDashboardHome() {
    return (
      <div className="grid gap-6">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
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
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Receitas do mês</p>
            <h3 className="mt-2 text-2xl font-bold text-emerald-400">
              R$ {totalIncomes.toFixed(2)}
            </h3>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Despesas do mês</p>
            <h3 className="mt-2 text-2xl font-bold text-rose-400">
              R$ {totalExpenses.toFixed(2)}
            </h3>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Saldo do mês</p>
            <h3
              className={`mt-2 text-2xl font-bold ${
                balance >= 0 ? "text-cyan-400" : "text-rose-400"
              }`}
            >
              R$ {balance.toFixed(2)}
            </h3>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-4 text-xl font-semibold">Despesas por categoria</h2>

            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={100}
                    label
                  >
                    {categoryChartData.map((_, index) => (
                      <Cell
                        key={index}
                        fill={chartColors[index % chartColors.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-4 text-xl font-semibold">Comparativo dos meses</h2>

            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#cbd5e1" />
                  <YAxis stroke="#cbd5e1" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="receitas" fill="#34d399" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="despesas" fill="#f43f5e" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-4 text-xl font-semibold">Adicionar receita</h2>

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

              <select
                className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none"
                value={incomeCategory}
                onChange={(e) => setIncomeCategory(e.target.value)}
              >
                {INCOME_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <button
                type="submit"
                className="rounded-xl bg-emerald-400 px-4 py-3 font-medium text-slate-950"
              >
                Adicionar receita
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-4 text-xl font-semibold">Adicionar despesa</h2>

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
                className="rounded-xl bg-rose-400 px-4 py-3 font-medium text-slate-950"
              >
                Adicionar despesa
              </button>
            </form>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-4 text-xl font-semibold">Receitas recorrentes</h2>

            {recurringIncomes.length === 0 ? (
              <p className="text-slate-400">Nenhuma receita recorrente cadastrada.</p>
            ) : (
              <div className="grid gap-3">
                {recurringIncomes.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="font-medium text-white">{item.description}</p>
                      <p className="text-sm text-slate-400">
                        R$ {Number(item.amount).toFixed(2)} • {item.category || "Outros"}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApplyRecurringToMonth(item)}
                        className="rounded-lg bg-cyan-400 px-3 py-2 text-sm font-medium text-slate-950"
                      >
                        Adicionar ao mês
                      </button>

                      <button
                        onClick={() => handleDeleteRecurringEntry(item.id)}
                        className="rounded-lg border border-rose-500 px-3 py-2 text-sm text-rose-400"
                      >
                        Deletar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-4 text-xl font-semibold">Despesas recorrentes</h2>

            {recurringExpenses.length === 0 ? (
              <p className="text-slate-400">Nenhuma despesa recorrente cadastrada.</p>
            ) : (
              <div className="grid gap-3">
                {recurringExpenses.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="font-medium text-white">{item.description}</p>
                      <p className="text-sm text-slate-400">
                        R$ {Number(item.amount).toFixed(2)} • {item.category || "Outros"}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApplyRecurringToMonth(item)}
                        className="rounded-lg bg-cyan-400 px-3 py-2 text-sm font-medium text-slate-950"
                      >
                        Adicionar ao mês
                      </button>

                      <button
                        onClick={() => handleDeleteRecurringEntry(item.id)}
                        className="rounded-lg border border-rose-500 px-3 py-2 text-sm text-rose-400"
                      >
                        Deletar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-4 text-xl font-semibold">Receitas do mês</h2>

            {incomes.length === 0 ? (
              <p className="text-slate-400">Nenhuma receita encontrada para este mês.</p>
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
                        {item.category ? `${item.category} • ` : ""}
                        R$ {Number(item.amount).toFixed(2)}
                      </p>
                    </div>

                    <button
                      onClick={() => handleDeleteIncome(item.id)}
                      className="rounded-lg border border-rose-500 px-3 py-2 text-sm text-rose-400"
                    >
                      Deletar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-4 text-xl font-semibold">Despesas do mês</h2>

            {expenses.length === 0 ? (
              <p className="text-slate-400">Nenhuma despesa encontrada para este mês.</p>
            ) : (
              <div className="grid gap-3">
                {expenses.map((item) => (
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
                      className="rounded-lg border border-rose-500 px-3 py-2 text-sm text-rose-400"
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
    );
  }

  function renderAccountView() {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="mb-6 text-xl font-semibold">Minha conta</h2>

        <div className="grid gap-4">
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-sm text-slate-400">Email cadastrado</p>
            <p className="mt-1 text-white">{email}</p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-sm text-slate-400">Nome completo</p>
            <p className="mt-1 text-white">
              {profile?.full_name || "Não informado"}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-sm text-slate-400">Senha</p>
            <p className="mt-1 text-white">Não pode ser exibida por segurança</p>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={handleResetPassword}
              className="rounded-xl bg-white px-4 py-3 font-medium text-slate-900"
            >
              Resetar senha
            </button>

            <button
              onClick={handleLogout}
              className="rounded-xl border border-rose-500 px-4 py-3 font-medium text-rose-400"
            >
              Sair
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderCreateMonthView() {
    return (
      <div className="grid gap-6">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
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
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Receitas do novo mês</p>
            <h3 className="mt-2 text-2xl font-bold text-emerald-400">
              R$ 0,00
            </h3>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Despesas do novo mês</p>
            <h3 className="mt-2 text-2xl font-bold text-rose-400">
              R$ 0,00
            </h3>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Saldo do novo mês</p>
            <h3 className="mt-2 text-2xl font-bold text-cyan-400">
              R$ 0,00
            </h3>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
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

              <select
                className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none"
                value={incomeCategory}
                onChange={(e) => setIncomeCategory(e.target.value)}
              >
                {INCOME_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <button
                type="submit"
                className="rounded-xl bg-emerald-400 px-4 py-3 font-medium text-slate-950"
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
                className="rounded-xl bg-rose-400 px-4 py-3 font-medium text-slate-950"
              >
                Adicionar despesa
              </button>
            </form>
          </div>
        </section>
      </div>
    );
  }

  function renderRecurringIncomesView() {
    return (
      <div className="grid gap-6">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-xl font-semibold">Nova receita recorrente</h2>

          <form onSubmit={handleCreateRecurringIncome} className="grid gap-4 md:grid-cols-4">
            <input
              type="text"
              placeholder="Nome"
              className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none"
              value={recurringDescription}
              onChange={(e) => setRecurringDescription(e.target.value)}
            />

            <input
              type="number"
              step="0.01"
              placeholder="Valor"
              className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none"
              value={recurringAmount}
              onChange={(e) => setRecurringAmount(e.target.value)}
            />

            <select
              className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none"
              value={recurringCategory}
              onChange={(e) => setRecurringCategory(e.target.value)}
            >
              {INCOME_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="rounded-xl bg-cyan-400 px-4 py-3 font-medium text-slate-950"
            >
              Adicionar
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-xl font-semibold">Receitas recorrentes cadastradas</h2>

          <div className="grid gap-3">
            {recurringIncomes.length === 0 ? (
              <p className="text-slate-400">Nenhuma receita recorrente encontrada.</p>
            ) : (
              recurringIncomes.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-medium text-white">{item.description}</p>
                    <p className="text-sm text-slate-400">
                      R$ {Number(item.amount).toFixed(2)} • {item.category || "Outros"}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApplyRecurringToMonth(item)}
                      className="rounded-lg bg-cyan-400 px-3 py-2 text-sm font-medium text-slate-950"
                    >
                      Adicionar ao mês
                    </button>

                    <button
                      onClick={() => handleDeleteRecurringEntry(item.id)}
                      className="rounded-lg border border-rose-500 px-3 py-2 text-sm text-rose-400"
                    >
                      Deletar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    );
  }

  function renderRecurringExpensesView() {
    return (
      <div className="grid gap-6">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-xl font-semibold">Nova despesa recorrente</h2>

          <form onSubmit={handleCreateRecurringExpense} className="grid gap-4 md:grid-cols-4">
            <input
              type="text"
              placeholder="Nome"
              className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none"
              value={recurringDescription}
              onChange={(e) => setRecurringDescription(e.target.value)}
            />

            <input
              type="number"
              step="0.01"
              placeholder="Valor"
              className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none"
              value={recurringAmount}
              onChange={(e) => setRecurringAmount(e.target.value)}
            />

            <select
              className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none"
              value={recurringCategory}
              onChange={(e) => setRecurringCategory(e.target.value)}
            >
              {EXPENSE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="rounded-xl bg-cyan-400 px-4 py-3 font-medium text-slate-950"
            >
              Adicionar
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-xl font-semibold">Despesas recorrentes cadastradas</h2>

          <div className="grid gap-3">
            {recurringExpenses.length === 0 ? (
              <p className="text-slate-400">Nenhuma despesa recorrente encontrada.</p>
            ) : (
              recurringExpenses.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-medium text-white">{item.description}</p>
                    <p className="text-sm text-slate-400">
                      R$ {Number(item.amount).toFixed(2)} • {item.category || "Outros"}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApplyRecurringToMonth(item)}
                      className="rounded-lg bg-cyan-400 px-3 py-2 text-sm font-medium text-slate-950"
                    >
                      Adicionar ao mês
                    </button>

                    <button
                      onClick={() => handleDeleteRecurringEntry(item.id)}
                      className="rounded-lg border border-rose-500 px-3 py-2 text-sm text-rose-400"
                    >
                      Deletar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    );
  }

  function renderMonthsView() {
    return (
      <div className="grid gap-6">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <h2 className="text-xl font-semibold">Meses cadastrados</h2>

            <select
              className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none"
              value={monthsYearFilter}
              onChange={(e) => setMonthsYearFilter(e.target.value)}
            >
              <option value="">Todos os anos</option>
              {years.map((yearItem) => (
                <option key={yearItem} value={yearItem}>
                  {yearItem}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          {filteredMonths.length === 0 ? (
            <p className="text-slate-400">Nenhum mês encontrado.</p>
          ) : (
            <div className="grid gap-6">
              {years
                .filter((yearItem) =>
                  monthsYearFilter ? String(yearItem) === monthsYearFilter : true
                )
                .map((yearItem) => {
                  const monthsByYear = filteredMonths.filter(
                    (item) => item.year === yearItem
                  );

                  return (
                    <div key={yearItem}>
                      <h3 className="mb-3 text-lg font-semibold text-cyan-400">
                        {yearItem}
                      </h3>

                      <div className="grid gap-3">
                        {monthsByYear.map((item) => (
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
                              className="rounded-lg border border-rose-500 px-3 py-2 text-sm text-rose-400"
                            >
                              Deletar
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </section>
      </div>
    );
  }

  return (
    <AppShell title="Dashboard">
      {currentView === "account" && renderAccountView()}
      {currentView === "create-month" && renderCreateMonthView()}
      {currentView === "dashboard" && renderDashboardHome()}
      {currentView === "recurring-incomes" && renderRecurringIncomesView()}
      {currentView === "recurring-expenses" && renderRecurringExpensesView()}
      {currentView === "months" && renderMonthsView()}
    </AppShell>
  );
}
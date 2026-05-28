"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CenterModal } from "@/components/center-modal";
import { supabase } from "@/lib/supabase";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/constants";
import { CategoryType, Expense, Income, Month, RecurringEntry } from "@/types";
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

type CategoryRow = {
  id: string;
  name: string;
  type: CategoryType;
};

type ModalState = {
  title: string;
  message: string;
  intent?: "info" | "success" | "warning" | "error";
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void | Promise<void>;
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

  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [categoryName, setCategoryName] = useState("");
  const [categoryType, setCategoryType] = useState<CategoryType>("income");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [fixedIncomeCategories, setFixedIncomeCategories] = useState(
    INCOME_CATEGORIES
  );
  const [fixedExpenseCategories, setFixedExpenseCategories] = useState(
    EXPENSE_CATEGORIES
  );
  const [removedFixedIncomeCategories, setRemovedFixedIncomeCategories] = useState<
    string[]
  >([]);
  const [removedFixedExpenseCategories, setRemovedFixedExpenseCategories] = useState<
    string[]
  >([]);
  const [modal, setModal] = useState<ModalState | null>(null);

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

      const { data: categoriesData } = await supabase
        .from("categories")
        .select("id, name, type")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (categoriesData) {
        setCategories(categoriesData as CategoryRow[]);
      }

      await refreshCategoryOverrides(user.id);

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

  async function refreshCategories() {
    if (!userId) return;

    const { data } = await supabase
      .from("categories")
      .select("id, name, type")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (data) setCategories(data as CategoryRow[]);
  }

  function applyFixedExpenseOverrides(removed: string[]) {
    setRemovedFixedExpenseCategories(removed);

    const filtered = EXPENSE_CATEGORIES.filter(
      (category) => !removed.includes(category)
    );

    setFixedExpenseCategories(filtered);

    if (!filtered.includes(expenseCategory)) {
      setExpenseCategory(filtered[0] || "Outros");
    }

    if (!filtered.includes(recurringCategory)) {
      setRecurringCategory(filtered[0] || "Outros");
    }
  }

  function applyFixedIncomeOverrides(removed: string[]) {
    setRemovedFixedIncomeCategories(removed);

    const filtered = INCOME_CATEGORIES.filter(
      (category) => !removed.includes(category)
    );

    setFixedIncomeCategories(filtered);

    if (!filtered.includes(incomeCategory)) {
      setIncomeCategory(filtered[0] || "Outros");
    }
  }

  async function refreshCategoryOverrides(userIdOverride?: string) {
    const targetUserId = userIdOverride || userId;

    if (!targetUserId) return;

    const { data } = await supabase
      .from("category_overrides")
      .select("name, type")
      .eq("user_id", targetUserId)
      .eq("action", "remove")
      .order("created_at", { ascending: false });

    if (!data) return;

    const removedExpense = data
      .filter((item) => item.type === "expense")
      .map((item) => item.name)
      .filter(Boolean);

    const removedIncome = data
      .filter((item) => item.type === "income")
      .map((item) => item.name)
      .filter(Boolean);

    applyFixedExpenseOverrides(removedExpense);
    applyFixedIncomeOverrides(removedIncome);
  }

  function openModal(state: ModalState) {
    setModal(state);
  }

  function openAlert(message: string, intent: ModalState["intent"] = "info") {
    const titleMap: Record<string, string> = {
      info: "Atenção",
      success: "Pronto",
      warning: "Atenção",
      error: "Erro",
    };

    openModal({
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
    openModal({
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
      openAlert("Erro ao enviar email de redefinição.", "error");
      return;
    }

    openAlert("Email de redefinição enviado.", "success");
  }

  async function handleCreateMonth(e: React.FormEvent) {
    e.preventDefault();

    if (!monthName || !monthNumber || !year) {
      openAlert("Preencha nome, mês e ano.", "warning");
      return;
    }

    const { error } = await supabase.from("months").insert({
      user_id: userId,
      name: monthName,
      month: Number(monthNumber),
      year: Number(year),
    });

    if (error) {
      openAlert("Erro ao criar mês.", "error");
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
      openAlert("Erro ao deletar mês.", "error");
      return;
    }

    await refreshMonths();
  }

  async function handleCreateIncome(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedMonthId) {
      openAlert("Selecione um mês.", "warning");
      return;
    }

    if (!incomeDescription || !incomeAmount) {
      openAlert("Preencha descrição e valor da receita.", "warning");
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
      openAlert("Erro ao adicionar receita.", "error");
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
      openAlert("Erro ao deletar receita.", "error");
      return;
    }

    await refreshEntries(selectedMonthId);
  }

  async function handleCreateExpense(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedMonthId) {
      openAlert("Selecione um mês.", "warning");
      return;
    }

    if (!expenseDescription || !expenseAmount || !expenseCategory) {
      openAlert("Preencha descrição, valor e categoria da despesa.", "warning");
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
      openAlert("Erro ao adicionar despesa.", "error");
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
      openAlert("Erro ao deletar despesa.", "error");
      return;
    }

    await refreshEntries(selectedMonthId);
  }

  async function handleCreateRecurringIncome(e: React.FormEvent) {
    e.preventDefault();

    if (!recurringDescription || !recurringAmount) {
      openAlert("Preencha descrição e valor.", "warning");
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
      openAlert("Erro ao adicionar receita recorrente.", "error");
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
      openAlert("Preencha descrição e valor.", "warning");
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
      openAlert("Erro ao adicionar despesa recorrente.", "error");
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
      openAlert("Erro ao deletar recorrente.", "error");
      return;
    }

    await refreshRecurringEntries();
  }

  async function handleApplyRecurringToMonth(entry: RecurringEntry) {
    if (!selectedMonthId) {
      openAlert("Selecione um mês para adicionar o recorrente.", "warning");
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
        openAlert("Erro ao adicionar receita recorrente ao mês.", "error");
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
        openAlert("Erro ao adicionar despesa recorrente ao mês.", "error");
        return;
      }
    }

    await refreshEntries(selectedMonthId);
  }

  async function handleSaveCategory(e: React.FormEvent) {
    e.preventDefault();

    const trimmedName = categoryName.trim();

    if (!trimmedName) {
      openAlert("Informe o nome da categoria.", "warning");
      return;
    }

    if (!userId) {
      openAlert("Usuário não encontrado.", "error");
      return;
    }

    if (editingCategoryId) {
      const { error } = await supabase
        .from("categories")
        .update({ name: trimmedName, type: categoryType })
        .eq("id", editingCategoryId)
        .eq("user_id", userId);

      if (error) {
        openAlert("Erro ao atualizar categoria.", "error");
        return;
      }
    } else {
      const { error } = await supabase.from("categories").insert({
        user_id: userId,
        name: trimmedName,
        type: categoryType,
      });

      if (error) {
        openAlert("Erro ao adicionar categoria.", "error");
        return;
      }
    }

    setCategoryName("");
    setCategoryType("income");
    setEditingCategoryId(null);

    await refreshCategories();
  }

  function handleEditCategory(category: CategoryRow) {
    setCategoryName(category.name);
    setCategoryType(category.type);
    setEditingCategoryId(category.id);
  }

  function handleDeleteCategory(categoryId: string) {
    openConfirm({
      title: "Deletar categoria",
      message: "Deseja deletar esta categoria?",
      confirmLabel: "Deletar",
      onConfirm: async () => {
        if (!userId) {
          openAlert("Usuário não encontrado.", "error");
          return;
        }

        const { error } = await supabase
          .from("categories")
          .delete()
          .eq("id", categoryId)
          .eq("user_id", userId);

        if (error) {
          openAlert("Erro ao deletar categoria.", "error");
          return;
        }

        await refreshCategories();
      },
    });
  }

  async function removeFixedExpenseCategory(name: string) {
    if (!userId) {
      openAlert("Usuário não encontrado.", "error");
      return;
    }

    if (removedFixedExpenseCategories.includes(name)) return;

    const { error } = await supabase.from("category_overrides").insert({
      user_id: userId,
      name,
      type: "expense",
      action: "remove",
    });

    if (error) {
      openAlert("Erro ao remover categoria fixa.", "error");
      return;
    }

    await refreshCategoryOverrides();
  }

  async function removeFixedIncomeCategory(name: string) {
    if (!userId) {
      openAlert("Usuário não encontrado.", "error");
      return;
    }

    if (removedFixedIncomeCategories.includes(name)) return;

    const { error } = await supabase.from("category_overrides").insert({
      user_id: userId,
      name,
      type: "income",
      action: "remove",
    });

    if (error) {
      openAlert("Erro ao remover categoria fixa.", "error");
      return;
    }

    await refreshCategoryOverrides();
  }

  const customIncomeCategories = useMemo(
    () => categories.filter((item) => item.type === "income"),
    [categories]
  );

  const customExpenseCategories = useMemo(
    () => categories.filter((item) => item.type === "expense"),
    [categories]
  );

  const incomeCategories = useMemo(() => {
    const all = [
      ...fixedIncomeCategories,
      ...customIncomeCategories.map((item) => item.name),
    ];
    return Array.from(new Set(all));
  }, [customIncomeCategories, fixedIncomeCategories]);

  const expenseCategories = useMemo(() => {
    const all = [
      ...fixedExpenseCategories,
      ...customExpenseCategories.map((item) => item.name),
    ];
    return Array.from(new Set(all));
  }, [customExpenseCategories, fixedExpenseCategories]);

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
                {incomeCategories.map((category) => (
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
                {expenseCategories.map((category) => (
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
                {incomeCategories.map((category) => (
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
                {expenseCategories.map((category) => (
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
              {incomeCategories.map((category) => (
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
              {expenseCategories.map((category) => (
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

  function renderCategoriesView() {
    return (
      <div className="grid gap-6">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-xl font-semibold">
            {editingCategoryId ? "Editar categoria" : "Nova categoria"}
          </h2>

          <form onSubmit={handleSaveCategory} className="grid gap-4 md:grid-cols-3">
            <input
              type="text"
              placeholder="Nome da categoria"
              className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
            />

            <select
              className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none"
              value={categoryType}
              onChange={(e) => setCategoryType(e.target.value as CategoryType)}
            >
              <option value="income">Receita</option>
              <option value="expense">Despesa</option>
            </select>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                className="rounded-xl bg-white px-4 py-3 font-medium text-slate-900"
              >
                {editingCategoryId ? "Salvar" : "Adicionar"}
              </button>

              {editingCategoryId && (
                <button
                  type="button"
                  onClick={() => {
                    setCategoryName("");
                    setCategoryType("income");
                    setEditingCategoryId(null);
                  }}
                  className="rounded-xl border border-slate-700 px-4 py-3 font-medium text-slate-200"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h3 className="mb-4 text-lg font-semibold">Categorias de receita</h3>

            <div className="mb-6">
              <p className="mb-2 text-sm text-slate-400">Fixas</p>
              <div className="flex flex-wrap gap-2">
                {fixedIncomeCategories.map((category) => (
                  <span
                    key={category}
                    className="group relative rounded-full border border-slate-700 px-3 py-1 text-sm text-slate-200"
                  >
                    {category}
                    <button
                      type="button"
                      aria-label={`Deletar ${category}`}
                      onClick={() =>
                        openConfirm({
                          title: "Remover categoria fixa de receita",
                          message: `Tem certeza que deseja remover "${category}"?`,
                          confirmLabel: "Remover",
                          onConfirm: () => removeFixedIncomeCategory(category),
                        })
                      }
                      className="absolute -right-2 -top-2 hidden h-5 w-5 items-center justify-center rounded-full border border-slate-600 bg-slate-950 text-xs text-slate-300 group-hover:flex"
                    >
                      X
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm text-slate-400">Personalizadas</p>
              {customIncomeCategories.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhuma categoria criada.</p>
              ) : (
                <div className="grid gap-2">
                  {customIncomeCategories.map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-4 py-2"
                    >
                      <span>{category.name}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditCategory(category)}
                          className="rounded-lg border border-slate-600 px-3 py-1 text-xs text-slate-200"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className="rounded-lg border border-rose-500 px-3 py-1 text-xs text-rose-400"
                        >
                          Deletar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h3 className="mb-4 text-lg font-semibold">Categorias de despesa</h3>

            <div className="mb-6">
              <p className="mb-2 text-sm text-slate-400">Fixas</p>
              <div className="flex flex-wrap gap-2">
                {fixedExpenseCategories.map((category) => (
                  <span
                    key={category}
                    className="group relative rounded-full border border-slate-700 px-3 py-1 text-sm text-slate-200"
                  >
                    {category}
                    <button
                      type="button"
                      aria-label={`Deletar ${category}`}
                      onClick={() =>
                        openConfirm({
                          title: "Remover categoria fixa de despesa",
                          message: `Tem certeza que deseja remover "${category}"?`,
                          confirmLabel: "Remover",
                          onConfirm: () => removeFixedExpenseCategory(category),
                        })
                      }
                      className="absolute -right-2 -top-2 hidden h-5 w-5 items-center justify-center rounded-full border border-slate-600 bg-slate-950 text-xs text-slate-300 group-hover:flex"
                    >
                      X
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm text-slate-400">Personalizadas</p>
              {customExpenseCategories.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhuma categoria criada.</p>
              ) : (
                <div className="grid gap-2">
                  {customExpenseCategories.map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-4 py-2"
                    >
                      <span>{category.name}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditCategory(category)}
                          className="rounded-lg border border-slate-600 px-3 py-1 text-xs text-slate-200"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className="rounded-lg border border-rose-500 px-3 py-1 text-xs text-rose-400"
                        >
                          Deletar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
    <>
      <AppShell title="Dashboard">
        {currentView === "account" && renderAccountView()}
        {currentView === "categories" && renderCategoriesView()}
        {currentView === "create-month" && renderCreateMonthView()}
        {currentView === "dashboard" && renderDashboardHome()}
        {currentView === "recurring-incomes" && renderRecurringIncomesView()}
        {currentView === "recurring-expenses" && renderRecurringExpensesView()}
        {currentView === "months" && renderMonthsView()}
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
"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CenterModal } from "@/components/center-modal";
import { usePreferences } from "@/components/preferences-provider";
import { formatCurrency } from "@/lib/formatters";
import { supabase } from "@/lib/supabase";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/constants";
import { CategoryType, Expense, Income, Month, RecurringEntry } from "@/types";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  type PieLabelRenderProps,
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

type CategoryOverride = {
  id: string;
  name: string;
  type: CategoryType;
  action: "remove";
};

type ModalState = {
  title: string;
  message: string;
  intent?: "info" | "success" | "warning" | "error";
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void | Promise<void>;
};

type CalendarEvent = {
  id: string;
  day_of_month: number;
  description: string;
  type: "income" | "expense";
  amount: number | null;
  user_id: string;
};

type Installment = {
  id: string;
  name: string;
  description: string | null;
  total_amount: number;
  installment_amount: number;
  total_installments: number;
  card_last_digits: string | null;
  start_month: number;
  start_year: number;
  user_id: string;
  created_at?: string;
};

type Subscription = {
  id: string;
  name: string;
  amount: number;
  user_id: string;
  created_at?: string;
};

function DashboardContent() {
  const searchParams = useSearchParams();
  const currentView = searchParams.get("view") || "home";

  const { preferences, updatePreferences } = usePreferences();
  const hideValues = preferences.hideValues;

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [profile, setProfile] = useState<any>(null);
  const [profileName, setProfileName] = useState("");
  const [email, setEmail] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);

  const [allEntries, setAllEntries] = useState<any[]>([]);
  const [savingsEntries, setSavingsEntries] = useState<any[]>([]);

  const [allIncomes, setAllIncomes] = useState<Income[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);

  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const [categoryOverrides, setCategoryOverrides] = useState<CategoryOverride[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<any[]>([]);
  const [savingsGoalsCount, setSavingsGoalsCount] = useState(0);

  const [months, setMonths] = useState<Month[]>([]);
  const [selectedMonthId, setSelectedMonthId] = useState("");
  const [comparisonMonthId, setComparisonMonthId] = useState("");
  const [categoryMonthFilterId, setCategoryMonthFilterId] = useState("");
  const [monthsYearFilter, setMonthsYearFilter] = useState("");

  const [monthName, setMonthName] = useState("");
  const [monthNumber, setMonthNumber] = useState("");
  const [year, setYear] = useState("");

  const [incomeDescription, setIncomeDescription] = useState("");
  const [incomeAmount, setIncomeAmount] = useState("");
  const [incomeCategory, setIncomeCategory] = useState("Salário");

  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("");
  const [expenseSubcategory, setExpenseSubcategory] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");

  const [recurringEntries, setRecurringEntries] = useState<RecurringEntry[]>([]);
  const [recurringDescription, setRecurringDescription] = useState("");
  const [recurringAmount, setRecurringAmount] = useState("");
  const [recurringCategory, setRecurringCategory] = useState("Salário");

  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editExpenseDescription, setEditExpenseDescription] = useState("");
  const [editExpenseCategory, setEditExpenseCategory] = useState("");

  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);
  const [editIncomeDescription, setEditIncomeDescription] = useState("");
  const [editIncomeCategory, setEditIncomeCategory] = useState("");

  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [calendarDay, setCalendarDay] = useState("");
  const [calendarDescription, setCalendarDescription] = useState("");
  const [calendarType, setCalendarType] = useState<"income" | "expense">("expense");
  const [calendarAmount, setCalendarAmount] = useState("");

  const [editingCalendarId, setEditingCalendarId] = useState<string | null>(null);
  const [editCalendarDay, setEditCalendarDay] = useState("");
  const [editCalendarDescription, setEditCalendarDescription] = useState("");
  const [editCalendarType, setEditCalendarType] = useState<"income" | "expense">("expense");
  const [editCalendarAmount, setEditCalendarAmount] = useState("");

  const [installments, setInstallments] = useState<Installment[]>([]);
  const [installmentName, setInstallmentName] = useState("");
  const [installmentDescription, setInstallmentDescription] = useState("");
  const [installmentTotal, setInstallmentTotal] = useState("");
  const [installmentCount, setInstallmentCount] = useState("");
  const [installmentCard, setInstallmentCard] = useState("");

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [subscriptionName, setSubscriptionName] = useState("");
  const [subscriptionAmount, setSubscriptionAmount] = useState("");

  const [newMovementType, setNewMovementType] = useState<"income" | "expense">("expense");
  const [recurringTab, setRecurringTab] = useState<"income" | "expense">("income");

  const [modal, setModal] = useState<ModalState | null>(null);

  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [categoryName, setCategoryName] = useState("");
  const [categoryType, setCategoryType] = useState<CategoryType>("income");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);

  const chartColors = [
    "#22d3ee",
    "#38bdf8",
    "#f472b6",
    "#a78bfa",
    "#34d399",
    "#fbbf24",
    "#fb7185",
    "#60a5fa",
  ];

  function openAlert(message: string, intent: ModalState["intent"] = "info") {
    setModal({
      title: "Aviso",
      message,
      intent,
    });
  }

  function openConfirm(config: ModalState) {
    setModal({
      cancelLabel: "Cancelar",
      ...config,
    });
  }

  async function handleModalConfirm() {
    if (modal?.onConfirm) {
      await modal.onConfirm();
    }
    setModal(null);
  }

  function getInitials(name?: string | null, mail?: string | null) {
    const source = (name || mail || "").trim();
    if (!source) return "--";
    const parts = source.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] || "";
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
    return `${first}${last}`.toUpperCase() || "--";
  }

  const refreshAllEntries = useCallback(async (userIdOverride?: string) => {
    const targetUserId = userIdOverride || userId;

    if (!targetUserId) return;

    const { data: incomesData } = await supabase
      .from("incomes")
      .select("*")
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: false });

    const { data: expensesData } = await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: false });

    if (incomesData) setAllIncomes(incomesData);
    if (expensesData) setAllExpenses(expensesData);
  }, [userId]);

  const refreshSavingsEntries = useCallback(async (userIdOverride?: string) => {
    const targetUserId = userIdOverride || userId;
    if (!targetUserId) return;
    const { data } = await supabase
      .from("savings_entries")
      .select("*")
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: false });
    if (data) setSavingsEntries(data);
  }, [userId]);

  const refreshSavingsGoals = useCallback(async (userIdOverride?: string) => {
    const targetUserId = userIdOverride || userId;
    if (!targetUserId) return;
    const { data } = await supabase
      .from("savings_goals")
      .select("*")
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: false });
    if (data) setSavingsGoals(data);
  }, [userId]);

  const refreshSavingsGoalsCount = useCallback(async (userIdOverride?: string) => {
    const targetUserId = userIdOverride || userId;
    if (!targetUserId) return;
    const { count } = await supabase
      .from("savings_goals")
      .select("count", { count: "exact" })
      .eq("user_id", targetUserId);
    if (count) setSavingsGoalsCount(count);
  }, [userId]);

  const refreshCategoryOverrides = useCallback(async (userIdOverride?: string) => {
    const targetUserId = userIdOverride || userId;
    if (!targetUserId) return;
    const { data } = await supabase
      .from("category_overrides")
      .select("*")
      .eq("user_id", targetUserId);
    if (data) setCategoryOverrides(data);
  }, [userId]);

  const refreshCategories = useCallback(async (userIdOverride?: string) => {
    const targetUserId = userIdOverride || userId;
    if (!targetUserId) return;
    const { data } = await supabase
      .from("categories")
      .select("*")
      .eq("user_id", targetUserId);
    if (data) setCategories(data);
  }, [userId]);

  const refreshRecurringEntries = useCallback(async (userIdOverride?: string) => {
    const targetUserId = userIdOverride || userId;
    if (!targetUserId) return;
    const { data } = await supabase
      .from("recurring_entries")
      .select("*")
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: false });
    if (data) setRecurringEntries(data);
  }, [userId]);

  const refreshMonths = useCallback(async (userIdOverride?: string) => {
    const targetUserId = userIdOverride || userId;
    if (!targetUserId) return;
    const { data } = await supabase
      .from("months")
      .select("*")
      .eq("user_id", targetUserId)
      .order("year", { ascending: false })
      .order("month", { ascending: false });
    if (data) setMonths(data);
  }, [userId]);

  const refreshCalendarEvents = useCallback(async (userIdOverride?: string) => {
    const targetUserId = userIdOverride || userId;
    if (!targetUserId) return;
    const { data } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("user_id", targetUserId)
      .order("day_of_month", { ascending: true });
    if (data) setCalendarEvents(data);
  }, [userId]);

  const refreshInstallments = useCallback(async (userIdOverride?: string) => {
    const targetUserId = userIdOverride || userId;
    if (!targetUserId) return;
    const { data } = await supabase
      .from("installments")
      .select("*")
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: false });
    if (data) setInstallments(data);
  }, [userId]);

  const refreshSubscriptions = useCallback(async (userIdOverride?: string) => {
    const targetUserId = userIdOverride || userId;
    if (!targetUserId) return;
    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: false });
    if (data) setSubscriptions(data);
  }, [userId]);

  const refreshEntries = useCallback(async (monthId?: string) => {
    const targetMonthId = monthId || selectedMonthId;
    if (!userId || !targetMonthId) {
      setIncomes([]);
      setExpenses([]);
      return;
    }

    const { data: incomesData } = await supabase
      .from("incomes")
      .select("*")
      .eq("user_id", userId)
      .eq("month_id", targetMonthId)
      .order("created_at", { ascending: false });

    const { data: expensesData } = await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", userId)
      .eq("month_id", targetMonthId)
      .order("created_at", { ascending: false });

    if (incomesData) setIncomes(incomesData);
    if (expensesData) setExpenses(expensesData);
  }, [selectedMonthId, userId]);

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

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileData) setProfile(profileData);
      setProfileName(profileData?.full_name || "");
      setEmail(profileData?.email || user.email || "");

      await Promise.all([
        refreshAllEntries(user.id),
        refreshSavingsEntries(user.id),
        refreshSavingsGoals(user.id),
        refreshSavingsGoalsCount(user.id),
        refreshCategoryOverrides(user.id),
        refreshCategories(user.id),
        refreshRecurringEntries(user.id),
        refreshMonths(user.id),
        refreshCalendarEvents(user.id),
        refreshInstallments(user.id),
        refreshSubscriptions(user.id),
      ]);

      setLoading(false);
    }

    loadData();
  }, [
    refreshAllEntries,
    refreshCategoryOverrides,
    refreshSavingsEntries,
    refreshSavingsGoals,
    refreshSavingsGoalsCount,
    refreshCategories,
    refreshRecurringEntries,
    refreshMonths,
    refreshCalendarEvents,
    refreshInstallments,
    refreshSubscriptions,
  ]);

  useEffect(() => {
    if (!selectedMonthId) {
      setIncomes([]);
      setExpenses([]);
      return;
    }

    refreshEntries(selectedMonthId);
  }, [selectedMonthId, refreshEntries]);

  useEffect(() => {
    if (selectedMonthId || months.length === 0) return;
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const match = months.find(
      (m) => m.month === currentMonth && m.year === currentYear
    );
    if (match) {
      setSelectedMonthId(match.id);
    }
  }, [months, selectedMonthId]);

  const monthById = useMemo(() => {
    return new Map(months.map((item) => [item.id, item]));
  }, [months]);

  const sortedMonthsDesc = useMemo(() => {
    return [...months].sort((a, b) =>
      a.year === b.year ? b.month - a.month : b.year - a.year
    );
  }, [months]);

  const sortedMonthsAsc = useMemo(() => {
    return [...sortedMonthsDesc].reverse();
  }, [sortedMonthsDesc]);

  const years = useMemo(() => {
    const unique = Array.from(new Set(months.map((item) => item.year)));
    return unique.sort((a, b) => b - a);
  }, [months]);

  const filteredMonths = useMemo(() => {
    if (!monthsYearFilter) return sortedMonthsDesc;
    return sortedMonthsDesc.filter(
      (item) => String(item.year) === monthsYearFilter
    );
  }, [monthsYearFilter, sortedMonthsDesc]);

  const currentYear = useMemo(() => new Date().getFullYear(), []);

  const annualIncome = useMemo(() => {
    return allIncomes.reduce((total, item) => {
      const month = monthById.get(item.month_id);
      if (!month || month.year !== currentYear) return total;
      return total + Number(item.amount);
    }, 0);
  }, [allIncomes, currentYear, monthById]);

  const annualExpenses = useMemo(() => {
    return allExpenses.reduce((total, item) => {
      const month = monthById.get(item.month_id);
      if (!month || month.year !== currentYear) return total;
      return total + Number(item.amount);
    }, 0);
  }, [allExpenses, currentYear, monthById]);

  const categoryChartData = useMemo(() => {
    const source = categoryMonthFilterId
      ? allExpenses.filter((item) => item.month_id === categoryMonthFilterId)
      : allExpenses;
    const totals: Record<string, number> = {};
    source.forEach((item) => {
      const key = item.category || "Outros";
      totals[key] = (totals[key] || 0) + Number(item.amount);
    });
    return Object.entries(totals).map(([name, value]) => ({ name, value }));
  }, [allExpenses, categoryMonthFilterId]);

  const currentMonthCategoryData = useMemo(() => {
    const totals: Record<string, number> = {};
    expenses.forEach((item) => {
      const key = item.category || "Outros";
      totals[key] = (totals[key] || 0) + Number(item.amount);
    });
    return Object.entries(totals).map(([name, value]) => ({ name, value }));
  }, [expenses]);

  const monthlyTotals = useMemo(() => {
    const totals: Record<string, { income: number; expense: number }> = {};

    allIncomes.forEach((item) => {
      totals[item.month_id] = totals[item.month_id] || { income: 0, expense: 0 };
      totals[item.month_id].income += Number(item.amount);
    });

    allExpenses.forEach((item) => {
      totals[item.month_id] = totals[item.month_id] || { income: 0, expense: 0 };
      totals[item.month_id].expense += Number(item.amount);
    });

    return sortedMonthsAsc.map((month) => ({
      id: month.id,
      name: month.name,
      receitas: totals[month.id]?.income || 0,
      despesas: totals[month.id]?.expense || 0,
      isFocus: Boolean(comparisonMonthId && month.id === comparisonMonthId),
    }));
  }, [allIncomes, allExpenses, sortedMonthsAsc, comparisonMonthId]);

  const categorySpending = useMemo(() => {
    const spending: Record<string, number> = {};

    allEntries.forEach((item) => {
      spending[item.category] = (spending[item.category] || 0) + Number(item.amount);
    });

    return Object.values(spending);
  }, [allEntries, categoryOverrides]);

  const subcategorySpending = useMemo(() => {
    const spending: Record<string, number> = {};

    allEntries.forEach((item) => {
      spending[item.category] = (spending[item.category] || 0) + Number(item.amount);
    });

    return Object.values(spending);
  }, [allEntries, categoryOverrides]);

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
    await refreshAllEntries();
  }

  async function handleDeleteIncome(id: string) {
    const { error } = await supabase.from("incomes").delete().eq("id", id);

    if (error) {
      openAlert("Erro ao deletar receita.", "error");
      return;
    }

    await refreshEntries(selectedMonthId);
    await refreshAllEntries();
  }

  async function handleUpdateIncome(id: string) {
    if (!editIncomeDescription.trim()) {
      openAlert("A descrição não pode estar vazia.", "warning");
      return;
    }

    const { error } = await supabase
      .from("incomes")
      .update({
        description: editIncomeDescription.trim(),
        category: editIncomeCategory || null,
      })
      .eq("id", id);

    if (error) {
      openAlert("Erro ao atualizar receita.", "error");
      return;
    }

    setEditingIncomeId(null);
    await refreshEntries(selectedMonthId);
    await refreshAllEntries();
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

    setExpenseAmount("");
    setExpenseCategory("");
    setExpenseSubcategory("");
    setExpenseDescription("");

    await refreshEntries(selectedMonthId);
    await refreshAllEntries();
  }

  async function handleDeleteExpense(id: string) {
    const { error } = await supabase.from("expenses").delete().eq("id", id);

    if (error) {
      openAlert("Erro ao deletar despesa.", "error");
      return;
    }

    await refreshEntries(selectedMonthId);
    await refreshAllEntries();
  }

  async function handleUpdateExpense(id: string) {
    if (!editExpenseDescription.trim()) {
      openAlert("A descrição não pode estar vazia.", "warning");
      return;
    }

    const { error } = await supabase
      .from("expenses")
      .update({
        description: editExpenseDescription.trim(),
        category: editExpenseCategory,
      })
      .eq("id", id);

    if (error) {
      openAlert("Erro ao atualizar despesa.", "error");
      return;
    }

    setEditingExpenseId(null);
    await refreshEntries(selectedMonthId);
    await refreshAllEntries();
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
      openAlert("Crie o mês primeiro (preencha nome, mês e ano e clique em Criar) antes de adicionar recorrentes.", "warning");
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
    await refreshAllEntries();
  }

  async function handleResetPassword() {
    if (!email) {
      openAlert("Email nao encontrado.", "error");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      openAlert("Erro ao solicitar reset de senha.", "error");
      return;
    }

    openAlert("Email de redefinicao enviado.", "success");
  }

  async function handleSaveProfile() {
    if (!userId) {
      openAlert("Usuário não encontrado.", "error");
      return;
    }

    setProfileSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: profileName })
      .eq("id", userId);

    setProfileSaving(false);

    if (error) {
      openAlert("Erro ao salvar perfil.", "error");
      return;
    }

    setProfile((prev: Profile | null) => (prev ? { ...prev, full_name: profileName } : prev));
    openAlert("Perfil atualizado com sucesso.", "success");
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  async function handleCreateMonth(e: React.FormEvent) {
    e.preventDefault();

    if (!monthName || !monthNumber || !year) {
      openAlert("Preencha nome, mês e ano.", "warning");
      return;
    }

    if (!userId) {
      openAlert("Usuário não encontrado.", "error");
      return;
    }

    const { data, error } = await supabase.from("months").insert({
      user_id: userId,
      name: monthName,
      month: Number(monthNumber),
      year: Number(year),
    }).select().single();

    if (error) {
      openAlert("Erro ao criar mês.", "error");
      return;
    }

    if (data) {
      setSelectedMonthId(data.id);
    }

    setMonthName("");
    setMonthNumber("");
    setYear("");

    await refreshMonths();
    openAlert("Mês criado com sucesso! Agora você pode adicionar recorrentes.", "success");
  }

  async function handleDeleteMonth(id: string) {
    openConfirm({
      title: "Deletar mês",
      message: "Deseja deletar este mês?",
      confirmLabel: "Deletar",
      onConfirm: async () => {
        const { error } = await supabase
          .from("months")
          .delete()
          .eq("id", id)
          .eq("user_id", userId);

        if (error) {
          openAlert("Erro ao deletar mês.", "error");
          return;
        }

        await refreshMonths();
      },
    });
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

  const removedFixedIncomeCategories = useMemo(() => {
    return categoryOverrides
      .filter((item) => item.type === "income" && item.action === "remove")
      .map((item) => item.name);
  }, [categoryOverrides]);

  const removedFixedExpenseCategories = useMemo(() => {
    return categoryOverrides
      .filter((item) => item.type === "expense" && item.action === "remove")
      .map((item) => item.name);
  }, [categoryOverrides]);

  const fixedIncomeCategories = useMemo(() => {
    return INCOME_CATEGORIES.filter(
      (category) => !removedFixedIncomeCategories.includes(category)
    );
  }, [removedFixedIncomeCategories]);

  const fixedExpenseCategories = useMemo(() => {
    return EXPENSE_CATEGORIES.filter(
      (category) => !removedFixedExpenseCategories.includes(category)
    );
  }, [removedFixedExpenseCategories]);

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

  const monthInstallments = useMemo(() => {
    if (!selectedMonthId) return [];
    const selectedMonth = monthById.get(selectedMonthId);
    if (!selectedMonth) return [];
    const sm = selectedMonth.month;
    const sy = selectedMonth.year;

    return installments
      .map((inst) => {
        const elapsed = (sy - inst.start_year) * 12 + (sm - inst.start_month);
        if (elapsed < 0 || elapsed >= inst.total_installments) return null;
        return {
          ...inst,
          currentInstallment: elapsed + 1,
        };
      })
      .filter(Boolean) as (Installment & { currentInstallment: number })[];
  }, [installments, selectedMonthId, monthById]);

  const totalInstallments = useMemo(
    () => monthInstallments.reduce((total, item) => total + item.installment_amount, 0),
    [monthInstallments]
  );

  const balance = useMemo(() => totalIncomes - totalExpenses - totalInstallments, [totalIncomes, totalExpenses, totalInstallments]);

  const savingsByMonth = useMemo(() => {
    const savings: Record<string, number> = {};

    savingsEntries.forEach((item) => {
      savings[item.month_id] = (savings[item.month_id] || 0) + Number(item.saved_amount);
    });

    return Object.values(savings);
  }, [savingsEntries]);

  const savingsGoalsProgress = useMemo(() => {
    return savingsGoals.map((goal) => {
      const saved = savingsEntries
        .filter((e) => e.goal_id === goal.id)
        .reduce(
          (acc, e) => acc + e.saved_amount - e.withdrawn_amount,
          0
        );

      const progress = goal.target_amount
        ? (saved / goal.target_amount) * 100
        : 0;

      return {
        name: goal.name,
        saved,
        target: goal.target_amount,
        progress,
      };
    });
  }, [savingsGoals, savingsEntries]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p>Carregando...</p>
      </main>
    );
  }

  function renderHomeView() {
    const hideValues = preferences.hideValues;
    const tooltipFormatter = (value: number) => formatCurrency(value, hideValues);
    const pieLabel = ({ name, value }: PieLabelRenderProps) => {
      const safeName = name || "";
      const safeValue = typeof value === "number" ? value : 0;
      return hideValues ? safeName : `${safeName}: ${formatCurrency(safeValue, false)}`;
    };

    // Totals across all months
    const totalAllIncomes = allIncomes.reduce((t, i) => t + Number(i.amount), 0);
    const totalAllExpenses = allExpenses.reduce((t, i) => t + Number(i.amount), 0);
    const overallBalance = totalAllIncomes - totalAllExpenses;
    const monthCount = months.length;
    const avgSavings = monthCount > 0 ? overallBalance / monthCount : 0;

    // All-category data (global)
    const globalCategoryData = (() => {
      const totals: Record<string, number> = {};
      allExpenses.forEach((item) => {
        const key = item.category || "Outros";
        totals[key] = (totals[key] || 0) + Number(item.amount);
      });
      return Object.entries(totals)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
    })();

    // Evolution chart data (saldo acumulado per month)
    const evolutionData = (() => {
      const data: { name: string; saldo: number }[] = [];
      let accumulated = 0;
      sortedMonthsAsc.forEach((month) => {
        const inc = allIncomes
          .filter((i) => i.month_id === month.id)
          .reduce((t, i) => t + Number(i.amount), 0);
        const exp = allExpenses
          .filter((i) => i.month_id === month.id)
          .reduce((t, i) => t + Number(i.amount), 0);
        accumulated += inc - exp;
        data.push({ name: month.name, saldo: accumulated });
      });
      return data;
    })();

    // Monthly comparison (all months, no focus)
    const allMonthlyTotals = sortedMonthsAsc.map((month) => {
      const inc = allIncomes
        .filter((i) => i.month_id === month.id)
        .reduce((t, i) => t + Number(i.amount), 0);
      const exp = allExpenses
        .filter((i) => i.month_id === month.id)
        .reduce((t, i) => t + Number(i.amount), 0);
      return { name: month.name, receitas: inc, despesas: exp, balance: inc - exp };
    });

    // Indicators
    const bestMonth = allMonthlyTotals.length > 0
      ? allMonthlyTotals.reduce((best, m) => m.balance > best.balance ? m : best, allMonthlyTotals[0])
      : null;
    const worstMonth = allMonthlyTotals.length > 0
      ? allMonthlyTotals.reduce((worst, m) => m.despesas > worst.despesas ? m : worst, allMonthlyTotals[0])
      : null;
    const topCategory = globalCategoryData.length > 0 ? globalCategoryData[0] : null;

    // Savings rate
    const savingsRate = totalAllIncomes > 0
      ? ((totalAllIncomes - totalAllExpenses) / totalAllIncomes) * 100
      : 0;
    const spendingRate = totalAllIncomes > 0
      ? (totalAllExpenses / totalAllIncomes) * 100
      : 0;

    // Cofrinhos summary
    const totalSavingsBalance = savingsGoalsProgress.reduce((t, g) => t + g.saved, 0);
    const biggestGoal = savingsGoalsProgress.length > 0
      ? savingsGoalsProgress.reduce((b, g) => g.saved > b.saved ? g : b, savingsGoalsProgress[0])
      : null;

    // Installments summary
    const now = new Date();
    const cm = now.getMonth() + 1;
    const cy = now.getFullYear();
    const activeInstallments = installments.filter((inst) => {
      const elapsed = (cy - inst.start_year) * 12 + (cm - inst.start_month);
      return elapsed >= 0 && elapsed < inst.total_installments;
    });
    const monthlyInstallmentCost = activeInstallments.reduce((t, i) => t + i.installment_amount, 0);

    return (
      <div className="grid gap-6">
        {/* Cabeçalho */}
        <section>
          <h2 className="text-2xl font-bold text-white">Dashboard Financeiro</h2>
          <p className="mt-1 text-sm text-slate-400">Visão geral das suas finanças</p>
        </section>

        {/* 1. Saldo acumulado */}
        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 md:col-span-4">
            <p className="text-sm text-slate-400">Saldo acumulado</p>
            <h2
              className={`mt-2 text-4xl font-bold ${
                overallBalance >= 0 ? "text-cyan-400" : "text-rose-400"
              }`}
            >
              {formatCurrency(overallBalance, hideValues)}
            </h2>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-wider text-slate-400">Receita total</p>
            <h3 className="mt-2 text-2xl font-bold text-emerald-400">
              {formatCurrency(totalAllIncomes, hideValues)}
            </h3>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-wider text-slate-400">Despesa total</p>
            <h3 className="mt-2 text-2xl font-bold text-rose-400">
              {formatCurrency(totalAllExpenses, hideValues)}
            </h3>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-wider text-slate-400">Economia média</p>
            <h3 className="mt-2 text-2xl font-bold text-cyan-400">
              {formatCurrency(avgSavings, hideValues)}
            </h3>
            <p className="mt-1 text-[10px] text-slate-500">por mês</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-wider text-slate-400">Meses cadastrados</p>
            <h3 className="mt-2 text-2xl font-bold text-white">
              {monthCount}
            </h3>
          </div>
        </section>

        {/* 2. Evolução financeira */}
        {evolutionData.length > 1 && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-4 text-lg font-semibold">Evolução do saldo</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evolutionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#cbd5e1" />
                  <YAxis stroke="#cbd5e1" />
                  <Tooltip formatter={(value) => tooltipFormatter(Number(value))} />
                  <Line
                    type="monotone"
                    dataKey="saldo"
                    stroke="#22d3ee"
                    strokeWidth={3}
                    dot={{ fill: "#22d3ee", r: 4 }}
                    name="Saldo acumulado"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* 3. Comparativo + Categorias */}
        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-4 text-lg font-semibold">Comparativo dos meses</h2>
            {allMonthlyTotals.length === 0 ? (
              <p className="text-sm text-slate-400">Nenhum mês cadastrado.</p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={allMonthlyTotals}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" stroke="#cbd5e1" />
                    <YAxis stroke="#cbd5e1" />
                    <Tooltip formatter={(value) => tooltipFormatter(Number(value))} />
                    <Legend />
                    <Bar dataKey="receitas" fill="#34d399" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="despesas" fill="#f43f5e" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-4 text-lg font-semibold">Despesas por categoria (geral)</h2>
            {globalCategoryData.length === 0 ? (
              <p className="text-sm text-slate-400">Nenhuma despesa cadastrada.</p>
            ) : globalCategoryData.length === 1 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <p className="text-xs uppercase tracking-wider text-slate-400">Categoria dominante</p>
                <p className="mt-2 text-xl font-bold text-white">{globalCategoryData[0].name}</p>
                <p className="mt-1 text-2xl font-bold text-rose-400">
                  {formatCurrency(globalCategoryData[0].value, hideValues)}
                </p>
                <p className="mt-1 text-sm text-slate-400">100%</p>
              </div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={globalCategoryData}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={90}
                      label={pieLabel}
                    >
                      {globalCategoryData.map((_, index) => (
                        <Cell key={index} fill={chartColors[index % chartColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => tooltipFormatter(Number(value))} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </section>

        {/* 4. Indicadores financeiros */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-lg font-semibold">Indicadores financeiros</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {bestMonth && (
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs text-slate-400">Melhor mês</p>
                <p className="mt-1 text-sm font-semibold text-white">{bestMonth.name}</p>
                <p className="mt-1 text-lg font-bold text-emerald-400">
                  {formatCurrency(bestMonth.balance, hideValues)}
                </p>
              </div>
            )}

            {worstMonth && (
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs text-slate-400">Maior gasto mensal</p>
                <p className="mt-1 text-sm font-semibold text-white">{worstMonth.name}</p>
                <p className="mt-1 text-lg font-bold text-rose-400">
                  {formatCurrency(worstMonth.despesas, hideValues)}
                </p>
              </div>
            )}

            {topCategory && (
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs text-slate-400">Maior categoria</p>
                <p className="mt-1 text-sm font-semibold text-white">{topCategory.name}</p>
                <p className="mt-1 text-lg font-bold text-rose-400">
                  {formatCurrency(topCategory.value, hideValues)}
                </p>
              </div>
            )}

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-xs text-slate-400">Taxa de economia</p>
              <p className={`mt-1 text-lg font-bold ${savingsRate >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {savingsRate.toFixed(1)}%
              </p>
              <p className="mt-1 text-[10px] text-slate-500">
                {spendingRate.toFixed(1)}% gasto da renda
              </p>
            </div>
          </div>
        </section>

        {/* 5. Cofrinhos */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-lg font-semibold">Cofrinhos</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-xs text-slate-400">Total guardado</p>
              <p className="mt-1 text-xl font-bold text-emerald-400">
                {formatCurrency(totalSavingsBalance, hideValues)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-xs text-slate-400">Cofrinhos ativos</p>
              <p className="mt-1 text-xl font-bold text-white">{savingsGoalsCount}</p>
            </div>
            {biggestGoal && (
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs text-slate-400">Maior cofrinho</p>
                <p className="mt-1 text-sm font-semibold text-white">{biggestGoal.name}</p>
                <p className="mt-1 text-lg font-bold text-emerald-400">
                  {formatCurrency(biggestGoal.saved, hideValues)}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* 6. Parcelamentos */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-lg font-semibold">Parcelamentos</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-xs text-slate-400">Parcelas ativas</p>
              <p className="mt-1 text-xl font-bold text-white">{activeInstallments.length}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-xs text-slate-400">Valor mensal comprometido</p>
              <p className="mt-1 text-xl font-bold text-amber-400">
                {formatCurrency(monthlyInstallmentCost, hideValues)}
              </p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  function renderDashboardHome() {
    const hideValues = preferences.hideValues;
    const tooltipFormatter = (value: number) => formatCurrency(value, hideValues);
    const pieLabel = ({ name, value }: PieLabelRenderProps) => {
      const safeName = name || "";
      const safeValue = typeof value === "number" ? value : 0;
      return hideValues ? safeName : `${safeName}: ${formatCurrency(safeValue, false)}`;
    };

    const allMovements = [
      ...incomes.map((item) => ({ ...item, movType: "income" as const })),
      ...expenses.map((item) => ({ ...item, movType: "expense" as const })),
    ].sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });

    function handleNewMovement(e: React.FormEvent) {
      if (newMovementType === "income") {
        handleCreateIncome(e);
      } else {
        handleCreateExpense(e);
      }
    }

    return (
      <div className="grid gap-6">
        {/* Seletor de mês */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <select
            className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none"
            value={selectedMonthId}
            onChange={(e) => setSelectedMonthId(e.target.value)}
          >
            <option value="">Selecione um mês</option>
            {sortedMonthsDesc.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </section>

        {/* 1. Resumo financeiro */}
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 md:col-span-3">
            <p className="text-sm text-slate-400">Saldo do mês</p>
            <h2
              className={`mt-2 text-4xl font-bold ${
                balance >= 0 ? "text-cyan-400" : "text-rose-400"
              }`}
            >
              {formatCurrency(balance, hideValues)}
            </h2>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-wider text-slate-400">Receitas</p>
            <h3 className="mt-2 text-2xl font-bold text-emerald-400">
              {formatCurrency(totalIncomes, hideValues)}
            </h3>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-wider text-slate-400">Despesas</p>
            <h3 className="mt-2 text-2xl font-bold text-rose-400">
              {formatCurrency(totalExpenses + totalInstallments, hideValues)}
            </h3>
            {totalInstallments > 0 && (
              <p className="mt-1 text-[10px] text-slate-500">
                Inclui {formatCurrency(totalInstallments, hideValues)} em parcelas
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-wider text-slate-400">Parcelas</p>
            <h3 className="mt-2 text-2xl font-bold text-amber-400">
              {monthInstallments.length}
            </h3>
            <p className="mt-1 text-[10px] text-slate-500">ativas neste mês</p>
          </div>
        </section>

        {/* 2. Parcelas ativas */}
        {monthInstallments.length > 0 && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">Parcelas ativas</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {monthInstallments.map((inst) => (
                <div
                  key={inst.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                      <path d="M2 5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4H2V5Zm0 6h20v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8Z" fill="currentColor" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-white">{inst.name}</p>
                    <p className="text-xs text-slate-400">
                      Parcela {inst.currentInstallment}/{inst.total_installments}
                      {inst.card_last_digits && ` • ****${inst.card_last_digits}`}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-rose-400">
                    {formatCurrency(inst.installment_amount, hideValues)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 3. Gráficos */}
        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-4 text-lg font-semibold">Despesas por categoria</h2>
            {currentMonthCategoryData.length === 0 ? (
              <p className="text-sm text-slate-400">Nenhuma despesa neste mês.</p>
            ) : currentMonthCategoryData.length === 1 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <p className="text-xs uppercase tracking-wider text-slate-400">Categoria dominante</p>
                <p className="mt-2 text-xl font-bold text-white">{currentMonthCategoryData[0].name}</p>
                <p className="mt-1 text-2xl font-bold text-rose-400">
                  {formatCurrency(currentMonthCategoryData[0].value, hideValues)}
                </p>
                <p className="mt-1 text-sm text-slate-400">100%</p>
              </div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={currentMonthCategoryData}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={90}
                      label={pieLabel}
                    >
                      {currentMonthCategoryData.map((_, index) => (
                        <Cell key={index} fill={chartColors[index % chartColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => tooltipFormatter(Number(value))} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-4 text-lg font-semibold">Comparativo dos meses</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTotals}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#cbd5e1" />
                  <YAxis stroke="#cbd5e1" />
                  <Tooltip formatter={(value) => tooltipFormatter(Number(value))} />
                  <Legend />
                  <Bar dataKey="receitas" radius={[8, 8, 0, 0]}>
                    {monthlyTotals.map((entry) => (
                      <Cell key={`income-dashboard-${entry.id}`} fill={entry.isFocus ? "#34d399" : "#14532d"} />
                    ))}
                  </Bar>
                  <Bar dataKey="despesas" radius={[8, 8, 0, 0]}>
                    {monthlyTotals.map((entry) => (
                      <Cell key={`expense-dashboard-${entry.id}`} fill={entry.isFocus ? "#f43f5e" : "#4c0519"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* 4. Nova movimentação */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-lg font-semibold">Nova movimentação</h2>

          <form onSubmit={handleNewMovement} className="grid gap-4">
            <div className="flex gap-4">
              <label className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 text-sm transition ${newMovementType === "income" ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" : "border-slate-700 text-slate-400"}`}>
                <input
                  type="radio"
                  name="movType"
                  value="income"
                  checked={newMovementType === "income"}
                  onChange={() => setNewMovementType("income")}
                  className="hidden"
                />
                Receita
              </label>
              <label className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 text-sm transition ${newMovementType === "expense" ? "border-rose-500 bg-rose-500/10 text-rose-400" : "border-slate-700 text-slate-400"}`}>
                <input
                  type="radio"
                  name="movType"
                  value="expense"
                  checked={newMovementType === "expense"}
                  onChange={() => setNewMovementType("expense")}
                  className="hidden"
                />
                Despesa
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <input
                type="text"
                placeholder="Descrição"
                className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none"
                value={newMovementType === "income" ? incomeDescription : expenseDescription}
                onChange={(e) =>
                  newMovementType === "income"
                    ? setIncomeDescription(e.target.value)
                    : setExpenseDescription(e.target.value)
                }
              />
              <input
                type="number"
                step="0.01"
                placeholder="Valor"
                className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none"
                value={newMovementType === "income" ? incomeAmount : expenseAmount}
                onChange={(e) =>
                  newMovementType === "income"
                    ? setIncomeAmount(e.target.value)
                    : setExpenseAmount(e.target.value)
                }
              />
              <select
                className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none"
                value={newMovementType === "income" ? incomeCategory : expenseCategory}
                onChange={(e) =>
                  newMovementType === "income"
                    ? setIncomeCategory(e.target.value)
                    : setExpenseCategory(e.target.value)
                }
              >
                {(newMovementType === "income" ? incomeCategories : expenseCategories).map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className={`rounded-xl px-4 py-3 font-medium text-slate-950 ${
                newMovementType === "income" ? "bg-emerald-400" : "bg-rose-400"
              }`}
            >
              Adicionar {newMovementType === "income" ? "receita" : "despesa"}
            </button>
          </form>
        </section>

        {/* 5. Movimentações do mês */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-lg font-semibold">Movimentações do mês</h2>

          {allMovements.length === 0 ? (
            <p className="text-slate-400">Nenhuma movimentação neste mês.</p>
          ) : (
            <div className="grid gap-2">
              {allMovements.map((item) => {
                const isIncome = item.movType === "income";
                const isEditingThis = isIncome
                  ? editingIncomeId === item.id
                  : editingExpenseId === item.id;

                if (isEditingThis) {
                  return (
                    <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                      <div className="grid gap-3">
                        <input
                          type="text"
                          className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-white outline-none"
                          value={isIncome ? editIncomeDescription : editExpenseDescription}
                          onChange={(e) =>
                            isIncome
                              ? setEditIncomeDescription(e.target.value)
                              : setEditExpenseDescription(e.target.value)
                          }
                          placeholder="Descrição"
                        />
                        <select
                          className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-white outline-none"
                          value={isIncome ? editIncomeCategory : editExpenseCategory}
                          onChange={(e) =>
                            isIncome
                              ? setEditIncomeCategory(e.target.value)
                              : setEditExpenseCategory(e.target.value)
                          }
                        >
                          {(isIncome ? incomeCategories : expenseCategories).map((category) => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>
                        <div className="flex gap-2">
                          <button
                            onClick={() => isIncome ? handleUpdateIncome(item.id) : handleUpdateExpense(item.id)}
                            className="rounded-lg border border-emerald-500 px-3 py-2 text-sm text-emerald-400"
                          >
                            Salvar
                          </button>
                          <button
                            onClick={() => isIncome ? setEditingIncomeId(null) : setEditingExpenseId(null)}
                            className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-400"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4"
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isIncome ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
                      <span className="text-sm font-bold">{isIncome ? "+" : "−"}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-white">{item.description}</p>
                      <p className="text-xs text-slate-400">
                        {(item as any).category || "Outros"}
                      </p>
                    </div>

                    <p className={`text-sm font-semibold ${isIncome ? "text-emerald-400" : "text-rose-400"}`}>
                      {isIncome ? "+" : "−"} {formatCurrency(Number(item.amount), hideValues)}
                    </p>

                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          if (isIncome) {
                            setEditingIncomeId(item.id);
                            setEditIncomeDescription(item.description);
                            setEditIncomeCategory((item as any).category || "");
                          } else {
                            setEditingExpenseId(item.id);
                            setEditExpenseDescription(item.description);
                            setEditExpenseCategory((item as any).category || "");
                          }
                        }}
                        className="rounded-lg px-2 py-1 text-xs text-sky-400 hover:bg-slate-800"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => isIncome ? handleDeleteIncome(item.id) : handleDeleteExpense(item.id)}
                        className="rounded-lg px-2 py-1 text-xs text-rose-400 hover:bg-slate-800"
                      >
                        Deletar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 6. Movimentações recorrentes */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-lg font-semibold">Movimentações recorrentes</h2>

          <div className="mb-4 flex gap-2">
            <button
              onClick={() => setRecurringTab("income")}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                recurringTab === "income"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              Receitas
            </button>
            <button
              onClick={() => setRecurringTab("expense")}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                recurringTab === "expense"
                  ? "bg-rose-500/20 text-rose-400"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              Despesas
            </button>
          </div>

          {recurringTab === "income" ? (
            recurringIncomes.length === 0 ? (
              <p className="text-slate-400">Nenhuma receita recorrente cadastrada.</p>
            ) : (
              <div className="grid gap-2">
                {recurringIncomes.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-4"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{item.description}</p>
                      <p className="text-xs text-slate-400">
                        {formatCurrency(Number(item.amount), hideValues)} • {item.category || "Outros"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApplyRecurringToMonth(item)}
                        className="rounded-lg bg-cyan-400 px-3 py-2 text-xs font-medium text-slate-950"
                      >
                        Adicionar ao mês
                      </button>
                      <button
                        onClick={() => handleDeleteRecurringEntry(item.id)}
                        className="rounded-lg border border-rose-500 px-2 py-1 text-xs text-rose-400"
                      >
                        X
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : recurringExpenses.length === 0 ? (
            <p className="text-slate-400">Nenhuma despesa recorrente cadastrada.</p>
          ) : (
            <div className="grid gap-2">
              {recurringExpenses.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-4"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{item.description}</p>
                    <p className="text-xs text-slate-400">
                      {formatCurrency(Number(item.amount), hideValues)} • {item.category || "Outros"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApplyRecurringToMonth(item)}
                      className="rounded-lg bg-cyan-400 px-3 py-2 text-xs font-medium text-slate-950"
                    >
                      Adicionar ao mês
                    </button>
                    <button
                      onClick={() => handleDeleteRecurringEntry(item.id)}
                      className="rounded-lg border border-rose-500 px-2 py-1 text-xs text-rose-400"
                    >
                      X
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  function renderAccountView() {
    const initials = getInitials(profileName, email);
    const themeDarkEnabled = preferences.theme === "dark";
    const themeLightEnabled = preferences.theme === "light";

    return (
      <div className="grid gap-6">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 text-lg font-semibold text-cyan-200">
                {initials}
              </div>
              <div>
                <p className="text-sm text-slate-400">Perfil</p>
                <h3 className="text-xl font-semibold">
                  {profileName || "Nome nao informado"}
                </h3>
                <p className="text-sm text-slate-400">{email || "-"}</p>
              </div>
            </div>

          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="grid gap-6">
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h3 className="mb-4 text-lg font-semibold">Dados da conta</h3>

              <div className="grid gap-4">
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Nome completo
                  </label>
                  <input
                    type="text"
                    placeholder="Digite seu nome"
                    className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none transition focus:border-cyan-400"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    E-mail cadastrado
                  </label>
                  <div className="mt-2 rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm text-slate-200">
                    {email || "-"}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h3 className="mb-4 text-lg font-semibold">Seguranca</h3>

              <div className="grid gap-4">
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-sm text-slate-400">Senha</p>
                  <p className="mt-1 text-white">••••••••</p>
                </div>

                <button
                  onClick={handleResetPassword}
                  className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-200 hover:border-cyan-400 hover:text-cyan-200"
                >
                  Resetar ou alterar senha
                </button>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h3 className="mb-4 text-lg font-semibold">Preferencias</h3>

              <div className="grid gap-3 text-sm text-slate-200">
                <label className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
                  <span>Tema escuro</span>
                  <input
                    type="checkbox"
                    checked={themeDarkEnabled}
                    onChange={() =>
                      updatePreferences({ theme: themeDarkEnabled ? "light" : "dark" })
                    }
                    className="h-4 w-4 accent-cyan-400"
                  />
                </label>

                <label className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
                  <span>Tema claro</span>
                  <input
                    type="checkbox"
                    checked={themeLightEnabled}
                    onChange={() =>
                      updatePreferences({ theme: themeLightEnabled ? "dark" : "light" })
                    }
                    className="h-4 w-4 accent-cyan-400"
                  />
                </label>

                <label className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
                  <span>Ocultar valores financeiros</span>
                  <input
                    type="checkbox"
                    checked={preferences.hideValues}
                    onChange={() =>
                      updatePreferences({ hideValues: !preferences.hideValues })
                    }
                    className="h-4 w-4 accent-cyan-400"
                  />
                </label>

                <label className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
                  <span>Menu recolhido por padrao</span>
                  <input
                    type="checkbox"
                    checked={preferences.menuCollapsed}
                    onChange={() =>
                      updatePreferences({ menuCollapsed: !preferences.menuCollapsed })
                    }
                    className="h-4 w-4 accent-cyan-400"
                  />
                </label>
              </div>
            </section>
          </div>

          <div className="grid gap-6">
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h3 className="mb-4 text-lg font-semibold">Resumo da conta</h3>

              <div className="grid gap-4">
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-sm text-slate-400">Meses cadastrados</p>
                  <p className="mt-1 text-2xl font-semibold text-white">
                    {months.length}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-sm text-slate-400">Receitas</p>
                  <p className="mt-1 text-2xl font-semibold text-emerald-300">
                    {allIncomes.length}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-sm text-slate-400">Despesas</p>
                  <p className="mt-1 text-2xl font-semibold text-rose-300">
                    {allExpenses.length}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-sm text-slate-400">Cofrinhos / metas</p>
                  <p className="mt-1 text-2xl font-semibold text-cyan-300">
                    {savingsGoalsCount}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h3 className="mb-4 text-lg font-semibold">Acoes</h3>

              <div className="grid gap-3">
                <button
                  onClick={handleSaveProfile}
                  disabled={profileSaving}
                  className="rounded-xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 disabled:opacity-70"
                >
                  {profileSaving ? "Salvando..." : "Salvar alteracoes"}
                </button>

                <button
                  onClick={handleLogout}
                  className="rounded-xl border border-slate-700 px-4 py-3 font-semibold text-slate-200 hover:border-slate-500"
                >
                  Sair
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }

  function renderCreateMonthView() {
    const hideValues = preferences.hideValues;
    const selectedMonth = months.find((m) => m.id === selectedMonthId);

    return (
      <div className="grid gap-6">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Criar novo mês</h2>
          <p className="mt-1 text-sm text-slate-400">
            Preencha os dados abaixo para criar um novo mês. Depois de criado, você pode adicionar suas receitas e despesas recorrentes diretamente ao mês.
          </p>

          <form onSubmit={handleCreateMonth} className="mt-4 grid gap-4 md:grid-cols-4">
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

          {selectedMonth && (
            <p className="mt-3 text-sm text-emerald-400">
              Mês ativo: {selectedMonth.name} — as recorrentes serão adicionadas aqui.
            </p>
          )}
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Receitas do mês</p>
            <h3 className="mt-2 text-2xl font-bold text-emerald-400">
              {formatCurrency(totalIncomes, hideValues)}
            </h3>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Despesas do mês</p>
            <h3 className="mt-2 text-2xl font-bold text-rose-400">
              {formatCurrency(totalExpenses, hideValues)}
            </h3>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Saldo do mês</p>
            <h3
              className={`mt-2 text-2xl font-bold ${
                totalIncomes - totalExpenses >= 0 ? "text-cyan-400" : "text-rose-400"
              }`}
            >
              {formatCurrency(totalIncomes - totalExpenses, hideValues)}
            </h3>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-4 text-xl font-semibold">
              Adicionar receitas recorrentes
            </h2>

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
                        {formatCurrency(Number(item.amount), hideValues)} • {item.category || "Outros"}
                      </p>
                    </div>

                    <button
                      onClick={() => handleApplyRecurringToMonth(item)}
                      className="rounded-lg bg-cyan-400 px-3 py-2 text-sm font-medium text-slate-950"
                    >
                      Adicionar ao mês
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-4 text-xl font-semibold">
              Adicionar despesas recorrentes
            </h2>

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
                        {formatCurrency(Number(item.amount), hideValues)} • {item.category || "Outros"}
                      </p>
                    </div>

                    <button
                      onClick={() => handleApplyRecurringToMonth(item)}
                      className="rounded-lg bg-cyan-400 px-3 py-2 text-sm font-medium text-slate-950"
                    >
                      Adicionar ao mês
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
                        {formatCurrency(Number(item.amount), hideValues)} • {item.category || "Outros"}
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
    const totalSubscriptions = subscriptions.reduce((t, s) => t + Number(s.amount), 0);

    async function handleCreateSubscription(e: React.FormEvent) {
      e.preventDefault();
      if (!subscriptionName.trim()) {
        openAlert("Informe o nome da assinatura.", "warning");
        return;
      }
      if (!subscriptionAmount || Number(subscriptionAmount) <= 0) {
        openAlert("Informe o valor da assinatura.", "warning");
        return;
      }
      const { error } = await supabase.from("subscriptions").insert({
        user_id: userId,
        name: subscriptionName.trim(),
        amount: Number(subscriptionAmount),
      });
      if (error) {
        openAlert("Erro ao criar assinatura.", "error");
        return;
      }
      setSubscriptionName("");
      setSubscriptionAmount("");
      await refreshSubscriptions();
    }

    async function handleDeleteSubscription(id: string) {
      const { error } = await supabase.from("subscriptions").delete().eq("id", id);
      if (error) {
        openAlert("Erro ao deletar assinatura.", "error");
        return;
      }
      await refreshSubscriptions();
    }

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

          {recurringExpenses.length === 0 ? (
            <p className="text-slate-400">Nenhuma despesa recorrente encontrada.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {recurringExpenses.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{item.description}</p>
                    <p className="text-xs text-slate-400">
                      {formatCurrency(Number(item.amount), hideValues)} • {item.category || "Outros"}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteRecurringEntry(item.id)}
                    className="rounded-lg border border-rose-500 px-2 py-1 text-xs text-rose-400"
                  >
                    X
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-xl font-semibold">Assinaturas mensais</h2>

          <form onSubmit={handleCreateSubscription} className="mb-6 grid gap-4 md:grid-cols-3">
            <input
              type="text"
              placeholder="Nome (ex: Netflix)"
              className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none"
              value={subscriptionName}
              onChange={(e) => setSubscriptionName(e.target.value)}
            />
            <input
              type="number"
              step="0.01"
              placeholder="Valor mensal"
              className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none"
              value={subscriptionAmount}
              onChange={(e) => setSubscriptionAmount(e.target.value)}
            />
            <button
              type="submit"
              className="rounded-xl bg-cyan-400 px-4 py-3 font-medium text-slate-950"
            >
              Adicionar
            </button>
          </form>

          {subscriptions.length === 0 ? (
            <p className="text-slate-400">Nenhuma assinatura cadastrada.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-3">
                {subscriptions.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{sub.name}</p>
                      <p className="text-xs text-slate-400">
                        {formatCurrency(Number(sub.amount), hideValues)}/mês
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteSubscription(sub.id)}
                      className="rounded-lg border border-rose-500 px-2 py-1 text-xs text-rose-400"
                    >
                      X
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-xl border border-slate-700 bg-slate-800 p-4">
                <p className="text-sm text-slate-400">Total em assinaturas</p>
                <p className="mt-1 text-xl font-bold text-rose-400">
                  {formatCurrency(totalSubscriptions, hideValues)}/mês
                </p>
              </div>
            </>
          )}
        </section>
      </div>
    );
  }

  function renderCategoriesView() {
    return (
      <div className="grid gap-6">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-xl font-semibold">Nova categoria</h2>

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

            <button
              type="submit"
              className="rounded-xl bg-white px-4 py-3 font-medium text-slate-900"
            >
              Adicionar
            </button>
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
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        className="rounded-lg border border-rose-500 px-3 py-1 text-xs text-rose-400"
                      >
                        Deletar
                      </button>
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
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        className="rounded-lg border border-rose-500 px-3 py-1 text-xs text-rose-400"
                      >
                        Deletar
                      </button>
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

  function renderInstallmentsView() {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    async function handleCreateInstallment(e: React.FormEvent) {
      e.preventDefault();
      if (!installmentName.trim()) {
        openAlert("Informe o nome do parcelamento.", "warning");
        return;
      }
      if (!installmentTotal || Number(installmentTotal) <= 0) {
        openAlert("Informe o valor total.", "warning");
        return;
      }
      if (!installmentCount || Number(installmentCount) < 1) {
        openAlert("Informe a quantidade de parcelas.", "warning");
        return;
      }

      const total = Number(installmentTotal);
      const count = Number(installmentCount);
      const perInstallment = Math.round((total / count) * 100) / 100;

      const { error } = await supabase.from("installments").insert({
        user_id: userId,
        name: installmentName.trim(),
        description: installmentDescription.trim() || null,
        total_amount: total,
        installment_amount: perInstallment,
        total_installments: count,
        card_last_digits: installmentCard.trim() || null,
        start_month: currentMonth,
        start_year: currentYear,
      });

      if (error) {
        openAlert("Erro ao criar parcelamento.", "error");
        return;
      }

      setInstallmentName("");
      setInstallmentDescription("");
      setInstallmentTotal("");
      setInstallmentCount("");
      setInstallmentCard("");
      await refreshInstallments();
    }

    async function handleDeleteInstallment(id: string) {
      const { error } = await supabase.from("installments").delete().eq("id", id);
      if (error) {
        openAlert("Erro ao deletar parcelamento.", "error");
        return;
      }
      await refreshInstallments();
    }

    function getInstallmentStatus(item: Installment) {
      let elapsed = (currentYear - item.start_year) * 12 + (currentMonth - item.start_month) + 1;
      if (elapsed < 1) elapsed = 1;
      const paid = Math.min(elapsed, item.total_installments);
      const remaining = item.total_installments - paid;
      return { paid, remaining, elapsed };
    }

    function getInstallmentMonths(item: Installment) {
      const months: { month: number; year: number; index: number }[] = [];
      let m = item.start_month;
      let y = item.start_year;
      for (let i = 0; i < item.total_installments; i++) {
        months.push({ month: m, year: y, index: i + 1 });
        m++;
        if (m > 12) {
          m = 1;
          y++;
        }
      }
      return months;
    }

    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

    return (
      <div className="grid gap-6">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-xl font-semibold">Novo parcelamento</h2>
          <form onSubmit={handleCreateInstallment} className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <input
                type="text"
                placeholder="Nome (ex: Notebook)"
                className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none"
                value={installmentName}
                onChange={(e) => setInstallmentName(e.target.value)}
              />
              <input
                type="text"
                placeholder="Descrição (opcional)"
                className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none"
                value={installmentDescription}
                onChange={(e) => setInstallmentDescription(e.target.value)}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <input
                type="number"
                step="0.01"
                placeholder="Valor total"
                className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none"
                value={installmentTotal}
                onChange={(e) => setInstallmentTotal(e.target.value)}
              />
              <input
                type="number"
                min="1"
                placeholder="Qtd. de parcelas"
                className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none"
                value={installmentCount}
                onChange={(e) => setInstallmentCount(e.target.value)}
              />
              <input
                type="text"
                placeholder="Final do cartão (ex: 1234)"
                maxLength={4}
                className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none"
                value={installmentCard}
                onChange={(e) => setInstallmentCard(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-xl bg-white px-4 py-3 font-medium text-slate-900 md:w-auto md:justify-self-start"
            >
              Criar parcelamento
            </button>
          </form>
        </section>

        {installments.length === 0 ? (
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-slate-400">Nenhum parcelamento cadastrado.</p>
          </section>
        ) : (
          <section className="grid gap-4">
            {installments.map((item) => {
              const { paid, remaining } = getInstallmentStatus(item);
              const progress = (paid / item.total_installments) * 100;
              const installmentMonths = getInstallmentMonths(item);
              const isComplete = paid >= item.total_installments;

              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{item.name}</h3>
                      {item.description && (
                        <p className="text-sm text-slate-400">{item.description}</p>
                      )}
                      <p className="mt-1 text-sm text-slate-400">
                        {item.total_installments}x de {formatCurrency(item.installment_amount, hideValues)}
                        {item.card_last_digits && ` • Cartão ****${item.card_last_digits}`}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Total: {formatCurrency(item.total_amount, hideValues)}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${isComplete ? "bg-emerald-500/20 text-emerald-300" : "bg-sky-500/20 text-sky-300"}`}>
                        {isComplete ? "Quitado" : `${paid}/${item.total_installments} pagas`}
                      </span>
                      <button
                        onClick={() => handleDeleteInstallment(item.id)}
                        className="rounded-lg border border-rose-500 px-3 py-2 text-sm text-rose-400"
                      >
                        Deletar
                      </button>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{paid} de {item.total_installments} parcelas</span>
                      <span>{remaining > 0 ? `Faltam ${remaining}` : "Completo"}</span>
                    </div>
                    <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className={`h-full rounded-full transition-all ${isComplete ? "bg-emerald-400" : "bg-cyan-400"}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {installmentMonths.map((im) => {
                      const isPaid = im.index <= paid;
                      const isCurrent = im.month === currentMonth && im.year === currentYear;
                      return (
                        <span
                          key={`${im.year}-${im.month}`}
                          className={`rounded-lg px-2 py-1 text-xs ${
                            isCurrent
                              ? "border border-cyan-400 bg-cyan-400/20 text-cyan-300"
                              : isPaid
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {monthNames[im.month - 1]}/{im.year} - {im.index}ª
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </section>
        )}
      </div>
    );
  }

  function renderCalendarView() {
    const daysInMonth = 31;
    const eventsByDay: Record<number, CalendarEvent[]> = {};
    calendarEvents.forEach((ev) => {
      if (!eventsByDay[ev.day_of_month]) eventsByDay[ev.day_of_month] = [];
      eventsByDay[ev.day_of_month].push(ev);
    });

    async function handleCreateCalendarEvent(e: React.FormEvent) {
      e.preventDefault();
      const day = Number(calendarDay);
      if (!day || day < 1 || day > 31) {
        openAlert("Informe um dia válido (1-31).", "warning");
        return;
      }
      if (!calendarDescription.trim()) {
        openAlert("Informe a descrição.", "warning");
        return;
      }
      const { error } = await supabase.from("calendar_events").insert({
        user_id: userId,
        day_of_month: day,
        description: calendarDescription.trim(),
        type: calendarType,
        amount: calendarAmount ? Number(calendarAmount) : null,
      });
      if (error) {
        openAlert("Erro ao criar evento.", "error");
        return;
      }
      setCalendarDay("");
      setCalendarDescription("");
      setCalendarAmount("");
      await refreshCalendarEvents();
    }

    async function handleDeleteCalendarEvent(id: string) {
      const { error } = await supabase.from("calendar_events").delete().eq("id", id);
      if (error) {
        openAlert("Erro ao deletar evento.", "error");
        return;
      }
      await refreshCalendarEvents();
    }

    async function handleUpdateCalendarEvent(id: string) {
      const day = Number(editCalendarDay);
      if (!day || day < 1 || day > 31) {
        openAlert("Informe um dia válido (1-31).", "warning");
        return;
      }
      if (!editCalendarDescription.trim()) {
        openAlert("Informe a descrição.", "warning");
        return;
      }
      const { error } = await supabase
        .from("calendar_events")
        .update({
          day_of_month: day,
          description: editCalendarDescription.trim(),
          type: editCalendarType,
          amount: editCalendarAmount ? Number(editCalendarAmount) : null,
        })
        .eq("id", id);
      if (error) {
        openAlert("Erro ao atualizar evento.", "error");
        return;
      }
      setEditingCalendarId(null);
      await refreshCalendarEvents();
    }

    return (
      <div className="grid gap-6">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-xl font-semibold">Novo evento fixo</h2>
          <form onSubmit={handleCreateCalendarEvent} className="grid gap-4 md:grid-cols-5">
            <input
              type="number"
              min="1"
              max="31"
              placeholder="Dia"
              className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none"
              value={calendarDay}
              onChange={(e) => setCalendarDay(e.target.value)}
            />
            <input
              type="text"
              placeholder="Descrição (ex: Aluguel)"
              className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none"
              value={calendarDescription}
              onChange={(e) => setCalendarDescription(e.target.value)}
            />
            <input
              type="number"
              step="0.01"
              placeholder="Valor (opcional)"
              className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none"
              value={calendarAmount}
              onChange={(e) => setCalendarAmount(e.target.value)}
            />
            <select
              className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none"
              value={calendarType}
              onChange={(e) => setCalendarType(e.target.value as "income" | "expense")}
            >
              <option value="expense">Despesa</option>
              <option value="income">Receita</option>
            </select>
            <button
              type="submit"
              className="rounded-xl bg-white px-4 py-3 font-medium text-slate-900"
            >
              Adicionar
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-xl font-semibold">Calendário mensal</h2>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const dayEvents = eventsByDay[day] || [];
              const hasExpense = dayEvents.some((ev) => ev.type === "expense");
              const hasIncome = dayEvents.some((ev) => ev.type === "income");

              return (
                <div
                  key={day}
                  className={`relative flex min-h-[80px] flex-col rounded-xl border p-2 ${
                    dayEvents.length > 0
                      ? "border-cyan-400/40 bg-slate-800"
                      : "border-slate-800 bg-slate-950"
                  }`}
                >
                  <span className="text-xs font-semibold text-slate-400">{day}</span>
                  {dayEvents.length > 0 && (
                    <div className="mt-1 flex flex-col gap-1">
                      {dayEvents.map((ev) => (
                        <div
                          key={ev.id}
                          className={`group relative rounded px-1 py-0.5 text-[10px] leading-tight ${
                            ev.type === "income"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-rose-500/20 text-rose-300"
                          }`}
                        >
                          <span className="block truncate">{ev.description}</span>
                          <button
                            onClick={() => handleDeleteCalendarEvent(ev.id)}
                            className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-slate-900 text-[8px] text-slate-300 group-hover:flex"
                            aria-label={`Deletar ${ev.description}`}
                          >
                            X
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {hasExpense && hasIncome && (
                    <div className="absolute bottom-1 right-1 flex gap-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {calendarEvents.length > 0 && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-4 text-xl font-semibold">Todos os eventos</h2>
            <div className="grid gap-3">
              {calendarEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="rounded-xl border border-slate-800 bg-slate-950 p-4"
                >
                  {editingCalendarId === ev.id ? (
                    <div className="grid gap-3">
                      <div className="grid gap-3 md:grid-cols-4">
                        <input
                          type="number"
                          min="1"
                          max="31"
                          placeholder="Dia"
                          className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-white outline-none"
                          value={editCalendarDay}
                          onChange={(e) => setEditCalendarDay(e.target.value)}
                        />
                        <input
                          type="text"
                          placeholder="Descrição"
                          className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-white outline-none"
                          value={editCalendarDescription}
                          onChange={(e) => setEditCalendarDescription(e.target.value)}
                        />
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Valor"
                          className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-white outline-none"
                          value={editCalendarAmount}
                          onChange={(e) => setEditCalendarAmount(e.target.value)}
                        />
                        <select
                          className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-white outline-none"
                          value={editCalendarType}
                          onChange={(e) => setEditCalendarType(e.target.value as "income" | "expense")}
                        >
                          <option value="expense">Despesa</option>
                          <option value="income">Receita</option>
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateCalendarEvent(ev.id)}
                          className="rounded-lg border border-emerald-500 px-3 py-2 text-sm text-emerald-400"
                        >
                          Salvar
                        </button>
                        <button
                          onClick={() => setEditingCalendarId(null)}
                          className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-400"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-white">
                          Dia {ev.day_of_month} — {ev.description}
                        </p>
                        <p className="text-sm text-slate-400">
                          {ev.type === "income" ? "Receita" : "Despesa"}
                          {ev.amount ? ` • ${formatCurrency(ev.amount, hideValues)}` : ""}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingCalendarId(ev.id);
                            setEditCalendarDay(String(ev.day_of_month));
                            setEditCalendarDescription(ev.description);
                            setEditCalendarType(ev.type);
                            setEditCalendarAmount(ev.amount ? String(ev.amount) : "");
                          }}
                          className="rounded-lg border border-sky-500 px-3 py-2 text-sm text-sky-400"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteCalendarEvent(ev.id)}
                          className="rounded-lg border border-rose-500 px-3 py-2 text-sm text-rose-400"
                        >
                          Deletar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
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

  const viewTitleMap: Record<string, string> = {
    home: "Inicio",
    account: "Minha conta",
    categories: "Categorias",
    "create-month": "Criar mês",
    dashboard: "Selecionar mês",
    "recurring-incomes": "Receitas recorrentes",
    "recurring-expenses": "Despesas recorrentes",
    months: "Meses cadastrados",
    calendar: "Calendário financeiro",
    installments: "Parcelamentos",
  };

  const viewTitle = viewTitleMap[currentView] || "Dashboard";

  return (
    <>
      <AppShell title={viewTitle}>
        {currentView === "home" && renderHomeView()}
        {currentView === "account" && renderAccountView()}
        {currentView === "categories" && renderCategoriesView()}
        {currentView === "create-month" && renderCreateMonthView()}
        {currentView === "dashboard" && renderDashboardHome()}
        {currentView === "recurring-incomes" && renderRecurringIncomesView()}
        {currentView === "recurring-expenses" && renderRecurringExpensesView()}
        {currentView === "months" && renderMonthsView()}
        {currentView === "calendar" && renderCalendarView()}
        {currentView === "installments" && renderInstallmentsView()}
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

export default function Dashboard() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
          <p>Carregando...</p>
        </main>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

export default function Dashboard() {
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
  ]);

  useEffect(() => {
    if (!selectedMonthId) {
      setIncomes([]);
      setExpenses([]);
      return;
    }

    refreshEntries(selectedMonthId);
  }, [selectedMonthId, refreshEntries]);

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
      openAlert("Preencha nome, mes e ano.", "warning");
      return;
    }

    if (!userId) {
      openAlert("Usuário não encontrado.", "error");
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

  const balance = useMemo(() => totalIncomes - totalExpenses, [totalIncomes, totalExpenses]);

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
    const selectedMonth = months.find((item) => item.id === selectedMonthId);
    const monthLabel = selectedMonth?.name || "Nenhum mês cadastrado";
    const hideValues = preferences.hideValues;
    const tooltipFormatter = (value: number) => formatCurrency(value, hideValues);
    const pieLabel = ({ name, value }: PieLabelRenderProps) => {
      const safeName = name || "";
      const safeValue = typeof value === "number" ? value : 0;
      return hideValues ? safeName : `${safeName}: ${formatCurrency(safeValue, false)}`;
    };

    return (
      <div className="grid gap-6">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-slate-400">Inicio</p>
              <h2 className="text-xl font-semibold">Dashboard do mês atual</h2>
              <p className="mt-1 text-sm text-slate-400">Mês em foco: {monthLabel}</p>
            </div>

            <div className="w-full md:w-72">
              <label className="text-sm text-slate-400">Mês do dashboard</label>
              <select
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none"
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
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h2 className="text-xl font-semibold">Despesas por categoria</h2>
              <select
                className="rounded-xl border border-slate-700 bg-slate-950 p-2 text-sm text-white outline-none"
                value={categoryMonthFilterId}
                onChange={(e) => setCategoryMonthFilterId(e.target.value)}
              >
                <option value="">Todos os meses</option>
                {sortedMonthsDesc.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4 h-80">
              {categoryChartData.length === 0 ? (
                <p className="text-sm text-slate-400">
                  Nenhuma despesa encontrada para o filtro selecionado.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryChartData}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={100}
                      label={pieLabel}
                    >
                      {categoryChartData.map((_, index) => (
                        <Cell
                          key={index}
                          fill={chartColors[index % chartColors.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => tooltipFormatter(Number(value))} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h2 className="text-xl font-semibold">Comparativo dos meses</h2>
              <select
                className="rounded-xl border border-slate-700 bg-slate-950 p-2 text-sm text-white outline-none"
                value={comparisonMonthId}
                onChange={(e) => setComparisonMonthId(e.target.value)}
              >
                <option value="">Selecione um mês</option>
                {sortedMonthsDesc.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4 h-80">
              {monthlyTotals.length === 0 ? (
                <p className="text-sm text-slate-400">
                  Nenhum mês encontrado para comparar.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyTotals}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" stroke="#cbd5e1" />
                    <YAxis stroke="#cbd5e1" />
                    <Tooltip formatter={(value) => tooltipFormatter(Number(value))} />
                    <Legend />
                    <Bar dataKey="receitas" radius={[8, 8, 0, 0]}>
                      {monthlyTotals.map((entry) => (
                        <Cell
                          key={`income-${entry.id}`}
                          fill={entry.isFocus ? "#34d399" : "#14532d"}
                        />
                      ))}
                    </Bar>
                    <Bar dataKey="despesas" radius={[8, 8, 0, 0]}>
                      {monthlyTotals.map((entry) => (
                        <Cell
                          key={`expense-${entry.id}`}
                          fill={entry.isFocus ? "#f43f5e" : "#4c0519"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Receita anual ({currentYear})</p>
            <h3 className="mt-2 text-2xl font-bold text-emerald-400">
              {formatCurrency(annualIncome, hideValues)}
            </h3>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Despesa anual ({currentYear})</p>
            <h3 className="mt-2 text-2xl font-bold text-rose-400">
              {formatCurrency(annualExpenses, hideValues)}
            </h3>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Receita do mês</p>
            <h3 className="mt-2 text-2xl font-bold text-emerald-400">
              {formatCurrency(totalIncomes, hideValues)}
            </h3>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Despesa do mês</p>
            <h3 className="mt-2 text-2xl font-bold text-rose-400">
              {formatCurrency(totalExpenses, hideValues)}
            </h3>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Saldo do mês</p>
            <h3
              className={`mt-2 text-2xl font-bold ${
                balance >= 0 ? "text-cyan-400" : "text-rose-400"
              }`}
            >
              {formatCurrency(balance, hideValues)}
            </h3>
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
            {sortedMonthsDesc.map((item) => (
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
                balance >= 0 ? "text-cyan-400" : "text-rose-400"
              }`}
            >
              {formatCurrency(balance, hideValues)}
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
                    data={currentMonthCategoryData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={100}
                    label={pieLabel}
                  >
                    {currentMonthCategoryData.map((_, index) => (
                      <Cell
                        key={index}
                        fill={chartColors[index % chartColors.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => tooltipFormatter(Number(value))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-4 text-xl font-semibold">Comparativo dos meses</h2>

            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTotals}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#cbd5e1" />
                  <YAxis stroke="#cbd5e1" />
                  <Tooltip formatter={(value) => tooltipFormatter(Number(value))} />
                  <Legend />
                  <Bar dataKey="receitas" radius={[8, 8, 0, 0]}>
                    {monthlyTotals.map((entry) => (
                      <Cell
                        key={`income-dashboard-${entry.id}`}
                        fill={entry.isFocus ? "#34d399" : "#14532d"}
                      />
                    ))}
                  </Bar>
                  <Bar dataKey="despesas" radius={[8, 8, 0, 0]}>
                    {monthlyTotals.map((entry) => (
                      <Cell
                        key={`expense-dashboard-${entry.id}`}
                        fill={entry.isFocus ? "#f43f5e" : "#4c0519"}
                      />
                    ))}
                  </Bar>
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
                        {formatCurrency(Number(item.amount), hideValues)}
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
                        {item.category} • {formatCurrency(Number(item.amount), hideValues)}
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
              {formatCurrency(0, hideValues)}
            </h3>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Despesas do novo mês</p>
            <h3 className="mt-2 text-2xl font-bold text-rose-400">
              {formatCurrency(0, hideValues)}
            </h3>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Saldo do novo mês</p>
            <h3 className="mt-2 text-2xl font-bold text-cyan-400">
              {formatCurrency(0, hideValues)}
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

  const viewTitleMap: Record<string, string> = {
    home: "Inicio",
    account: "Minha conta",
    categories: "Categorias",
    "create-month": "Criar mês",
    dashboard: "Selecionar mês",
    "recurring-incomes": "Receitas recorrentes",
    "recurring-expenses": "Despesas recorrentes",
    months: "Meses cadastrados",
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
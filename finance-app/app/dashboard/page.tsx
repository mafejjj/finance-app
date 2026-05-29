"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CenterModal } from "@/components/center-modal";
import { usePreferences } from "@/components/preferences-provider";
import { formatCurrency } from "@/lib/formatters";
import { supabase } from "@/lib/supabase";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/constants";
import { CategoryType, Expense, Income, Month, RecurringEntry } from "@/types";
import {
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Legend,
  LabelList,
  PieChart,
  Pie
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
  const currentView = searchParams.get("view") || "home";

  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileName, setProfileName] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);

  const [months, setMonths] = useState<Month[]>([]);
  const [selectedMonthId, setSelectedMonthId] = useState("");
  const [comparisonMonthId, setComparisonMonthId] = useState("");
  const [categoryMonthFilterId, setCategoryMonthFilterId] = useState("");

  const [monthName, setMonthName] = useState("");
  const [monthNumber, setMonthNumber] = useState("");
  const [year, setYear] = useState("");

  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [allIncomes, setAllIncomes] = useState<Income[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [savingsGoalsCount, setSavingsGoalsCount] = useState(0);
  const [savingsGoals, setSavingsGoals] = useState<
    Array<{ id: string; name: string; target_amount: number | null }>
  >([]);
  const [savingsEntries, setSavingsEntries] = useState<
    Array<{
      id: string;
      goal_id: string;
      saved_amount: number;
      withdrawn_amount: number;
      earned_amount: number;
    }>
  >([]);

  const [incomeDescription, setIncomeDescription] = useState("");
  const [incomeAmount, setIncomeAmount] = useState("");
  const [incomeCategory, setIncomeCategory] = useState("Salário");

  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("Moradia");
  const [expenseDueDate, setExpenseDueDate] = useState("");
  const [expensePaymentMethod, setExpensePaymentMethod] = useState("PIX");

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

  const { preferences, updatePreferences } = usePreferences();

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

  const paymentMethods = [
    "Cartao de credito",
    "PIX",
    "Dinheiro",
    "Debito",
    "Outros",
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
        setProfileName(profileData.full_name || "");
      }

      const { data: monthsData } = await supabase
        .from("months")
        .select("*")
        .order("year", { ascending: false })
        .order("month", { ascending: false });

      if (monthsData) {
        setMonths(monthsData);

        if (monthsData.length > 0) {
          const now = new Date();
          const currentMonth = now.getMonth() + 1;
          const currentYear = now.getFullYear();
          const currentMonthEntry = monthsData.find(
            (item) => item.month === currentMonth && item.year === currentYear
          );
          const nextSelected = currentMonthEntry?.id || monthsData[0].id;

          setSelectedMonthId(nextSelected);
          setComparisonMonthId(nextSelected);
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
      await refreshAllEntries(user.id);
      await refreshSavingsGoalsCount(user.id);
      await refreshSavingsGoals(user.id);
      await refreshSavingsEntries(user.id);

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

  async function refreshAllEntries(userIdOverride?: string) {
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
  }

  async function refreshSavingsGoalsCount(userIdOverride?: string) {
    const targetUserId = userIdOverride || userId;

    if (!targetUserId) return;

    const { count } = await supabase
      .from("savings_goals")
      .select("id", { count: "exact", head: true })
      .eq("user_id", targetUserId);

    setSavingsGoalsCount(count || 0);
  }

  async function refreshSavingsGoals(userIdOverride?: string) {
    const targetUserId = userIdOverride || userId;

    if (!targetUserId) return;

    const { data } = await supabase
      .from("savings_goals")
      .select("id, name, target_amount")
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: false });

    if (data) setSavingsGoals(data as Array<{ id: string; name: string; target_amount: number | null }>);
  }

  async function refreshSavingsEntries(userIdOverride?: string) {
    const targetUserId = userIdOverride || userId;

    if (!targetUserId) return;

    const { data } = await supabase
      .from("savings_entries")
      .select("id, goal_id, saved_amount, withdrawn_amount, earned_amount")
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: false });

    if (data)
      setSavingsEntries(
        data as Array<{
          id: string;
          goal_id: string;
          saved_amount: number;
          withdrawn_amount: number;
          earned_amount: number;
        }>
      );
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
        setComparisonMonthId("");
        setIncomes([]);
        setExpenses([]);
        return;
      }

      const stillExists = data.some((item) => item.id === selectedMonthId);

      const nextSelected = stillExists ? selectedMonthId : data[0].id;
      const comparisonExists = data.some((item) => item.id === comparisonMonthId);

      if (!stillExists) {
        setSelectedMonthId(nextSelected);
      }

      if (!comparisonExists) {
        setComparisonMonthId(nextSelected);
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

  async function handleSaveProfile() {
    if (!userId) {
      openAlert("Usuário não encontrado.", "error");
      return;
    }

    setProfileSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: profileName.trim() })
      .eq("id", userId);

    setProfileSaving(false);

    if (error) {
      openAlert("Erro ao atualizar perfil.", "error");
      return;
    }

    setProfile((prev) =>
      prev ? { ...prev, full_name: profileName.trim() } : prev
    );
    openAlert("Perfil atualizado.", "success");
  }

  function getInitials(name?: string | null, fallbackEmail?: string | null) {
    const source = (name || fallbackEmail || "").trim();
    if (!source) return "U";

    const parts = source.split(/\s+/).filter(Boolean);
    const initials = parts.length === 1 ? parts[0][0] : parts[0][0] + parts[1][0];
    return initials.toUpperCase();
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
    await refreshAllEntries();
  }

  async function handleDeleteMonth(id: string) {
    const { error } = await supabase.from("months").delete().eq("id", id);

    if (error) {
      openAlert("Erro ao deletar mês.", "error");
      return;
    }

    await refreshMonths();
    await refreshAllEntries();
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

    setExpenseDescription("");
    setExpenseAmount("");
    setExpenseCategory("Moradia");

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

  const currentMonthCategoryData = useMemo(() => {
    const grouped: Record<string, number> = {};

    expenses.forEach((item) => {
      grouped[item.category] = (grouped[item.category] || 0) + Number(item.amount);
    });
    const total = Object.values(grouped).reduce((sum, value) => sum + value, 0);

    return Object.entries(grouped)
      .map(([name, value]) => ({
        name,
        value,
        percent: total ? (value / total) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  const sortedMonths = useMemo(() => {
    return [...months].sort((a, b) => {
      if (a.year === b.year) {
        return a.month - b.month;
      }
      return a.year - b.year;
    });
  }, [months]);

  const sortedMonthsDesc = useMemo(() => {
    return [...sortedMonths].reverse();
  }, [sortedMonths]);

  const categoryExpenseSource = useMemo(() => {
    if (!categoryMonthFilterId) return allExpenses;
    return allExpenses.filter((item) => item.month_id === categoryMonthFilterId);
  }, [allExpenses, categoryMonthFilterId]);

  const categoryChartData = useMemo(() => {
    const grouped: Record<string, number> = {};

    categoryExpenseSource.forEach((item) => {
      grouped[item.category] = (grouped[item.category] || 0) + Number(item.amount);
    });
    const total = Object.values(grouped).reduce((sum, value) => sum + value, 0);

    return Object.entries(grouped)
      .map(([name, value]) => ({
        name,
        value,
        percent: total ? (value / total) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [categoryExpenseSource]);

  const years = useMemo(() => {
    const uniqueYears = [...new Set(months.map((item) => item.year))];
    return uniqueYears.sort((a, b) => b - a);
  }, [months]);

  const filteredMonths = useMemo(() => {
    if (!monthsYearFilter) return months;
    return months.filter((item) => String(item.year) === monthsYearFilter);
  }, [months, monthsYearFilter]);

  const monthlyTotals = useMemo(() => {
    const totals = new Map<string, { income: number; expense: number }>();

    sortedMonths.forEach((month) => {
      totals.set(month.id, { income: 0, expense: 0 });
    });

    allIncomes.forEach((item) => {
      const current = totals.get(item.month_id) || { income: 0, expense: 0 };
      totals.set(item.month_id, {
        income: current.income + Number(item.amount),
        expense: current.expense,
      });
    });

    allExpenses.forEach((item) => {
      const current = totals.get(item.month_id) || { income: 0, expense: 0 };
      totals.set(item.month_id, {
        income: current.income,
        expense: current.expense + Number(item.amount),
      });
    });

    return sortedMonths.map((month) => {
      const total = totals.get(month.id) || { income: 0, expense: 0 };
      return {
        id: month.id,
        name: month.name,
        receitas: total.income,
        despesas: total.expense,
        isFocus: comparisonMonthId
          ? month.id === comparisonMonthId
          : month.id === selectedMonthId,
      };
    });
  }, [allExpenses, allIncomes, comparisonMonthId, selectedMonthId, sortedMonths]);

  const currentYear = new Date().getFullYear();
  const annualIncome = useMemo(() => {
    const monthIds = new Set(
      months.filter((item) => item.year === currentYear).map((item) => item.id)
    );
    return allIncomes
      .filter((item) => monthIds.has(item.month_id))
      .reduce((total, item) => total + Number(item.amount), 0);
  }, [allIncomes, currentYear, months]);

  const annualExpenses = useMemo(() => {
    const monthIds = new Set(
      months.filter((item) => item.year === currentYear).map((item) => item.id)
    );
    return allExpenses
      .filter((item) => monthIds.has(item.month_id))
      .reduce((total, item) => total + Number(item.amount), 0);
  }, [allExpenses, currentYear, months]);

  const monthlyTotalsMap = useMemo(() => {
    return new Map(monthlyTotals.map((item) => [item.id, item]));
  }, [monthlyTotals]);

  const previousMonthTotals = useMemo(() => {
    const selectedMonth = months.find((item) => item.id === selectedMonthId);

    if (!selectedMonth) return null;

    const previousMonth = selectedMonth.month === 1 ? 12 : selectedMonth.month - 1;
    const previousYear = selectedMonth.month === 1 ? selectedMonth.year - 1 : selectedMonth.year;
    const previousEntry = months.find(
      (item) => item.month === previousMonth && item.year === previousYear
    );

    if (!previousEntry) return null;

    return monthlyTotalsMap.get(previousEntry.id) || null;
  }, [months, monthlyTotalsMap, selectedMonthId]);

  const paymentMethodData = useMemo(() => {
    const grouped: Record<string, number> = {};

    expenses.forEach((item) => {
      const method = item.payment_method || "Outros";
      grouped[method] = (grouped[method] || 0) + Number(item.amount);
    });

    const total = Object.values(grouped).reduce((sum, value) => sum + value, 0);

    return Object.entries(grouped)
      .map(([name, value]) => ({
        name,
        value,
        percent: total ? (value / total) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  const upcomingExpenses = useMemo(() => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    return allExpenses
      .filter((item) => item.due_date)
      .map((item) => ({
        ...item,
        dueDateValue: new Date(item.due_date as string),
      }))
      .filter((item) => item.dueDateValue >= todayStart)
      .sort((a, b) => a.dueDateValue.getTime() - b.dueDateValue.getTime())
      .slice(0, 5);
  }, [allExpenses]);

  const savingsTotalsByGoal = useMemo(() => {
    const totals: Record<string, { balance: number }> = {};

    savingsGoals.forEach((goal) => {
      totals[goal.id] = { balance: 0 };
    });

    savingsEntries.forEach((entry) => {
      const current = totals[entry.goal_id] || { balance: 0 };
      const balance =
        current.balance + entry.saved_amount - entry.withdrawn_amount + entry.earned_amount;
      totals[entry.goal_id] = { balance };
    });

    return totals;
  }, [savingsEntries, savingsGoals]);

  const totalSaved = useMemo(() => {
    return Object.values(savingsTotalsByGoal).reduce(
      (sum, item) => sum + item.balance,
      0
    );
  }, [savingsTotalsByGoal]);

  const topSavingsGoal = useMemo(() => {
    const goalsWithTarget = savingsGoals.filter(
      (goal) => goal.target_amount && goal.target_amount > 0
    );

    if (goalsWithTarget.length === 0) return null;

    return goalsWithTarget
      .map((goal) => {
        const balance = savingsTotalsByGoal[goal.id]?.balance || 0;
        const percent = goal.target_amount
          ? (balance / goal.target_amount) * 100
          : 0;
        return { goal, balance, percent };
      })
      .sort((a, b) => b.percent - a.percent)[0];
  }, [savingsGoals, savingsTotalsByGoal]);

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
    const pieLabel = ({ name, value }: { name: string; value: number }) =>
      hideValues ? name : `${name}: ${formatCurrency(value, false)}`;

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
    const pieLabel = ({ name, value }: { name: string; value: number }) =>
      hideValues ? name : `${name}: ${formatCurrency(value, false)}`;

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
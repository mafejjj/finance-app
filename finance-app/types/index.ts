export type Category = string;

export type CategoryType = "income" | "expense";

export interface Month {
  id: string;
  name: string;
  month: number;
  year: number;
  user_id: string;
  created_at?: string;
}

export interface Income {
  id: string;
  description: string;
  amount: number;
  category?: Category | null;
  month_id: string;
  user_id: string;
  created_at?: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: Category;
  month_id: string;
  user_id: string;
  due_date?: string | null;
  payment_method?: string | null;
  created_at?: string;
}

export interface RecurringEntry {
  id: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category?: Category | null;
  user_id: string;
  created_at?: string;
}
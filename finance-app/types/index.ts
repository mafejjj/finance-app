export type Category =
  | "Moradia"
  | "Alimentação"
  | "Transporte"
  | "Saúde"
  | "Lazer"
  | "Educação"
  | "Outros";

export interface Month {
  id: string;
  name: string;
  month: number;
  year: number;
  user_id: string;
}

export interface Income {
  id: string;
  description: string;
  amount: number;
  month_id: string;
  user_id: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: Category;
  month_id: string;
  user_id: string;
}
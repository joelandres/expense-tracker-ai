import { Expense } from '@/types/expense';

const STORAGE_KEY = 'expense-tracker-expenses';

export function getStoredExpenses(): Expense[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as Expense[];
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return [];
  }
}

export function saveExpenses(expenses: Expense[]): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
}

export function addExpense(expense: Expense): Expense[] {
  const expenses = getStoredExpenses();
  const updatedExpenses = [expense, ...expenses];
  saveExpenses(updatedExpenses);
  return updatedExpenses;
}

export function updateExpense(updatedExpense: Expense): Expense[] {
  const expenses = getStoredExpenses();
  const updatedExpenses = expenses.map((expense) =>
    expense.id === updatedExpense.id ? updatedExpense : expense
  );
  saveExpenses(updatedExpenses);
  return updatedExpenses;
}

export function deleteExpense(id: string): Expense[] {
  const expenses = getStoredExpenses();
  const updatedExpenses = expenses.filter((expense) => expense.id !== id);
  saveExpenses(updatedExpenses);
  return updatedExpenses;
}

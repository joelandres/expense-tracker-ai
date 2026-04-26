import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { Expense, Category, CATEGORY_COLORS } from '@/types/expense';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function formatDate(dateString: string): string {
  return format(parseISO(dateString), 'MMM d, yyyy');
}

export function formatDateShort(dateString: string): string {
  return format(parseISO(dateString), 'MMM d');
}

export function getTodayISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function getCurrentMonthRange(): { start: string; end: string } {
  const now = new Date();
  return {
    start: format(startOfMonth(now), 'yyyy-MM-dd'),
    end: format(endOfMonth(now), 'yyyy-MM-dd'),
  };
}

export function getLastMonthRange(): { start: string; end: string } {
  const lastMonth = subMonths(new Date(), 1);
  return {
    start: format(startOfMonth(lastMonth), 'yyyy-MM-dd'),
    end: format(endOfMonth(lastMonth), 'yyyy-MM-dd'),
  };
}

export function filterExpensesByDateRange(
  expenses: Expense[],
  startDate: string | null,
  endDate: string | null
): Expense[] {
  if (!startDate && !endDate) return expenses;

  return expenses.filter((expense) => {
    const expenseDate = parseISO(expense.date);
    if (startDate && endDate) {
      return isWithinInterval(expenseDate, {
        start: parseISO(startDate),
        end: parseISO(endDate),
      });
    }
    if (startDate) {
      return expenseDate >= parseISO(startDate);
    }
    if (endDate) {
      return expenseDate <= parseISO(endDate);
    }
    return true;
  });
}

export function filterExpensesByCategory(
  expenses: Expense[],
  category: Category | 'All'
): Expense[] {
  if (category === 'All') return expenses;
  return expenses.filter((expense) => expense.category === category);
}

export function filterExpensesBySearch(
  expenses: Expense[],
  search: string
): Expense[] {
  if (!search.trim()) return expenses;
  const lowerSearch = search.toLowerCase();
  return expenses.filter(
    (expense) =>
      expense.description.toLowerCase().includes(lowerSearch) ||
      expense.category.toLowerCase().includes(lowerSearch)
  );
}

export function calculateTotalExpenses(expenses: Expense[]): number {
  return expenses.reduce((sum, expense) => sum + expense.amount, 0);
}

export function calculateExpensesByCategory(
  expenses: Expense[]
): { category: Category; amount: number; color: string }[] {
  const categoryTotals = expenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {} as Record<Category, number>);

  return Object.entries(categoryTotals)
    .map(([category, amount]) => ({
      category: category as Category,
      amount,
      color: CATEGORY_COLORS[category as Category],
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function getMonthlyExpenses(expenses: Expense[]): { month: string; amount: number }[] {
  const monthlyTotals: Record<string, number> = {};

  expenses.forEach((expense) => {
    const monthKey = format(parseISO(expense.date), 'MMM yyyy');
    monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + expense.amount;
  });

  return Object.entries(monthlyTotals)
    .map(([month, amount]) => ({ month, amount }))
    .sort((a, b) => {
      const dateA = new Date(a.month);
      const dateB = new Date(b.month);
      return dateA.getTime() - dateB.getTime();
    })
    .slice(-6); // Last 6 months
}

export function getDailyExpenses(expenses: Expense[], days: number = 7): { date: string; amount: number }[] {
  const dailyTotals: Record<string, number> = {};
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateKey = format(date, 'yyyy-MM-dd');
    dailyTotals[dateKey] = 0;
  }

  expenses.forEach((expense) => {
    if (dailyTotals.hasOwnProperty(expense.date)) {
      dailyTotals[expense.date] += expense.amount;
    }
  });

  return Object.entries(dailyTotals).map(([date, amount]) => ({
    date: format(parseISO(date), 'EEE'),
    amount,
  }));
}

export function exportToCSV(expenses: Expense[]): void {
  const headers = ['Date', 'Category', 'Description', 'Amount'];
  const rows = expenses.map((expense) => [
    formatDate(expense.date),
    expense.category,
    `"${expense.description.replace(/"/g, '""')}"`,
    expense.amount.toFixed(2),
  ]);

  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `expenses_${format(new Date(), 'yyyy-MM-dd')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

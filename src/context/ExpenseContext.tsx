'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Expense, ExpenseFormData, ExpenseFilters, Category } from '@/types/expense';
import {
  getStoredExpenses,
  addExpense as addToStorage,
  updateExpense as updateInStorage,
  deleteExpense as deleteFromStorage,
} from '@/lib/storage';
import {
  filterExpensesByDateRange,
  filterExpensesByCategory,
  filterExpensesBySearch,
  calculateTotalExpenses,
  calculateExpensesByCategory,
  getCurrentMonthRange,
} from '@/lib/utils';

interface ExpenseContextType {
  expenses: Expense[];
  filteredExpenses: Expense[];
  filters: ExpenseFilters;
  isLoading: boolean;
  totalExpenses: number;
  monthlyExpenses: number;
  categoryBreakdown: { category: Category; amount: number; color: string }[];
  addExpense: (data: ExpenseFormData) => void;
  updateExpense: (id: string, data: ExpenseFormData) => void;
  deleteExpense: (id: string) => void;
  setFilters: (filters: Partial<ExpenseFilters>) => void;
  clearFilters: () => void;
  getExpenseById: (id: string) => Expense | undefined;
}

const defaultFilters: ExpenseFilters = {
  search: '',
  category: 'All',
  dateRange: { startDate: null, endDate: null },
};

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

export function ExpenseProvider({ children }: { children: React.ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filters, setFiltersState] = useState<ExpenseFilters>(defaultFilters);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = getStoredExpenses();
    setExpenses(stored);
    setIsLoading(false);
  }, []);

  const filteredExpenses = React.useMemo(() => {
    let result = [...expenses];
    result = filterExpensesBySearch(result, filters.search);
    result = filterExpensesByCategory(result, filters.category);
    result = filterExpensesByDateRange(
      result,
      filters.dateRange.startDate,
      filters.dateRange.endDate
    );
    return result.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [expenses, filters]);

  const totalExpenses = React.useMemo(
    () => calculateTotalExpenses(expenses),
    [expenses]
  );

  const monthlyExpenses = React.useMemo(() => {
    const { start, end } = getCurrentMonthRange();
    const monthExpenses = filterExpensesByDateRange(expenses, start, end);
    return calculateTotalExpenses(monthExpenses);
  }, [expenses]);

  const categoryBreakdown = React.useMemo(
    () => calculateExpensesByCategory(expenses),
    [expenses]
  );

  const addExpense = useCallback((data: ExpenseFormData) => {
    const newExpense: Expense = {
      id: uuidv4(),
      amount: parseFloat(data.amount),
      category: data.category,
      description: data.description,
      date: data.date,
      createdAt: new Date().toISOString(),
    };
    const updated = addToStorage(newExpense);
    setExpenses(updated);
  }, []);

  const updateExpense = useCallback((id: string, data: ExpenseFormData) => {
    setExpenses((current) => {
      const existing = current.find((e) => e.id === id);
      if (!existing) return current;

      const updatedExpense: Expense = {
        ...existing,
        amount: parseFloat(data.amount),
        category: data.category,
        description: data.description,
        date: data.date,
      };
      return updateInStorage(updatedExpense);
    });
  }, []);

  const deleteExpense = useCallback((id: string) => {
    const updated = deleteFromStorage(id);
    setExpenses(updated);
  }, []);

  const setFilters = useCallback((newFilters: Partial<ExpenseFilters>) => {
    setFiltersState((current) => ({ ...current, ...newFilters }));
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersState(defaultFilters);
  }, []);

  const getExpenseById = useCallback(
    (id: string) => expenses.find((e) => e.id === id),
    [expenses]
  );

  return (
    <ExpenseContext.Provider
      value={{
        expenses,
        filteredExpenses,
        filters,
        isLoading,
        totalExpenses,
        monthlyExpenses,
        categoryBreakdown,
        addExpense,
        updateExpense,
        deleteExpense,
        setFilters,
        clearFilters,
        getExpenseById,
      }}
    >
      {children}
    </ExpenseContext.Provider>
  );
}

export function useExpenses() {
  const context = useContext(ExpenseContext);
  if (context === undefined) {
    throw new Error('useExpenses must be used within an ExpenseProvider');
  }
  return context;
}

'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useExpenses } from '@/context/ExpenseContext';
import { CATEGORY_ICONS } from '@/types/expense';
import { formatCurrency, formatDate } from '@/lib/utils';

export function RecentExpenses() {
  const { expenses } = useExpenses();
  const recentExpenses = expenses.slice(0, 5);

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Expenses</CardTitle>
        {expenses.length > 5 && (
          <Link
            href="/expenses"
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            View all
          </Link>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {recentExpenses.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            <svg
              className="mx-auto h-10 w-10 text-gray-300 mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <p className="text-sm">No expenses yet</p>
            <Link
              href="/add"
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium mt-2 inline-block"
            >
              Add your first expense
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentExpenses.map((expense) => (
              <div
                key={expense.id}
                className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm">
                    {CATEGORY_ICONS[expense.category]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 truncate max-w-[150px] sm:max-w-none">
                      {expense.description}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(expense.date)}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {formatCurrency(expense.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

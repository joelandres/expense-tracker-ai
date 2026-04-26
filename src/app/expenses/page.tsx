'use client';

import Link from 'next/link';
import { ExpenseList } from '@/components/expenses/ExpenseList';
import { Button } from '@/components/ui/Button';

export default function ExpensesPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="text-gray-500 mt-1">
            View and manage all your expenses
          </p>
        </div>
        <Link href="/add">
          <Button>
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Expense
          </Button>
        </Link>
      </div>

      <ExpenseList />
    </div>
  );
}

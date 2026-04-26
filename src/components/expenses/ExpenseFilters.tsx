'use client';

import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { useExpenses } from '@/context/ExpenseContext';
import { CATEGORIES, Category } from '@/types/expense';

export function ExpenseFilters() {
  const { filters, setFilters, clearFilters } = useExpenses();

  const categoryOptions = [
    { value: 'All', label: 'All Categories' },
    ...CATEGORIES.map((cat) => ({ value: cat, label: cat })),
  ];

  const hasActiveFilters =
    filters.search ||
    filters.category !== 'All' ||
    filters.dateRange.startDate ||
    filters.dateRange.endDate;

  return (
    <Card>
      <CardContent className="py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2">
            <Input
              placeholder="Search expenses..."
              value={filters.search}
              onChange={(e) => setFilters({ search: e.target.value })}
              icon={
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              }
            />
          </div>

          <Select
            value={filters.category}
            onChange={(e) =>
              setFilters({ category: e.target.value as Category | 'All' })
            }
            options={categoryOptions}
          />

          <Input
            type="date"
            placeholder="Start date"
            value={filters.dateRange.startDate || ''}
            onChange={(e) =>
              setFilters({
                dateRange: { ...filters.dateRange, startDate: e.target.value || null },
              })
            }
          />

          <div className="flex gap-2">
            <Input
              type="date"
              placeholder="End date"
              value={filters.dateRange.endDate || ''}
              onChange={(e) =>
                setFilters({
                  dateRange: { ...filters.dateRange, endDate: e.target.value || null },
                })
              }
              className="flex-1"
            />
            {hasActiveFilters && (
              <Button
                variant="ghost"
                onClick={clearFilters}
                className="shrink-0"
                title="Clear filters"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useExpenses } from '@/context/ExpenseContext';
import { getDailyExpenses } from '@/lib/utils';

export function SpendingChart() {
  const { expenses } = useExpenses();
  const dailyData = getDailyExpenses(expenses, 7);

  const formatYAxis = (value: number) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}k`;
    }
    return `$${value}`;
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Last 7 Days</CardTitle>
      </CardHeader>
      <CardContent>
        {dailyData.every((d) => d.amount === 0) ? (
          <div className="h-64 flex items-center justify-center text-gray-500">
            No spending data for the last 7 days
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={256}>
            <BarChart data={dailyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={formatYAxis}
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Spent']}
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
              />
              <Bar
                dataKey="amount"
                fill="#6366f1"
                radius={[4, 4, 0, 0]}
                maxBarSize={48}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

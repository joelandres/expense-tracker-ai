import { format, parseISO } from 'date-fns';
import { Expense, Category } from '@/types/expense';
import { filterExpensesByDateRange } from './utils';

export type ExportFormat = 'csv' | 'json' | 'pdf';

export function applyExportFilters(
  expenses: Expense[],
  startDate: string,
  endDate: string,
  categories: Set<Category>
): Expense[] {
  let result = [...expenses].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  if (startDate || endDate) {
    result = filterExpensesByDateRange(result, startDate || null, endDate || null);
  }

  if (categories.size > 0 && categories.size < 6) {
    result = result.filter((e) => categories.has(e.category));
  }

  return result;
}

export function downloadCSV(expenses: Expense[], filename: string): void {
  const headers = ['Date', 'Category', 'Description', 'Amount'];
  const rows = expenses.map((e) => [
    format(parseISO(e.date), 'yyyy-MM-dd'),
    e.category,
    `"${e.description.replace(/"/g, '""')}"`,
    e.amount.toFixed(2),
  ]);
  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  triggerDownload(csv, `${filename}.csv`, 'text/csv;charset=utf-8;');
}

export function downloadJSON(expenses: Expense[], filename: string): void {
  const data = {
    exportedAt: new Date().toISOString(),
    totalRecords: expenses.length,
    totalAmount: expenses.reduce((s, e) => s + e.amount, 0),
    expenses: expenses.map((e) => ({
      date: format(parseISO(e.date), 'yyyy-MM-dd'),
      category: e.category,
      description: e.description,
      amount: e.amount,
    })),
  };
  triggerDownload(JSON.stringify(data, null, 2), `${filename}.json`, 'application/json');
}

export function printPDF(expenses: Expense[], filename: string): void {
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const rows = expenses
    .map(
      (e) => `
    <tr>
      <td>${format(parseISO(e.date), 'yyyy-MM-dd')}</td>
      <td>${e.category}</td>
      <td>${e.description}</td>
      <td class="amount">$${e.amount.toFixed(2)}</td>
    </tr>`
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${filename}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, Arial, sans-serif; padding: 40px; color: #111827; }
    .header { margin-bottom: 28px; }
    h1 { font-size: 24px; font-weight: 700; color: #1f2937; }
    .meta { margin-top: 6px; font-size: 13px; color: #6b7280; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
    thead th { background: #4f46e5; color: #fff; padding: 11px 14px; text-align: left; font-weight: 600; }
    thead th.amount { text-align: right; }
    tbody td { padding: 9px 14px; border-bottom: 1px solid #e5e7eb; vertical-align: middle; }
    tbody tr:nth-child(even) td { background: #f9fafb; }
    td.amount { text-align: right; font-variant-numeric: tabular-nums; }
    tfoot td { padding: 11px 14px; font-weight: 700; font-size: 14px; border-top: 2px solid #4f46e5; }
    tfoot td.amount { text-align: right; }
    @media print { @page { margin: 20mm; } body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>Expense Report</h1>
    <p class="meta">Generated on ${new Date().toLocaleString()} &nbsp;&middot;&nbsp; ${expenses.length} record${expenses.length !== 1 ? 's' : ''}</p>
  </div>
  <table>
    <thead>
      <tr>
        <th>Date</th><th>Category</th><th>Description</th><th class="amount">Amount</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr>
        <td colspan="3">Total</td>
        <td class="amount">$${total.toFixed(2)}</td>
      </tr>
    </tfoot>
  </table>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  }
}

function triggerDownload(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

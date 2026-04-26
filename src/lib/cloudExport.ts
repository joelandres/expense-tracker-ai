import { format, addDays, addMonths } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { Expense } from '@/types/expense';
import { calculateExpensesByCategory, getMonthlyExpenses } from './utils';

// ── Types ──────────────────────────────────────────────────────────────────

export type CloudExportFormat = 'csv' | 'json' | 'pdf';
export type Frequency = 'daily' | 'weekly' | 'monthly';
export type ServiceId = 'google-sheets' | 'dropbox' | 'onedrive' | 'webhook';

export interface ExportTemplate {
  id: string;
  name: string;
  tagline: string;
  description: string;
  format: CloudExportFormat;
  tag: string;
  accent: 'violet' | 'sky' | 'emerald' | 'amber' | 'slate';
}

export interface ExportRecord {
  id: string;
  templateId: string;
  templateName: string;
  format: CloudExportFormat;
  destination: string;
  timestamp: string;
  recordCount: number;
  totalAmount: number;
}

export interface ScheduledExport {
  id: string;
  templateId: string;
  templateName: string;
  frequency: Frequency;
  destination: string;
  active: boolean;
  nextRun: string;
  createdAt: string;
  runCount: number;
}

export interface ConnectedService {
  id: ServiceId;
  name: string;
  description: string;
  connected: boolean;
  accountEmail?: string;
  lastSync?: string;
  folder?: string;
  webhookUrl?: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

export const EXPORT_TEMPLATES: ExportTemplate[] = [
  {
    id: 'tax-report',
    name: 'Tax Report',
    tagline: 'Deductions ready',
    description: 'Itemized expenses by category with totals. Formatted for accountants and tax filing.',
    format: 'pdf',
    tag: 'Annual',
    accent: 'violet',
  },
  {
    id: 'monthly-summary',
    name: 'Monthly Summary',
    tagline: 'Month-over-month',
    description: 'Spending trends across the past 6 months with highlights and period comparisons.',
    format: 'pdf',
    tag: 'Monthly',
    accent: 'sky',
  },
  {
    id: 'category-analysis',
    name: 'Category Analysis',
    tagline: 'Know your patterns',
    description: 'Percentage breakdown by category, averages, and spending velocity per group.',
    format: 'csv',
    tag: 'Analytics',
    accent: 'emerald',
  },
  {
    id: 'spending-digest',
    name: 'Spending Digest',
    tagline: 'At a glance',
    description: 'A concise, human-readable summary ideal for sharing with a financial advisor.',
    format: 'pdf',
    tag: 'Weekly',
    accent: 'amber',
  },
  {
    id: 'full-backup',
    name: 'Full Backup',
    tagline: 'Everything, everywhere',
    description: 'Complete raw export of all records for backup, migration, or data analysis.',
    format: 'json',
    tag: 'Backup',
    accent: 'slate',
  },
];

export const DEFAULT_SERVICES: ConnectedService[] = [
  {
    id: 'google-sheets',
    name: 'Google Sheets',
    description: 'Sync expenses automatically to a spreadsheet',
    connected: false,
  },
  {
    id: 'dropbox',
    name: 'Dropbox',
    description: 'Backup exports to your Dropbox folder automatically',
    connected: false,
  },
  {
    id: 'onedrive',
    name: 'OneDrive',
    description: 'Save exports to Microsoft OneDrive cloud storage',
    connected: false,
  },
  {
    id: 'webhook',
    name: 'Webhook',
    description: 'POST expense data to any REST endpoint on export',
    connected: false,
  },
];

// ── Storage ────────────────────────────────────────────────────────────────

const KEYS = {
  history: 'et-v3-history',
  schedules: 'et-v3-schedules',
  connections: 'et-v3-connections',
};

function safeGet<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function safeSet(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function getExportHistory(): ExportRecord[] {
  return safeGet<ExportRecord[]>(KEYS.history, []);
}

export function addExportRecord(record: Omit<ExportRecord, 'id'>): ExportRecord[] {
  const history = [{ ...record, id: uuidv4() }, ...getExportHistory()].slice(0, 50);
  safeSet(KEYS.history, history);
  return history;
}

export function clearExportHistory(): void {
  safeSet(KEYS.history, []);
}

export function getSchedules(): ScheduledExport[] {
  return safeGet<ScheduledExport[]>(KEYS.schedules, []);
}

export function createSchedule(
  templateId: string,
  templateName: string,
  frequency: Frequency,
  destination: string
): ScheduledExport[] {
  const schedules = [
    ...getSchedules(),
    {
      id: uuidv4(),
      templateId,
      templateName,
      frequency,
      destination,
      active: true,
      nextRun: computeNextRun(frequency),
      createdAt: new Date().toISOString(),
      runCount: 0,
    },
  ];
  safeSet(KEYS.schedules, schedules);
  return schedules;
}

export function toggleScheduleActive(id: string): ScheduledExport[] {
  const schedules = getSchedules().map((s) =>
    s.id === id ? { ...s, active: !s.active } : s
  );
  safeSet(KEYS.schedules, schedules);
  return schedules;
}

export function deleteSchedule(id: string): ScheduledExport[] {
  const schedules = getSchedules().filter((s) => s.id !== id);
  safeSet(KEYS.schedules, schedules);
  return schedules;
}

export function getConnections(): Record<ServiceId, ConnectedService> {
  const stored = safeGet<Partial<Record<ServiceId, ConnectedService>>>(KEYS.connections, {});
  const result = {} as Record<ServiceId, ConnectedService>;
  for (const svc of DEFAULT_SERVICES) {
    result[svc.id] = stored[svc.id] ?? { ...svc };
  }
  return result;
}

export function connectService(
  id: ServiceId,
  accountEmail: string,
  extras?: { folder?: string; webhookUrl?: string }
): Record<ServiceId, ConnectedService> {
  const connections = getConnections();
  connections[id] = {
    ...connections[id],
    connected: true,
    accountEmail,
    lastSync: new Date().toISOString(),
    ...extras,
  };
  safeSet(KEYS.connections, connections);
  return connections;
}

export function disconnectService(id: ServiceId): Record<ServiceId, ConnectedService> {
  const connections = getConnections();
  const original = DEFAULT_SERVICES.find((s) => s.id === id)!;
  connections[id] = { ...original };
  safeSet(KEYS.connections, connections);
  return connections;
}

export function computeNextRun(frequency: Frequency): string {
  const base =
    frequency === 'daily'
      ? addDays(new Date(), 1)
      : frequency === 'weekly'
      ? addDays(new Date(), 7)
      : addMonths(new Date(), 1);
  base.setHours(9, 0, 0, 0);
  return base.toISOString();
}

// ── Export execution ───────────────────────────────────────────────────────

export function runTemplateExport(template: ExportTemplate, expenses: Expense[]): void {
  const filename = `${template.id}_${format(new Date(), 'yyyy-MM-dd')}`;
  if (template.format === 'json') {
    exportJSON(expenses, filename);
  } else if (template.format === 'csv') {
    exportCSV(template, expenses, filename);
  } else {
    exportPDF(template, expenses, filename);
  }
}

function exportJSON(expenses: Expense[], filename: string): void {
  const payload = {
    exportedAt: new Date().toISOString(),
    totalRecords: expenses.length,
    totalAmount: expenses.reduce((s, e) => s + e.amount, 0),
    expenses: expenses.map((e) => ({
      date: e.date,
      category: e.category,
      description: e.description,
      amount: e.amount,
    })),
  };
  triggerDownload(JSON.stringify(payload, null, 2), `${filename}.json`, 'application/json');
}

function exportCSV(template: ExportTemplate, expenses: Expense[], filename: string): void {
  let rows: (string | number)[][];

  if (template.id === 'category-analysis') {
    const breakdown = calculateExpensesByCategory(expenses);
    const total = expenses.reduce((s, e) => s + e.amount, 0);
    rows = [
      ['Category', 'Transactions', 'Total ($)', 'Average ($)', 'Share (%)'],
      ...breakdown.map((b) => {
        const count = expenses.filter((e) => e.category === b.category).length;
        return [
          b.category,
          count,
          b.amount.toFixed(2),
          (count > 0 ? b.amount / count : 0).toFixed(2),
          (total > 0 ? ((b.amount / total) * 100) : 0).toFixed(1),
        ];
      }),
    ];
  } else {
    rows = [
      ['Date', 'Category', 'Description', 'Amount'],
      ...expenses.map((e) => [
        e.date,
        e.category,
        `"${e.description.replace(/"/g, '""')}"`,
        e.amount.toFixed(2),
      ]),
    ];
  }

  const csv = rows.map((r) => r.join(',')).join('\n');
  triggerDownload(csv, `${filename}.csv`, 'text/csv;charset=utf-8;');
}

function exportPDF(template: ExportTemplate, expenses: Expense[], filename: string): void {
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  let bodyHTML = '';

  if (template.id === 'monthly-summary') {
    const monthly = getMonthlyExpenses(expenses);
    bodyHTML = `
      <h2>Monthly Breakdown (Last 6 Months)</h2>
      <table>
        <thead><tr><th>Month</th><th class="r">Total</th><th class="r">vs Previous</th></tr></thead>
        <tbody>${monthly.map((m, i) => {
          const prev = i > 0 ? monthly[i - 1].amount : null;
          const delta = prev ? ((m.amount - prev) / prev * 100) : null;
          return `<tr>
            <td>${m.month}</td>
            <td class="r">$${m.amount.toFixed(2)}</td>
            <td class="r ${delta !== null ? (delta > 0 ? 'up' : 'down') : ''}">
              ${delta !== null ? (delta > 0 ? '▲' : '▼') + ' ' + Math.abs(delta).toFixed(1) + '%' : '—'}
            </td>
          </tr>`;
        }).join('')}</tbody>
        <tfoot><tr><td colspan="2">Period Total</td><td class="r">$${total.toFixed(2)}</td></tr></tfoot>
      </table>`;
  } else if (template.id === 'tax-report') {
    const cats = calculateExpensesByCategory(expenses);
    bodyHTML = `
      <h2>Category Summary</h2>
      <table>
        <thead><tr><th>Category</th><th class="r">Transactions</th><th class="r">Total</th></tr></thead>
        <tbody>${cats.map((b) => {
          const count = expenses.filter((e) => e.category === b.category).length;
          return `<tr><td>${b.category}</td><td class="r">${count}</td><td class="r">$${b.amount.toFixed(2)}</td></tr>`;
        }).join('')}</tbody>
        <tfoot><tr><td colspan="2">Grand Total</td><td class="r">$${total.toFixed(2)}</td></tr></tfoot>
      </table>
      <h2>All Expenses</h2>
      <table>
        <thead><tr><th>Date</th><th>Category</th><th>Description</th><th class="r">Amount</th></tr></thead>
        <tbody>${expenses.map((e) =>
          `<tr><td>${e.date}</td><td>${e.category}</td><td>${e.description}</td><td class="r">$${e.amount.toFixed(2)}</td></tr>`
        ).join('')}</tbody>
      </table>`;
  } else {
    const cats = calculateExpensesByCategory(expenses);
    const avg = expenses.length > 0 ? total / expenses.length : 0;
    bodyHTML = `
      <div class="kpi-grid">
        <div class="kpi"><div class="kpi-v">$${total.toFixed(2)}</div><div class="kpi-l">Total Spent</div></div>
        <div class="kpi"><div class="kpi-v">${expenses.length}</div><div class="kpi-l">Transactions</div></div>
        <div class="kpi"><div class="kpi-v">$${avg.toFixed(2)}</div><div class="kpi-l">Avg / Transaction</div></div>
        <div class="kpi"><div class="kpi-v">${cats[0]?.category ?? '—'}</div><div class="kpi-l">Top Category</div></div>
      </div>
      <h2>Category Breakdown</h2>
      <table>
        <thead><tr><th>Category</th><th class="r">Total</th><th class="r">Share</th></tr></thead>
        <tbody>${cats.map((b) =>
          `<tr><td>${b.category}</td><td class="r">$${b.amount.toFixed(2)}</td><td class="r">${total > 0 ? ((b.amount / total) * 100).toFixed(1) : 0}%</td></tr>`
        ).join('')}</tbody>
      </table>`;
  }

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${template.name}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,Arial,sans-serif;padding:40px;color:#111827}
  .hdr{border-bottom:3px solid #4f46e5;padding-bottom:14px;margin-bottom:28px}
  .hdr h1{font-size:22px;font-weight:700;color:#4f46e5}
  .hdr p{font-size:12px;color:#6b7280;margin-top:5px}
  h2{font-size:14px;font-weight:600;color:#374151;margin:20px 0 10px}
  table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px}
  thead th{background:#f3f4f6;padding:10px 12px;text-align:left;font-weight:600;border-bottom:2px solid #e5e7eb}
  th.r,td.r{text-align:right}
  tbody td{padding:8px 12px;border-bottom:1px solid #f3f4f6}
  tfoot td{padding:10px 12px;font-weight:700;border-top:2px solid #e5e7eb;background:#f9fafb}
  .up{color:#16a34a} .down{color:#dc2626}
  .kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:4px}
  .kpi{padding:14px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px}
  .kpi-v{font-size:18px;font-weight:700;color:#4f46e5}
  .kpi-l{font-size:11px;color:#6b7280;margin-top:4px}
  @media print{@page{margin:18mm}body{padding:0}}
</style></head><body>
  <div class="hdr"><h1>${template.name}</h1><p>Generated ${new Date().toLocaleString()} &nbsp;·&nbsp; ${expenses.length} records &nbsp;·&nbsp; ExpenseTracker</p></div>
  ${bodyHTML}
</body></html>`;

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

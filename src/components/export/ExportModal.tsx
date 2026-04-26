'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Expense, Category, CATEGORIES } from '@/types/expense';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import {
  ExportFormat,
  applyExportFilters,
  downloadCSV,
  downloadJSON,
  printPDF,
} from '@/lib/exportUtils';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenses: Expense[];
}

const FORMAT_CONFIG: Record<ExportFormat, { label: string; ext: string; description: string }> = {
  csv: { label: 'CSV', ext: '.csv', description: 'Spreadsheet compatible' },
  json: { label: 'JSON', ext: '.json', description: 'Developer friendly' },
  pdf: { label: 'PDF', ext: '.pdf', description: 'Print-ready report' },
};

const PREVIEW_LIMIT = 5;

export function ExportModal({ isOpen, onClose, expenses }: ExportModalProps) {
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Set<Category>>(
    new Set(CATEGORIES)
  );
  const [filename, setFilename] = useState(
    `expenses_${format(new Date(), 'yyyy-MM-dd')}`
  );
  const [isExporting, setIsExporting] = useState(false);

  const allSelected = selectedCategories.size === CATEGORIES.length;

  const filteredExpenses = useMemo(
    () => applyExportFilters(expenses, startDate, endDate, selectedCategories),
    [expenses, startDate, endDate, selectedCategories]
  );

  const totalAmount = useMemo(
    () => filteredExpenses.reduce((s, e) => s + e.amount, 0),
    [filteredExpenses]
  );

  const toggleCategory = (cat: Category) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedCategories(allSelected ? new Set() : new Set(CATEGORIES));
  };

  const handleExport = async () => {
    if (!canExport) return;
    setIsExporting(true);
    await new Promise((r) => setTimeout(r, 700));
    try {
      if (exportFormat === 'csv') downloadCSV(filteredExpenses, filename);
      else if (exportFormat === 'json') downloadJSON(filteredExpenses, filename);
      else printPDF(filteredExpenses, filename);
      toast.success(
        `Exported ${filteredExpenses.length} record${filteredExpenses.length !== 1 ? 's' : ''} as ${FORMAT_CONFIG[exportFormat].label}`
      );
      onClose();
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setExportFormat('csv');
      setStartDate('');
      setEndDate('');
      setSelectedCategories(new Set(CATEGORIES));
      setFilename(`expenses_${format(new Date(), 'yyyy-MM-dd')}`);
      setIsExporting(false);
    }
  }, [isOpen]);

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isExporting) onClose();
    },
    [onClose, isExporting]
  );

  useEffect(() => {
    if (isOpen) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, handleEscape]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const canExport = filteredExpenses.length > 0 && selectedCategories.size > 0;
  const previewRows = filteredExpenses.slice(0, PREVIEW_LIMIT);
  const remainingCount = filteredExpenses.length - PREVIEW_LIMIT;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          onClick={isExporting ? undefined : onClose}
        />

        {/* Modal card */}
        <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Export Data</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Configure and download your expense data
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={isExporting}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-40"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Scrollable body */}
          <div className="px-6 py-5 space-y-6 overflow-y-auto max-h-[70vh]">
            {/* ── Format Selection ── */}
            <section>
              <SectionLabel>Export Format</SectionLabel>
              <div className="grid grid-cols-3 gap-3 mt-3">
                {(Object.keys(FORMAT_CONFIG) as ExportFormat[]).map((fmt) => {
                  const cfg = FORMAT_CONFIG[fmt];
                  const active = exportFormat === fmt;
                  return (
                    <button
                      key={fmt}
                      onClick={() => setExportFormat(fmt)}
                      className={cn(
                        'flex flex-col items-center gap-1 py-4 px-3 rounded-xl border-2 transition-all duration-150',
                        active
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                      )}
                    >
                      <FormatIcon fmt={fmt} active={active} />
                      <span
                        className={cn(
                          'text-sm font-semibold mt-1',
                          active ? 'text-indigo-700' : 'text-gray-700'
                        )}
                      >
                        {cfg.label}
                      </span>
                      <span
                        className={cn(
                          'text-xs',
                          active ? 'text-indigo-500' : 'text-gray-400'
                        )}
                      >
                        {cfg.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* ── Filters ── */}
            <section>
              <SectionLabel>Filters</SectionLabel>
              <div className="mt-3 space-y-4">
                {/* Date range */}
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="From date"
                    type="date"
                    value={startDate}
                    max={endDate || undefined}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                  <Input
                    label="To date"
                    type="date"
                    value={endDate}
                    min={startDate || undefined}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>

                {/* Categories */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Categories</span>
                    <button
                      onClick={toggleAll}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                      {allSelected ? 'Deselect all' : 'Select all'}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((cat) => {
                      const active = selectedCategories.has(cat);
                      return (
                        <button
                          key={cat}
                          onClick={() => toggleCategory(cat)}
                          className={cn(
                            'px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150',
                            active
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                              : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                          )}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                  {selectedCategories.size === 0 && (
                    <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Select at least one category to export
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* ── Output ── */}
            <section>
              <SectionLabel>Output</SectionLabel>
              <div className="mt-3 flex items-end gap-2">
                <div className="flex-1">
                  <Input
                    label="Filename"
                    value={filename}
                    onChange={(e) => setFilename(e.target.value)}
                    placeholder={`expenses_${format(new Date(), 'yyyy-MM-dd')}`}
                  />
                </div>
                <div className="px-3 py-2.5 mb-0.5 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-500 font-mono whitespace-nowrap">
                  {FORMAT_CONFIG[exportFormat].ext}
                </div>
              </div>
            </section>

            {/* ── Preview ── */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <SectionLabel className="mb-0">Preview</SectionLabel>
                <div
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold',
                    filteredExpenses.length > 0
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-gray-100 text-gray-500'
                  )}
                >
                  <span>
                    {filteredExpenses.length} record{filteredExpenses.length !== 1 ? 's' : ''}
                  </span>
                  {filteredExpenses.length > 0 && (
                    <>
                      <span className="opacity-40">·</span>
                      <span>{formatCurrency(totalAmount)}</span>
                    </>
                  )}
                </div>
              </div>

              {filteredExpenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 rounded-xl border-2 border-dashed border-gray-200 text-gray-400">
                  <svg
                    className="w-10 h-10 mb-2 opacity-30"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p className="text-sm font-medium">No records match your filters</p>
                  <p className="text-xs mt-1 text-gray-400">
                    Try adjusting the date range or category selection
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        {['Date', 'Category', 'Description', 'Amount'].map((h) => (
                          <th
                            key={h}
                            className={cn(
                              'px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide',
                              h === 'Amount' ? 'text-right' : 'text-left'
                            )}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((expense, i) => (
                        <tr
                          key={expense.id}
                          className={cn(
                            'border-b border-gray-100 last:border-0',
                            i % 2 !== 0 && 'bg-gray-50/50'
                          )}
                        >
                          <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap text-xs">
                            {formatDate(expense.date)}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-xs font-medium">
                              {expense.category}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-gray-700 text-xs truncate max-w-[140px]">
                            {expense.description}
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold text-gray-900 text-xs tabular-nums">
                            {formatCurrency(expense.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {remainingCount > 0 && (
                    <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-400 text-center">
                      + {remainingCount} more record{remainingCount !== 1 ? 's' : ''} not shown
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/80 rounded-b-2xl">
            <p className="text-xs text-gray-400">
              {canExport
                ? `Ready to export ${filteredExpenses.length} record${filteredExpenses.length !== 1 ? 's' : ''}`
                : 'Adjust filters to continue'}
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={onClose} disabled={isExporting}>
                Cancel
              </Button>
              <Button onClick={handleExport} disabled={!canExport} isLoading={isExporting}>
                {!isExporting && (
                  <svg
                    className="w-4 h-4 mr-1.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                )}
                {isExporting
                  ? 'Exporting…'
                  : `Export ${filteredExpenses.length > 0 ? `${filteredExpenses.length} Record${filteredExpenses.length !== 1 ? 's' : ''}` : ''}`}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3
      className={cn(
        'text-xs font-semibold text-gray-500 uppercase tracking-widest',
        className
      )}
    >
      {children}
    </h3>
  );
}

function FormatIcon({ fmt, active }: { fmt: ExportFormat; active: boolean }) {
  const cls = cn('w-7 h-7', active ? 'text-indigo-600' : 'text-gray-400');

  if (fmt === 'csv') {
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M3 10h18M3 14h18M10 3v18M14 3v18M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z"
        />
      </svg>
    );
  }

  if (fmt === 'json') {
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
        />
      </svg>
    );
  }

  return (
    <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2zm5-12h3m-6 4h6m-6 4h4"
      />
    </svg>
  );
}

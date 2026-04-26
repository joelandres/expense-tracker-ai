'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { Expense } from '@/types/expense';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn, formatCurrency } from '@/lib/utils';
import {
  ExportTemplate,
  ExportRecord,
  ScheduledExport,
  ConnectedService,
  ServiceId,
  Frequency,
  CloudExportFormat,
  EXPORT_TEMPLATES,
  DEFAULT_SERVICES,
  getExportHistory,
  addExportRecord,
  clearExportHistory,
  getSchedules,
  createSchedule,
  toggleScheduleActive,
  deleteSchedule,
  getConnections,
  connectService,
  disconnectService,
  computeNextRun,
  runTemplateExport,
} from '@/lib/cloudExport';

// ── Types ──────────────────────────────────────────────────────────────────

type Tab = 'templates' | 'connect' | 'schedule' | 'history' | 'share';

interface CloudExportPanelProps {
  isOpen: boolean;
  onClose: () => void;
  expenses: Expense[];
}

// ── Accent config ──────────────────────────────────────────────────────────

const ACCENT: Record<ExportTemplate['accent'], { badge: string; icon: string; ring: string }> = {
  violet: { badge: 'bg-violet-100 text-violet-700', icon: 'text-violet-500', ring: 'ring-violet-200' },
  sky:    { badge: 'bg-sky-100 text-sky-700',       icon: 'text-sky-500',    ring: 'ring-sky-200'    },
  emerald:{ badge: 'bg-emerald-100 text-emerald-700',icon:'text-emerald-500', ring: 'ring-emerald-200'},
  amber:  { badge: 'bg-amber-100 text-amber-700',   icon: 'text-amber-500',  ring: 'ring-amber-200'  },
  slate:  { badge: 'bg-slate-100 text-slate-700',   icon: 'text-slate-500',  ring: 'ring-slate-200'  },
};

const FORMAT_BADGE: Record<CloudExportFormat, string> = {
  csv:  'bg-emerald-50 text-emerald-700 border border-emerald-200',
  json: 'bg-orange-50 text-orange-700 border border-orange-200',
  pdf:  'bg-red-50 text-red-700 border border-red-200',
};

const SERVICE_STYLE: Record<ServiceId, { bg: string; letter: string }> = {
  'google-sheets': { bg: 'bg-green-500',   letter: 'G' },
  dropbox:         { bg: 'bg-blue-600',    letter: 'D' },
  onedrive:        { bg: 'bg-blue-400',    letter: 'O' },
  webhook:         { bg: 'bg-gray-700',    letter: '⚡' },
};

// ── Main panel ─────────────────────────────────────────────────────────────

export function CloudExportPanel({ isOpen, onClose, expenses }: CloudExportPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('templates');
  const [history, setHistory]         = useState<ExportRecord[]>([]);
  const [schedules, setSchedules]     = useState<ScheduledExport[]>([]);
  const [connections, setConnections] = useState<Record<ServiceId, ConnectedService>>(
    () => Object.fromEntries(DEFAULT_SERVICES.map((s) => [s.id, s])) as Record<ServiceId, ConnectedService>
  );
  const [exportingId, setExportingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setHistory(getExportHistory());
      setSchedules(getSchedules());
      setConnections(getConnections());
    }
  }, [isOpen]);

  const handleEscape = useCallback(
    (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); },
    [onClose]
  );
  useEffect(() => {
    if (isOpen) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, handleEscape]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleExport = async (template: ExportTemplate, destination = 'Download') => {
    setExportingId(template.id);
    await new Promise((r) => setTimeout(r, 800));
    try {
      runTemplateExport(template, expenses);
      const updated = addExportRecord({
        templateId: template.id,
        templateName: template.name,
        format: template.format,
        destination,
        timestamp: new Date().toISOString(),
        recordCount: expenses.length,
        totalAmount: expenses.reduce((s, e) => s + e.amount, 0),
      });
      setHistory(updated);
      toast.success(`${template.name} exported as ${template.format.toUpperCase()}`);
    } finally {
      setExportingId(null);
    }
  };

  const connectedCount = Object.values(connections).filter((c) => c.connected).length;
  const activeScheduleCount = schedules.filter((s) => s.active).length;

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: 'templates', label: 'Templates' },
    { id: 'connect',   label: 'Connect',  badge: connectedCount || undefined },
    { id: 'schedule',  label: 'Schedule', badge: activeScheduleCount || undefined },
    { id: 'history',   label: 'History',  badge: history.length || undefined },
    { id: 'share',     label: 'Share' },
  ];

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Slide-in panel */}
      <div
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex flex-col w-full sm:w-[480px] bg-white shadow-2xl',
          'transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Export Hub</h2>
              </div>
              <p className="text-xs text-gray-400 mt-1.5 pl-9">
                {expenses.length} records &nbsp;·&nbsp; {formatCurrency(expenses.reduce((s, e) => s + e.amount, 0))} total
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-0.5 mt-4 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors',
                  activeTab === tab.id
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                )}
              >
                {tab.label}
                {tab.badge !== undefined && (
                  <span className={cn(
                    'px-1.5 py-0.5 rounded-full text-[10px] font-semibold leading-none',
                    activeTab === tab.id ? 'bg-indigo-200 text-indigo-700' : 'bg-gray-200 text-gray-600'
                  )}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'templates' && (
            <TemplatesTab
              expenses={expenses}
              exportingId={exportingId}
              onExport={handleExport}
            />
          )}
          {activeTab === 'connect' && (
            <ConnectTab
              connections={connections}
              onConnectionChange={setConnections}
            />
          )}
          {activeTab === 'schedule' && (
            <ScheduleTab
              schedules={schedules}
              connections={connections}
              onSchedulesChange={setSchedules}
            />
          )}
          {activeTab === 'history' && (
            <HistoryTab
              history={history}
              exportingId={exportingId}
              onClear={() => { clearExportHistory(); setHistory([]); }}
              onReExport={(record) => {
                const template = EXPORT_TEMPLATES.find((t) => t.id === record.templateId);
                if (template) handleExport(template, record.destination);
              }}
            />
          )}
          {activeTab === 'share' && (
            <ShareTab expenses={expenses} />
          )}
        </div>
      </div>
    </>
  );
}

// ── Templates Tab ──────────────────────────────────────────────────────────

function TemplatesTab({
  expenses,
  exportingId,
  onExport,
}: {
  expenses: Expense[];
  exportingId: string | null;
  onExport: (template: ExportTemplate, destination?: string) => void;
}) {
  return (
    <div className="p-4 space-y-3">
      <p className="text-xs text-gray-400 px-1">
        Pre-built templates optimised for different audiences and use cases.
      </p>
      {EXPORT_TEMPLATES.map((template) => {
        const a = ACCENT[template.accent];
        const isExporting = exportingId === template.id;
        return (
          <div
            key={template.id}
            className={cn(
              'rounded-xl border bg-white p-4 transition-shadow hover:shadow-sm',
              isExporting ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-gray-200'
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold', a.badge)}>
                    {template.tag}
                  </span>
                  <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-semibold', FORMAT_BADGE[template.format])}>
                    .{template.format}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-gray-900">{template.name}</h3>
                <p className="text-xs text-indigo-500 font-medium mt-0.5">{template.tagline}</p>
                <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{template.description}</p>
              </div>
              <Button
                size="sm"
                variant={isExporting ? 'primary' : 'secondary'}
                isLoading={isExporting}
                disabled={exportingId !== null}
                onClick={() => onExport(template)}
                className="shrink-0"
              >
                {!isExporting && (
                  <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                )}
                Export
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Connect Tab ────────────────────────────────────────────────────────────

function ConnectTab({
  connections,
  onConnectionChange,
}: {
  connections: Record<ServiceId, ConnectedService>;
  onConnectionChange: (c: Record<ServiceId, ConnectedService>) => void;
}) {
  const [connecting, setConnecting] = useState<ServiceId | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');

  const FAKE_EMAILS: Record<ServiceId, string> = {
    'google-sheets': 'user@gmail.com',
    dropbox:         'user@dropbox.com',
    onedrive:        'user@outlook.com',
    webhook:         '',
  };

  const handleConnect = async (id: ServiceId) => {
    if (id === 'webhook') return; // handled separately
    setConnecting(id);
    await new Promise((r) => setTimeout(r, 1600));
    const updated = connectService(id, FAKE_EMAILS[id], {
      folder: id !== 'google-sheets' ? '/Apps/ExpenseTracker' : undefined,
    });
    onConnectionChange(updated);
    setConnecting(null);
    toast.success(`Connected to ${connections[id].name}`);
  };

  const handleDisconnect = (id: ServiceId) => {
    const updated = disconnectService(id);
    onConnectionChange(updated);
    toast(`Disconnected from ${connections[id].name}`, { icon: '🔌' });
  };

  const handleConnectWebhook = () => {
    if (!webhookUrl.trim()) return;
    try { new URL(webhookUrl); } catch { toast.error('Enter a valid URL'); return; }
    const updated = connectService('webhook', webhookUrl, { webhookUrl });
    onConnectionChange(updated);
    setWebhookUrl('');
    toast.success('Webhook configured');
  };

  return (
    <div className="p-4 space-y-3">
      <p className="text-xs text-gray-400 px-1 mb-2">
        Connect cloud services to automatically sync and backup your exports.
      </p>
      {DEFAULT_SERVICES.map((svc) => {
        const conn = connections[svc.id];
        const style = SERVICE_STYLE[svc.id];
        const isConnecting = connecting === svc.id;

        return (
          <div key={svc.id} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-white font-semibold text-sm shrink-0', style.bg)}>
                {style.letter}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">{svc.name}</span>
                  {conn.connected && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                      Connected
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5 truncate">
                  {conn.connected && conn.accountEmail
                    ? conn.accountEmail
                    : svc.description}
                </p>
                {conn.connected && conn.lastSync && (
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Last sync {formatDistanceToNow(parseISO(conn.lastSync), { addSuffix: true })}
                    {conn.folder && <span> · {conn.folder}</span>}
                  </p>
                )}
              </div>
              <div className="shrink-0">
                {conn.connected ? (
                  <button
                    onClick={() => handleDisconnect(svc.id)}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded-md hover:bg-red-50"
                  >
                    Disconnect
                  </button>
                ) : svc.id !== 'webhook' ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    isLoading={isConnecting}
                    disabled={connecting !== null}
                    onClick={() => handleConnect(svc.id)}
                  >
                    {!isConnecting && 'Connect'}
                  </Button>
                ) : null}
              </div>
            </div>

            {/* Webhook URL input */}
            {svc.id === 'webhook' && !conn.connected && (
              <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                <div className="flex-1">
                  <input
                    type="url"
                    placeholder="https://your-api.example.com/hook"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-20 focus:border-indigo-500 transition-colors"
                  />
                </div>
                <Button size="sm" onClick={handleConnectWebhook} disabled={!webhookUrl.trim()}>
                  Save
                </Button>
              </div>
            )}
            {svc.id === 'webhook' && conn.connected && conn.webhookUrl && (
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                <span className="text-xs text-gray-500 font-mono truncate">{conn.webhookUrl}</span>
                <button
                  onClick={() => { toast.success('Test payload sent'); }}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium shrink-0 transition-colors"
                >
                  Send test
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Schedule Tab ───────────────────────────────────────────────────────────

function ScheduleTab({
  schedules,
  connections,
  onSchedulesChange,
}: {
  schedules: ScheduledExport[];
  connections: Record<ServiceId, ConnectedService>;
  onSchedulesChange: (s: ScheduledExport[]) => void;
}) {
  const [templateId, setTemplateId] = useState(EXPORT_TEMPLATES[0].id);
  const [frequency, setFrequency] = useState<Frequency>('weekly');
  const [destination, setDestination] = useState('Download');

  const connectedServices = Object.values(connections).filter((c) => c.connected);
  const destinationOptions = [
    'Download',
    'Email',
    ...connectedServices.map((c) => c.name),
  ];

  const handleCreate = () => {
    const template = EXPORT_TEMPLATES.find((t) => t.id === templateId)!;
    const updated = createSchedule(templateId, template.name, frequency, destination);
    onSchedulesChange(updated);
    toast.success(`Schedule created — next run ${format(parseISO(computeNextRun(frequency)), 'MMM d')}`);
  };

  return (
    <div className="p-4 space-y-5">
      {/* Create form */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">New Automated Export</h3>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Template</label>
          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="w-full text-sm px-3 py-2.5 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-20 focus:border-indigo-500 transition-colors"
          >
            {EXPORT_TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Frequency</label>
          <div className="flex gap-2">
            {(['daily', 'weekly', 'monthly'] as Frequency[]).map((f) => (
              <button
                key={f}
                onClick={() => setFrequency(f)}
                className={cn(
                  'flex-1 py-2 rounded-lg text-xs font-semibold border transition-all capitalize',
                  frequency === f
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Destination</label>
          <select
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="w-full text-sm px-3 py-2.5 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-20 focus:border-indigo-500 transition-colors"
          >
            {destinationOptions.map((d) => <option key={d}>{d}</option>)}
          </select>
          {connectedServices.length === 0 && (
            <p className="text-[10px] text-gray-400">Connect a cloud service to send exports automatically.</p>
          )}
        </div>

        <Button className="w-full" onClick={handleCreate}>
          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Schedule
        </Button>
      </div>

      {/* Active schedules */}
      {schedules.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest px-1">
            Active Schedules
          </h3>
          {schedules.map((s) => (
            <div key={s.id} className={cn(
              'rounded-xl border p-3.5 transition-colors',
              s.active ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'
            )}>
              <div className="flex items-start gap-3">
                <button
                  onClick={() => onSchedulesChange(toggleScheduleActive(s.id))}
                  className={cn(
                    'mt-0.5 w-8 h-5 rounded-full transition-colors shrink-0 relative',
                    s.active ? 'bg-indigo-600' : 'bg-gray-300'
                  )}
                >
                  <span className={cn(
                    'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
                    s.active ? 'translate-x-3.5' : 'translate-x-0.5'
                  )} />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900">{s.templateName}</span>
                    <button
                      onClick={() => onSchedulesChange(deleteSchedule(s.id))}
                      className="text-gray-300 hover:text-red-400 transition-colors p-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-500 capitalize">{s.frequency}</span>
                    <span className="text-gray-300">·</span>
                    <span className="text-xs text-gray-500">{s.destination}</span>
                  </div>
                  {s.active && (
                    <p className="text-[10px] text-indigo-500 mt-1 font-medium">
                      Next run: {format(parseISO(s.nextRun), 'MMM d, yyyy')} at 9:00 AM
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {schedules.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <svg className="w-10 h-10 mx-auto mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm font-medium">No schedules yet</p>
          <p className="text-xs mt-1">Create one above to automate your exports.</p>
        </div>
      )}
    </div>
  );
}

// ── History Tab ────────────────────────────────────────────────────────────

function HistoryTab({
  history,
  exportingId,
  onClear,
  onReExport,
}: {
  history: ExportRecord[];
  exportingId: string | null;
  onClear: () => void;
  onReExport: (r: ExportRecord) => void;
}) {
  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400 px-8 text-center">
        <svg className="w-12 h-12 mb-3 opacity-25" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-sm font-medium text-gray-500">No exports yet</p>
        <p className="text-xs mt-1">Your export history will appear here.</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
          {history.length} export{history.length !== 1 ? 's' : ''}
        </span>
        <button
          onClick={onClear}
          className="text-xs text-gray-400 hover:text-red-500 transition-colors font-medium"
        >
          Clear all
        </button>
      </div>
      <div className="space-y-2">
        {history.map((record) => (
          <div key={record.id} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-gray-900">{record.templateName}</span>
                  <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-semibold', FORMAT_BADGE[record.format])}>
                    .{record.format}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span>{record.recordCount} records</span>
                  <span>·</span>
                  <span>{formatCurrency(record.totalAmount)}</span>
                  <span>·</span>
                  <span>{record.destination}</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {formatDistanceToNow(parseISO(record.timestamp), { addSuffix: true })}
                </p>
              </div>
              <button
                onClick={() => onReExport(record)}
                disabled={exportingId !== null}
                className="shrink-0 p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-40"
                title="Export again"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Share Tab ──────────────────────────────────────────────────────────────

type Expiry = '24h' | '7d' | '30d' | 'never';

function ShareTab({ expenses }: { expenses: Expense[] }) {
  const [expiry, setExpiry] = useState<Expiry>('7d');
  const [generatedLink, setGeneratedLink] = useState('');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [linkSeed, setLinkSeed] = useState('');

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  const generateLink = () => {
    const code = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
    setLinkSeed(code);
    setGeneratedLink(`https://expensetracker.app/share/${code}`);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(generatedLink).then(
      () => toast.success('Link copied to clipboard'),
      () => toast.error('Could not copy link')
    );
  };

  const sendEmail = async () => {
    if (!email.trim() || !email.includes('@')) { toast.error('Enter a valid email'); return; }
    setSending(true);
    await new Promise((r) => setTimeout(r, 1200));
    setSending(false);
    toast.success(`Report sent to ${email}`);
    setEmail('');
  };

  const EXPIRY_LABELS: Record<Expiry, string> = {
    '24h': '24 hours', '7d': '7 days', '30d': '30 days', never: 'Never',
  };

  return (
    <div className="p-4 space-y-4">
      {/* Snapshot summary */}
      <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
        <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-2">Data Snapshot</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Records', value: expenses.length.toString() },
            { label: 'Total',   value: formatCurrency(total) },
            { label: 'Categories', value: new Set(expenses.map((e) => e.category)).size.toString() },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-lg p-2.5 text-center">
              <div className="text-base font-bold text-gray-900">{stat.value}</div>
              <div className="text-[10px] text-gray-500 mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Shareable link */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">Shareable Link</h3>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Link expires after</label>
          <div className="flex gap-1.5">
            {(Object.keys(EXPIRY_LABELS) as Expiry[]).map((e) => (
              <button
                key={e}
                onClick={() => setExpiry(e)}
                className={cn(
                  'flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all',
                  expiry === e
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                )}
              >
                {EXPIRY_LABELS[e]}
              </button>
            ))}
          </div>
        </div>

        {!generatedLink ? (
          <Button className="w-full" variant="secondary" onClick={generateLink}>
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Generate Link
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg border border-gray-200">
              <span className="flex-1 text-xs text-gray-600 font-mono truncate">{generatedLink}</span>
              <button
                onClick={copyLink}
                className="shrink-0 p-1.5 rounded-md hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
                title="Copy link"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>

            <div className="flex gap-4 items-start">
              <div className="flex-1">
                <p className="text-xs text-gray-500 leading-relaxed">
                  Anyone with this link can view a read-only summary of your expense data.
                  Expires in <span className="font-medium text-gray-700">{EXPIRY_LABELS[expiry]}</span>.
                </p>
                <button
                  onClick={generateLink}
                  className="mt-2 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                >
                  Regenerate link
                </button>
              </div>
              <div className="shrink-0">
                <MockQRCode seed={linkSeed} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Send via email */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">Send via Email</h3>
        <p className="text-xs text-gray-500">Send a Full Backup export directly to any email address.</p>
        <div className="flex gap-2">
          <div className="flex-1">
            <input
              type="email"
              placeholder="recipient@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') sendEmail(); }}
              className="w-full text-sm px-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-20 focus:border-indigo-500 transition-colors"
            />
          </div>
          <Button isLoading={sending} onClick={sendEmail} disabled={!email.trim()}>
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Mock QR Code ───────────────────────────────────────────────────────────

function MockQRCode({ seed }: { seed: string }) {
  const SIZE = 21;
  const seedNum = seed.split('').reduce((a, c) => ((a * 31 + c.charCodeAt(0)) | 0), 0);

  function finderCell(r: number, c: number): boolean {
    if (r === 0 || r === 6 || c === 0 || c === 6) return true;
    return r >= 2 && r <= 4 && c >= 2 && c <= 4;
  }

  function isDark(r: number, c: number): boolean {
    // Top-left finder
    if (r < 7 && c < 7) return finderCell(r, c);
    // Top-right finder
    if (r < 7 && c >= SIZE - 7) return finderCell(r, c - (SIZE - 7));
    // Bottom-left finder
    if (r >= SIZE - 7 && c < 7) return finderCell(r - (SIZE - 7), c);
    // Separators
    if ((r === 7 && c <= 7) || (r === 7 && c >= SIZE - 8)) return false;
    if ((c === 7 && r <= 7) || (c === 7 && r >= SIZE - 8)) return false;
    if (r === SIZE - 8 && c <= 7) return false;
    // Timing
    if (r === 6 || c === 6) return (r + c) % 2 === 0;
    // Data (pseudo-random but stable)
    const h = Math.abs(Math.imul(seedNum ^ (r * 137 + c * 149 + 1), 2654435761)) >>> 0;
    return h % 3 !== 0;
  }

  const rects = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (isDark(r, c)) rects.push({ r, c });
    }
  }

  return (
    <div className="p-2 bg-white rounded-lg border border-gray-200 shadow-sm">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-24 h-24 text-gray-900" style={{ imageRendering: 'pixelated' }}>
        {rects.map(({ r, c }) => (
          <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="currentColor" />
        ))}
      </svg>
    </div>
  );
}

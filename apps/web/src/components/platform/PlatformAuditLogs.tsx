import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCcw, Search, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { getPlatformAuditLogs, type PlatformAuditLog } from '../../api/platformSecurity';

const formatDateTime = (value: string) => new Date(value).toLocaleString();

const metadataPreview = (metadata: unknown) => {
  if (!metadata) return '—';
  try {
    const text = JSON.stringify(metadata);
    return text.length > 90 ? `${text.slice(0, 90)}...` : text;
  } catch {
    return 'Metadata unavailable';
  }
};

export const PlatformAuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<PlatformAuditLog[]>([]);
  const [action, setAction] = useState('');
  const [limit, setLimit] = useState(100);
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const response = await getPlatformAuditLogs({ limit, action: action.trim() || undefined });
      setLogs(response.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadLogs(); }, []);

  const actionSummary = useMemo(() => {
    const counts = new Map<string, number>();
    logs.forEach((log) => counts.set(log.action, (counts.get(log.action) ?? 0) + 1));
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [logs]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-wider text-blue-600">Security Center</p>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">Platform Audit Logs</h1>
          <p className="mt-2 max-w-3xl text-sm font-medium text-slate-500 dark:text-slate-400">Read-only activity history for Super Admin actions, institution updates, user changes, and operational events.</p>
        </div>
        <button onClick={() => void loadLogs()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60">
          {loading ? <Loader2 className="animate-spin" size={16} /> : <RefreshCcw size={16} />}
          Refresh
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <ShieldCheck className="mb-3 text-blue-600" />
          <p className="text-sm font-bold text-slate-500">Loaded Events</p>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{logs.length}</p>
        </div>
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:col-span-2">
          <p className="mb-3 text-sm font-black text-slate-900 dark:text-white">Top Actions</p>
          <div className="flex flex-wrap gap-2">
            {actionSummary.length ? actionSummary.map(([name, count]) => (
              <span key={name} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-200">{name}: {count}</span>
            )) : <span className="text-sm font-bold text-slate-500">No action data yet</span>}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <label className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input value={action} onChange={(event) => setAction(event.target.value)} placeholder="Filter by action, e.g. UPDATE_INSTITUTION" className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm font-bold dark:border-slate-700 dark:bg-slate-950" />
          </label>
          <select value={limit} onChange={(event) => setLimit(Number(event.target.value))} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-950">
            {[50, 100, 150, 200].map((value) => <option key={value} value={value}>Last {value}</option>)}
          </select>
          <button onClick={() => void loadLogs()} disabled={loading} className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-white disabled:opacity-60 dark:bg-white dark:text-slate-900">Apply</button>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 p-5 dark:border-slate-800">
          <h2 className="text-xl font-black text-slate-900 dark:text-white">Recent Security Events</h2>
          <p className="text-sm font-bold text-slate-500">Showing latest platform-visible audit events</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-950">
              <tr><th className="p-4">Time</th><th className="p-4">Actor</th><th className="p-4">Institution</th><th className="p-4">Action</th><th className="p-4">Entity</th><th className="p-4">IP / Metadata</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-sm font-bold text-slate-500"><Loader2 className="mx-auto mb-2 animate-spin" /> Loading audit logs...</td></tr>
              ) : logs.length ? logs.map((log) => (
                <tr key={log.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="p-4 font-bold text-slate-600 dark:text-slate-300">{formatDateTime(log.createdAt)}</td>
                  <td className="p-4"><p className="font-black text-slate-900 dark:text-white">{log.actor?.name ?? 'System'}</p><p className="text-xs font-bold text-slate-500">{log.actor?.email ?? '—'} · {log.actor?.role ?? '—'}</p></td>
                  <td className="p-4"><p className="font-black text-slate-900 dark:text-white">{log.institution?.name ?? 'Platform'}</p><p className="text-xs font-bold text-slate-500">{log.institution?.code ?? '—'}</p></td>
                  <td className="p-4"><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">{log.action}</span></td>
                  <td className="p-4"><p className="font-bold text-slate-700 dark:text-slate-200">{log.entityType}</p><p className="text-xs font-bold text-slate-500">{log.entityId ?? '—'}</p></td>
                  <td className="p-4"><p className="font-bold text-slate-700 dark:text-slate-200">{log.ipAddress ?? '—'}</p><p className="max-w-md truncate text-xs font-bold text-slate-500">{metadataPreview(log.metadata)}</p></td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="p-8 text-center text-sm font-bold text-slate-500">No audit logs found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

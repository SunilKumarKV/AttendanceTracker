import React, { useEffect, useState } from 'react';
import { ShieldCheck, RefreshCw, Clock, MonitorCheck } from 'lucide-react';
import { AuditLogEntry, getAuditLogs, getLoginHistory, LoginHistoryEntry } from '../api/admin';
import { EmptyState, ErrorState, Loader } from './common';

export const AuditLogs: React.FC = () => {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [audit, logins] = await Promise.all([getAuditLogs(50), getLoginHistory(50)]);
      setAuditLogs(audit.data);
      setLoginHistory(logins.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load audit data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (loading) return <Loader label="Loading audit data..." />;
  if (error) return <ErrorState title="Audit unavailable" message={error} onAction={load} />;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">Security & Activity</h2>
              <p className="text-sm font-medium text-slate-500">Audit logs and login history for this institution.</p>
            </div>
          </div>
        </div>
        <button onClick={() => void load()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-700">
          <RefreshCw size={18} /> Refresh
        </button>
      </div>

      <section className="rounded-3xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 p-6 dark:border-slate-800">
          <h3 className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white"><Clock size={20} /> Activity Timeline</h3>
        </div>
        {auditLogs.length === 0 ? <EmptyState title="No audit entries" message="Activity will appear after users make changes." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-400 dark:bg-slate-950">
                <tr><th className="px-6 py-4">Time</th><th className="px-6 py-4">Actor</th><th className="px-6 py-4">Action</th><th className="px-6 py-4">Entity</th><th className="px-6 py-4">IP</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-950/60">
                    <td className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="px-6 py-4"><div className="font-bold text-slate-900 dark:text-white">{log.actor?.name ?? 'System'}</div><div className="text-xs text-slate-500">{log.actor?.role ?? ''}</div></td>
                    <td className="px-6 py-4"><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">{log.action}</span></td>
                    <td className="px-6 py-4 font-medium text-slate-600 dark:text-slate-300">{log.entityType}</td>
                    <td className="px-6 py-4 text-slate-500">{log.ipAddress ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 p-6 dark:border-slate-800">
          <h3 className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white"><MonitorCheck size={20} /> Login History</h3>
        </div>
        {loginHistory.length === 0 ? <EmptyState title="No login records" message="Successful and failed logins will appear here." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-400 dark:bg-slate-950">
                <tr><th className="px-6 py-4">Time</th><th className="px-6 py-4">Email</th><th className="px-6 py-4">Status</th><th className="px-6 py-4">IP</th><th className="px-6 py-4">Device</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loginHistory.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-950/60">
                    <td className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">{new Date(entry.createdAt).toLocaleString()}</td>
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{entry.email}</td>
                    <td className="px-6 py-4"><span className={`rounded-full px-3 py-1 text-xs font-black ${entry.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{entry.success ? 'SUCCESS' : 'FAILED'}</span></td>
                    <td className="px-6 py-4 text-slate-500">{entry.ipAddress ?? '-'}</td>
                    <td className="max-w-md truncate px-6 py-4 text-slate-500">{entry.userAgent ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

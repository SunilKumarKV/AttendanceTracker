import React, { useEffect, useMemo, useState } from 'react';
import { Laptop, Loader2, LogOut, RefreshCcw, ShieldCheck, Smartphone, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { getActiveSessions, revokeOtherSessions, revokeSession, type ActiveSession } from '../../api/sessions';

const formatDateTime = (value?: string | null) => value ? new Date(value).toLocaleString() : 'Not available';

const isMobileSession = (session: ActiveSession) => {
  const ua = `${session.userAgent ?? ''} ${session.deviceLabel ?? ''}`.toLowerCase();
  return ua.includes('iphone') || ua.includes('ipad') || ua.includes('android') || ua.includes('ios');
};

export const ActiveSessions: React.FC = () => {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [revokingOthers, setRevokingOthers] = useState(false);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const response = await getActiveSessions();
      setSessions(response.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load active sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadSessions(); }, []);

  const currentSession = useMemo(() => sessions.find((session) => session.current) ?? null, [sessions]);
  const otherSessions = useMemo(() => sessions.filter((session) => !session.current), [sessions]);

  const handleRevoke = async (session: ActiveSession) => {
    setWorkingId(session.id);
    try {
      await revokeSession(session.id);
      toast.success('Session revoked');
      await loadSessions();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to revoke session');
    } finally {
      setWorkingId(null);
    }
  };

  const handleRevokeOthers = async () => {
    setRevokingOthers(true);
    try {
      await revokeOtherSessions();
      toast.success('Other sessions revoked');
      await loadSessions();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to revoke other sessions');
    } finally {
      setRevokingOthers(false);
    }
  };

  const SessionCard = ({ session }: { session: ActiveSession }) => {
    const Icon = isMobileSession(session) ? Smartphone : Laptop;
    return (
      <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
              <Icon size={24} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-black text-slate-900 dark:text-white">{session.deviceLabel || 'Unknown device'}</h3>
                {session.current && <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">Current</span>}
              </div>
              <p className="mt-1 text-sm font-bold text-slate-500">IP: {session.ipAddress || 'Not available'}</p>
              <p className="mt-1 max-w-2xl break-all text-xs font-medium text-slate-400">{session.userAgent || 'No user-agent recorded'}</p>
            </div>
          </div>
          {!session.current && (
            <button
              onClick={() => void handleRevoke(session)}
              disabled={workingId === session.id}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-black text-red-700 hover:bg-red-100 disabled:opacity-60 dark:bg-red-950/40 dark:text-red-300"
            >
              {workingId === session.id ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
              Revoke
            </button>
          )}
        </div>
        <div className="mt-5 grid gap-3 text-sm md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-950"><p className="text-xs font-black uppercase text-slate-400">Created</p><p className="font-bold text-slate-700 dark:text-slate-200">{formatDateTime(session.createdAt)}</p></div>
          <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-950"><p className="text-xs font-black uppercase text-slate-400">Last active</p><p className="font-bold text-slate-700 dark:text-slate-200">{formatDateTime(session.lastUsedAt)}</p></div>
          <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-950"><p className="text-xs font-black uppercase text-slate-400">Expires</p><p className="font-bold text-slate-700 dark:text-slate-200">{formatDateTime(session.expiresAt)}</p></div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-wider text-blue-600">Security Center</p>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">Active Sessions</h1>
          <p className="mt-2 max-w-3xl text-sm font-medium text-slate-500 dark:text-slate-400">Review devices signed in to your account and revoke sessions you no longer recognize.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => void loadSessions()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
            {loading ? <Loader2 className="animate-spin" size={16} /> : <RefreshCcw size={16} />}
            Refresh
          </button>
          <button onClick={() => void handleRevokeOthers()} disabled={!otherSessions.length || revokingOthers} className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-black text-white hover:bg-red-700 disabled:opacity-50">
            {revokingOthers ? <Loader2 className="animate-spin" size={16} /> : <LogOut size={16} />}
            Revoke other sessions
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <ShieldCheck className="mb-3 text-blue-600" />
          <p className="text-sm font-bold text-slate-500">Active Sessions</p>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{sessions.length}</p>
        </div>
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <Laptop className="mb-3 text-violet-600" />
          <p className="text-sm font-bold text-slate-500">Other Devices</p>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{otherSessions.length}</p>
        </div>
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <Smartphone className="mb-3 text-emerald-600" />
          <p className="text-sm font-bold text-slate-500">Current Device</p>
          <p className="truncate text-xl font-black text-slate-900 dark:text-white">{currentSession?.deviceLabel ?? 'Unknown'}</p>
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-slate-100 bg-white p-8 text-center font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900">
          <Loader2 className="mx-auto mb-3 animate-spin" /> Loading sessions...
        </div>
      ) : (
        <div className="space-y-5">
          {currentSession && (
            <section className="space-y-3">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Current session</h2>
              <SessionCard session={currentSession} />
            </section>
          )}

          <section className="space-y-3">
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Other sessions</h2>
            {otherSessions.length ? otherSessions.map((session) => <SessionCard key={session.id} session={session} />) : (
              <div className="rounded-3xl border border-slate-100 bg-white p-8 text-center text-sm font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900">No other active sessions found.</div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

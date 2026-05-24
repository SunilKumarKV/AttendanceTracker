import React, { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, ShieldCheck, WalletCards } from 'lucide-react';
import { toast } from 'sonner';
import {
  enforceBillingDunning,
  getBillingHealth,
  getFailedBillingWebhooks,
  retryBillingWebhook,
  type BillingEvent,
  type BillingHealth,
} from '../../api/billing';

const StatCard = ({ title, value }: { title: string; value: number }) => (
  <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <p className="text-sm font-black uppercase tracking-wide text-slate-500">{title}</p>
    <p className="mt-3 text-3xl font-black text-slate-900 dark:text-white">{value}</p>
  </div>
);

export const BillingHealthDashboard: React.FC = () => {
  const [health, setHealth] = useState<BillingHealth | null>(null);
  const [failedWebhooks, setFailedWebhooks] = useState<BillingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [healthResponse, failedResponse] = await Promise.all([
        getBillingHealth(),
        getFailedBillingWebhooks(),
      ]);

      setHealth(healthResponse.data);
      setFailedWebhooks(failedResponse.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load billing health');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleRetry = async (id: string) => {
    setActionLoading(id);
    try {
      await retryBillingWebhook(id);
      toast.success('Webhook retried successfully');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to retry webhook');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEnforce = async () => {
    if (!window.confirm('Run billing enforcement now?')) return;

    setActionLoading('dunning');
    try {
      await enforceBillingDunning();
      toast.success('Billing enforcement completed');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to enforce billing');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-100 bg-white p-8 text-center font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900">
        Loading billing health...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-wider text-blue-600">Super Admin</p>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">Billing Health</h1>
          <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
            Monitor failed webhooks, payment failures, trials, and billing enforcement.
          </p>
        </div>

        <button
          onClick={handleEnforce}
          disabled={actionLoading === 'dunning'}
          className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white disabled:opacity-60 dark:bg-white dark:text-slate-900"
        >
          {actionLoading === 'dunning' ? 'Running...' : 'Run Enforcement'}
        </button>
      </div>

      {health && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Failed Webhooks" value={health.summary.failedWebhooks} />
          <StatCard title="Processed Webhooks" value={health.summary.processedWebhooks} />
          <StatCard title="Past Due Institutions" value={health.summary.pastDueInstitutions} />
          <StatCard title="Expired Trial Candidates" value={health.summary.expiredTrialCandidates} />
        </div>
      )}

      <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-5 flex items-center gap-3">
          <AlertTriangle className="text-red-600" />
          <h2 className="text-xl font-black text-slate-900 dark:text-white">Failed Webhooks</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-950">
              <tr>
                <th className="p-4">Event</th>
                <th className="p-4">Provider Event ID</th>
                <th className="p-4">Created</th>
                <th className="p-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {failedWebhooks.length ? failedWebhooks.map((event) => (
                <tr key={event.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="p-4 font-bold text-slate-700 dark:text-slate-200">{event.eventType}</td>
                  <td className="p-4 font-mono text-xs text-slate-500">{event.providerEventId ?? '-'}</td>
                  <td className="p-4 font-bold text-slate-700 dark:text-slate-200">
                    {new Date(event.createdAt).toLocaleString()}
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => void handleRetry(event.id)}
                      disabled={actionLoading === event.id}
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white disabled:opacity-60"
                    >
                      <RefreshCw size={14} />
                      {actionLoading === event.id ? 'Retrying...' : 'Retry'}
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-sm font-bold text-slate-500">
                    No failed webhook events found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {health && (
        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-5 flex items-center gap-3">
            <WalletCards className="text-blue-600" />
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Recent Invoices</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-950">
                <tr>
                  <th className="p-4">Invoice</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Created</th>
                </tr>
              </thead>
              <tbody>
                {health.recentInvoices.length ? health.recentInvoices.map((invoice) => (
                  <tr key={invoice.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="p-4 font-bold text-slate-700 dark:text-slate-200">
                      {invoice.providerInvoiceId ?? invoice.id}
                    </td>
                    <td className="p-4 font-bold text-slate-700 dark:text-slate-200">
                      ₹{(invoice.amount / 100).toLocaleString()}
                    </td>
                    <td className="p-4 font-bold text-slate-700 dark:text-slate-200">{invoice.status}</td>
                    <td className="p-4 font-bold text-slate-700 dark:text-slate-200">
                      {new Date(invoice.createdAt).toLocaleString()}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-sm font-bold text-slate-500">
                      No invoices found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5 text-sm font-bold text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} />
          Billing resiliency is active: webhook retry, dunning enforcement, and invoice monitoring are enabled.
        </div>
      </div>
    </div>
  );
};
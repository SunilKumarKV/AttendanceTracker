import React, { useEffect, useMemo, useState } from 'react';
import { Check, Crown, Loader2, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import {
  cancelBillingSubscription,
  createBillingCheckout,
  getBillingInvoices,
  getBillingPlans,
  getCurrentBilling,
  type BillingInvoice,
  type BillingPlan,
  type CurrentBilling,
} from '../../api/billing';

const formatPrice = (amount: number) => amount === 0 ? 'Custom / Trial' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount / 100);
const usagePercent = (used: number, total: number) => total <= 0 ? 0 : Math.min(100, Math.round((used / total) * 100));
const getUsageWarning = (used: number, total: number) => {
  const percent = usagePercent(used, total);

  if (percent >= 100) {
    return {
      label: 'Limit reached',
      message: 'You have reached this plan limit. Upgrade to continue adding more records.',
      className: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300',
    };
  }

  if (percent >= 90) {
    return {
      label: 'Almost full',
      message: 'You are above 90% usage. Upgrade soon to avoid blocked actions.',
      className: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/50 dark:bg-orange-950/30 dark:text-orange-300',
    };
  }

  if (percent >= 80) {
    return {
      label: 'High usage',
      message: 'You are above 80% usage. Consider upgrading your plan.',
      className: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300',
    };
  }

  return null;
};
const formatDate = (value?: string | null) => value ? new Date(value).toLocaleDateString() : '-';

export const BillingDashboard: React.FC = () => {
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [current, setCurrent] = useState<CurrentBilling | null>(null);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);
  const [billingActionLoading, setBillingActionLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [plansResponse, currentResponse, invoicesResponse] = await Promise.all([
          getBillingPlans(),
          getCurrentBilling(),
          getBillingInvoices(),
        ]);
        setPlans(plansResponse.data ?? []);
        setCurrent(currentResponse.data ?? null);
        setInvoices(invoicesResponse.data ?? []);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Unable to load billing data');
        try {
          const plansResponse = await getBillingPlans();
          setPlans(plansResponse.data ?? []);
        } catch {
          setPlans([]);
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const currentPlan = useMemo(() => plans.find((plan) => plan.code === current?.institution?.subscriptionPlan), [plans, current]);

  const handleCheckout = async (plan: BillingPlan) => {
    if (plan.code === 'FREE_TRIAL') {
      toast.info('Free trial does not require checkout');
      return;
    }

    setCheckoutPlan(plan.code);
    try {
      const response = await createBillingCheckout(plan.code, 'monthly');
      if (response.data.shortUrl) {
        window.location.href = response.data.shortUrl;
        return;
      }
      toast.error('Checkout URL unavailable');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to start checkout');
    } finally {
      setCheckoutPlan(null);
    }
  };

  const handleCancelSubscription = async () => {
    if (!current?.institution?.razorpaySubscriptionId) {
      toast.info('No active Razorpay subscription found');
      return;
    }
    if (!window.confirm('Cancel subscription at period end?')) return;

    setBillingActionLoading(true);
    try {
      await cancelBillingSubscription();
      toast.success('Subscription cancellation requested');
      const currentResponse = await getCurrentBilling();
      setCurrent(currentResponse.data ?? null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to cancel');
    } finally {
      setBillingActionLoading(false);
    }
  };

  const handleResumeSubscription = async () => {
    toast.info('Please purchase again to resume subscription');
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-100 bg-white p-8 text-center font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900">
        <Loader2 className="mx-auto mb-3 animate-spin" /> Loading billing dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-black uppercase tracking-wider text-blue-600">Billing Center</p>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white">Subscription & Billing</h1>
        <p className="mt-2 max-w-3xl text-sm font-medium text-slate-500 dark:text-slate-400">Review current subscription usage and compare upgrade plans.</p>
      </div>

      {current?.institution ? (
        <div className="grid gap-4 lg:grid-cols-4">
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white">{current.institution.name}</h2>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">{current.institution.subscriptionPlan}</span>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{current.institution.subscriptionStatus}</span>
                  {current.institution.cancelAtPeriodEnd && <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-700 dark:bg-red-950/40 dark:text-red-300">Cancelling</span>}
                </div>
                <p className="mt-2 text-sm font-bold text-slate-500">Institution code: {current.institution.code}</p>
                <p className="mt-1 text-sm font-bold text-slate-500">Period: {formatDate(current.institution.currentPeriodStart)} - {formatDate(current.institution.currentPeriodEnd)}</p>
              </div>
              <div className="flex flex-col gap-3 md:items-end">
                <div className="flex items-center gap-2 rounded-2xl bg-violet-50 px-4 py-3 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                  <Crown size={18} />
                  <span className="font-black">{currentPlan?.name ?? current.institution.subscriptionPlan}</span>
                </div>
                {current.institution.cancelAtPeriodEnd ? (
                  <button onClick={handleResumeSubscription} className="rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white">Resume</button>
                ) : (
                  <button onClick={handleCancelSubscription} disabled={billingActionLoading || !current.institution.razorpaySubscriptionId} className="rounded-xl bg-red-600 px-4 py-2 font-bold text-white disabled:opacity-50">
                    {billingActionLoading ? 'Cancelling...' : 'Cancel Subscription'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {[
  ['Students', current.usage.students, current.limits.students],
  ['Teachers', current.usage.teachers, current.limits.teachers],
  ['Staff', current.usage.staff, current.limits.staff],
].map(([label, used, total]) => {
  const numericUsed = Number(used);
  const numericTotal = Number(total);
  const percent = usagePercent(numericUsed, numericTotal);
  const warning = getUsageWarning(numericUsed, numericTotal);

  return (
    <div key={label} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <p className="text-sm font-black text-slate-500">{label}</p>
        <TrendingUp size={18} className={percent >= 100 ? 'text-red-600' : percent >= 90 ? 'text-orange-600' : percent >= 80 ? 'text-amber-600' : 'text-blue-600'} />
      </div>

      <p className="mt-3 text-3xl font-black text-slate-900 dark:text-white">
        {numericUsed} / {numericTotal}
      </p>

      <p className="mt-1 text-xs font-bold text-slate-500">
        {percent}% used
      </p>

      <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={`h-full rounded-full ${percent >= 100 ? 'bg-red-600' : percent >= 90 ? 'bg-orange-500' : percent >= 80 ? 'bg-amber-500' : 'bg-blue-600'}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {warning && (
        <div className={`mt-4 rounded-2xl border p-3 text-xs font-bold ${warning.className}`}>
          <p className="font-black">{warning.label}</p>
          <p className="mt-1">{warning.message}</p>
        </div>
      )}
    </div>
  );
})}
        </div>
      ) : (
        <div className="rounded-3xl border border-amber-100 bg-amber-50 p-5 text-sm font-bold text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          Billing details are not available for this account. Use an institution admin account to view current subscription usage.
        </div>
      )}

      <section>
        <h2 className="mb-4 text-2xl font-black text-slate-900 dark:text-white">Available Plans</h2>
        <div className="grid gap-6 xl:grid-cols-4">
          {plans.map((plan) => (
            <div key={plan.code} className={`rounded-3xl border p-6 shadow-sm ${plan.popular ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' : 'border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-900'}`}>
              {plan.popular && <span className="mb-4 inline-block rounded-full bg-blue-600 px-3 py-1 text-xs font-black text-white">Most Popular</span>}
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">{plan.name}</h3>
              <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">{plan.description}</p>
              <p className="mt-5 text-3xl font-black text-slate-900 dark:text-white">{formatPrice(plan.monthlyPriceInPaise)}<span className="text-sm font-bold text-slate-500"> / month</span></p>
              <div className="mt-5 space-y-3">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-3 text-sm font-bold text-slate-600 dark:text-slate-300">
                    <Check size={16} className="text-emerald-600" /> {feature}
                  </div>
                ))}
              </div>
              <button onClick={() => void handleCheckout(plan)} disabled={checkoutPlan === plan.code || !current?.institution} className="mt-6 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white disabled:opacity-60 dark:bg-white dark:text-slate-900">
                {checkoutPlan === plan.code ? 'Starting checkout...' : plan.code === 'FREE_TRIAL' ? 'Current Trial' : 'Upgrade Now'}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-black text-slate-900 dark:text-white">Billing History</h2>
        <div className="overflow-x-auto rounded-3xl border border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-950">
              <tr><th className="p-4">Invoice</th><th className="p-4">Amount</th><th className="p-4">Status</th><th className="p-4">Date</th><th className="p-4">PDF</th></tr>
            </thead>
            <tbody>
              {invoices.length ? invoices.map((invoice) => (
                <tr key={invoice.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="p-4 font-bold text-slate-700 dark:text-slate-200">{invoice.providerInvoiceId ?? invoice.id}</td>
                  <td className="p-4 font-bold text-slate-700 dark:text-slate-200">₹{(invoice.amount / 100).toLocaleString()}</td>
                  <td className="p-4 font-bold text-slate-700 dark:text-slate-200">{invoice.status}</td>
                  <td className="p-4 font-bold text-slate-700 dark:text-slate-200">{formatDate(invoice.paidAt ?? invoice.createdAt)}</td>
                  <td className="p-4">{invoice.pdfUrl ? <a href={invoice.pdfUrl} target="_blank" rel="noreferrer" className="font-bold text-blue-600">Download</a> : '-'}</td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="p-8 text-center text-sm font-bold text-slate-500">No invoices found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

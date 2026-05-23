import React, { useEffect, useMemo, useState } from 'react';
import { Check, Crown, Loader2, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import {
  createBillingCheckout,
  getBillingPlans,
  getCurrentBilling,
  type BillingPlan,
  type CurrentBilling,
} from '../../api/billing';

const formatPrice = (amount: number) => amount === 0 ? 'Custom / Trial' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount / 100);
const usagePercent = (used: number, total: number) => total <= 0 ? 0 : Math.min(100, Math.round((used / total) * 100));

export const BillingDashboard: React.FC = () => {
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [current, setCurrent] = useState<CurrentBilling | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [plansResponse, currentResponse] = await Promise.all([getBillingPlans(), getCurrentBilling()]);
        setPlans(plansResponse.data);
        setCurrent(currentResponse.data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Unable to load billing data');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const currentPlan = useMemo(() => plans.find((plan) => plan.code === current?.institution.subscriptionPlan), [plans, current]);

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

      {current && (
        <div className="grid gap-4 lg:grid-cols-4">
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white">{current.institution.name}</h2>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">{current.institution.subscriptionPlan}</span>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{current.institution.subscriptionStatus}</span>
                </div>
                <p className="mt-2 text-sm font-bold text-slate-500">Institution code: {current.institution.code}</p>
              </div>
              <div className="flex items-center gap-2 rounded-2xl bg-violet-50 px-4 py-3 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                <Crown size={18} />
                <span className="font-black">{currentPlan?.name ?? current.institution.subscriptionPlan}</span>
              </div>
            </div>
          </div>

          {[
            ['Students', current.usage.students, current.limits.students],
            ['Teachers', current.usage.teachers, current.limits.teachers],
            ['Staff', current.usage.staff, current.limits.staff],
          ].map(([label, used, total]) => (
            <div key={label} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <p className="text-sm font-black text-slate-500">{label}</p>
                <TrendingUp size={18} className="text-blue-600" />
              </div>
              <p className="mt-3 text-3xl font-black text-slate-900 dark:text-white">{used} / {total}</p>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-full rounded-full bg-blue-600" style={{ width: `${usagePercent(Number(used), Number(total))}%` }} />
              </div>
            </div>
          ))}
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
              <button
                onClick={() => void handleCheckout(plan)}
                disabled={checkoutPlan === plan.code}
                className="mt-6 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white disabled:opacity-60 dark:bg-white dark:text-slate-900"
              >
                {checkoutPlan === plan.code ? 'Starting checkout...' : plan.code === 'FREE_TRIAL' ? 'Current Trial' : 'Upgrade Now'}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

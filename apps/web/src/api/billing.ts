import { apiClient } from './client';

export interface BillingPlan {
  code: 'FREE_TRIAL' | 'BASIC' | 'PRO' | 'ENTERPRISE';
  name: string;
  description: string;
  monthlyPriceInPaise: number;
  annualPriceInPaise: number;
  currency: 'INR';
  studentLimit: number;
  teacherLimit: number;
  staffLimit: number;
  features: string[];
  popular?: boolean;
}

export interface CurrentBilling {
  institution: {
    id: string;
    name: string;
    code: string;
    subscriptionPlan: BillingPlan['code'];
    subscriptionStatus: string;
    trialEndsAt?: string | null;
    studentLimit: number;
    teacherLimit: number;
    staffLimit: number;
    isActive: boolean;
    razorpaySubscriptionId?: string | null;
    currentPeriodStart?: string | null;
    currentPeriodEnd?: string | null;
    cancelAtPeriodEnd?: boolean;
  };
  usage: {
    students: number;
    teachers: number;
    staff: number;
  };
  limits: {
    students: number;
    teachers: number;
    staff: number;
  };
}

export interface BillingInvoice {
  id: string;
  provider: string;
  providerInvoiceId?: string | null;
  providerPaymentId?: string | null;
  amount: number;
  currency: string;
  status: string;
  hostedUrl?: string | null;
  pdfUrl?: string | null;
  paidAt?: string | null;
  dueAt?: string | null;
  createdAt: string;
}

export interface BillingCheckoutResponse {
  provider: 'razorpay';
  keyId: string;
  subscriptionId: string;
  shortUrl?: string;
  plan: BillingPlan['code'];
  interval: 'monthly' | 'annual';
}

export const getBillingPlans = async () => (
  apiClient<{ success: boolean; data: BillingPlan[] }>('/billing/plans')
);

export const getCurrentBilling = async () => (
  apiClient<{ success: boolean; data: CurrentBilling }>('/billing/current')
);

export const getBillingInvoices = async () => (
  apiClient<{ success: boolean; data: BillingInvoice[] }>('/billing/invoices')
);

export const createBillingCheckout = async (plan: BillingPlan['code'], interval: 'monthly' | 'annual') => (
  apiClient<{ success: boolean; data: BillingCheckoutResponse }>('/billing/checkout', {
    method: 'POST',
    body: JSON.stringify({ plan, interval }),
  })
);

export const cancelBillingSubscription = async () => (
  apiClient<{ success: boolean; data: CurrentBilling['institution'] }>('/billing/cancel', { method: 'POST' })
);

export const resumeBillingSubscription = async () => (
  apiClient<{ success: boolean; data: CurrentBilling['institution'] }>('/billing/resume', { method: 'POST' })
);

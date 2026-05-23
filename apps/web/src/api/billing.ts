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

export const getBillingPlans = async () => (
  apiClient<{ success: boolean; data: BillingPlan[] }>('/billing/plans')
);

export const getCurrentBilling = async () => (
  apiClient<{ success: boolean; data: CurrentBilling }>('/billing/current')
);

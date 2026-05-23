import { SubscriptionPlan } from '@prisma/client';

export interface BillingPlanConfig {
  code: SubscriptionPlan;
  name: string;
  description: string;
  monthlyPriceInPaise: number;
  annualPriceInPaise: number;
  currency: 'INR';
  studentLimit: number;
  teacherLimit: number;
  staffLimit: number;
  features: string[];
  razorpayMonthlyPlanId?: string;
  razorpayAnnualPlanId?: string;
  popular?: boolean;
}

export const billingPlans: Record<SubscriptionPlan, BillingPlanConfig> = {
  FREE_TRIAL: {
    code: SubscriptionPlan.FREE_TRIAL,
    name: 'Free Trial',
    description: 'For evaluation and early onboarding.',
    monthlyPriceInPaise: 0,
    annualPriceInPaise: 0,
    currency: 'INR',
    studentLimit: 100,
    teacherLimit: 10,
    staffLimit: 10,
    features: ['14-day trial', 'Basic attendance', 'Student import', 'Reports export'],
  },
  BASIC: {
    code: SubscriptionPlan.BASIC,
    name: 'Basic',
    description: 'For small colleges and departments.',
    monthlyPriceInPaise: 499900,
    annualPriceInPaise: 4999000,
    currency: 'INR',
    studentLimit: 500,
    teacherLimit: 50,
    staffLimit: 25,
    features: ['Attendance management', 'CSV/Excel import', 'Reports', 'Email support'],
    razorpayMonthlyPlanId: process.env.RAZORPAY_BASIC_MONTHLY_PLAN_ID,
    razorpayAnnualPlanId: process.env.RAZORPAY_BASIC_ANNUAL_PLAN_ID,
  },
  PRO: {
    code: SubscriptionPlan.PRO,
    name: 'Pro',
    description: 'For growing institutions needing automation.',
    monthlyPriceInPaise: 999900,
    annualPriceInPaise: 9999000,
    currency: 'INR',
    studentLimit: 2500,
    teacherLimit: 200,
    staffLimit: 100,
    features: ['Everything in Basic', 'Notifications', 'Analytics', 'Audit logs', 'Priority support'],
    razorpayMonthlyPlanId: process.env.RAZORPAY_PRO_MONTHLY_PLAN_ID,
    razorpayAnnualPlanId: process.env.RAZORPAY_PRO_ANNUAL_PLAN_ID,
    popular: true,
  },
  ENTERPRISE: {
    code: SubscriptionPlan.ENTERPRISE,
    name: 'Enterprise',
    description: 'For large institutions and multi-campus rollouts.',
    monthlyPriceInPaise: 0,
    annualPriceInPaise: 0,
    currency: 'INR',
    studentLimit: 100000,
    teacherLimit: 10000,
    staffLimit: 10000,
    features: ['Unlimited scale', 'Custom onboarding', 'Dedicated support', 'Custom integrations'],
    razorpayMonthlyPlanId: process.env.RAZORPAY_ENTERPRISE_MONTHLY_PLAN_ID,
    razorpayAnnualPlanId: process.env.RAZORPAY_ENTERPRISE_ANNUAL_PLAN_ID,
  },
};

export const getBillingPlans = () => Object.values(billingPlans);

export const getBillingPlan = (plan: SubscriptionPlan) => billingPlans[plan];

export const getPlanLimits = (plan: SubscriptionPlan) => {
  const config = getBillingPlan(plan);
  return {
    students: config.studentLimit,
    teachers: config.teacherLimit,
    staff: config.staffLimit,
  };
};

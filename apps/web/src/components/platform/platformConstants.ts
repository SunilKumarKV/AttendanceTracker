import type { InstitutionPayload, SubscriptionPlan, SubscriptionStatus } from '../../api/platform';

export type StatusFilter = 'ALL' | SubscriptionStatus | 'SUSPENDED';

export const emptyInstitutionForm: InstitutionPayload = {
  name: '',
  code: '',
  email: '',
  phone: '',
  address: '',
  contactPerson: '',
  academicYear: '2026-27',
  subscriptionPlan: 'FREE_TRIAL',
  subscriptionStatus: 'TRIALING',
  studentLimit: 100,
  teacherLimit: 10,
  staffLimit: 10,
  isActive: true,
};

export const platformPlans: SubscriptionPlan[] = ['FREE_TRIAL', 'BASIC', 'PRO', 'ENTERPRISE'];
export const platformStatuses: SubscriptionStatus[] = ['TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED'];

export const planStyles: Record<SubscriptionPlan, string> = {
  FREE_TRIAL: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  BASIC: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  PRO: 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
  ENTERPRISE: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
};

export const statusStyles: Record<SubscriptionStatus, string> = {
  TRIALING: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  ACTIVE: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  PAST_DUE: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  CANCELLED: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  EXPIRED: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300',
};

export const generateTemporaryPassword = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const randomPart = Array.from({ length: 10 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
  return `Atp@${randomPart}26`;
};

export const progressWidth = (used: number, limit: number) => `${Math.min(100, Math.round((used / Math.max(1, limit)) * 100))}%`;

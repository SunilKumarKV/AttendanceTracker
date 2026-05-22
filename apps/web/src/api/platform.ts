import { apiClient } from './client';

export type SubscriptionPlan = 'FREE_TRIAL' | 'BASIC' | 'PRO' | 'ENTERPRISE';
export type SubscriptionStatus = 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED';

export interface Institution {
  id: string;
  name: string;
  code: string;
  logoUrl?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  contactPerson?: string | null;
  academicYear?: string | null;
  subscriptionPlan: SubscriptionPlan;
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt?: string | null;
  studentLimit: number;
  teacherLimit: number;
  staffLimit: number;
  isActive: boolean;
  _count?: { users: number; students: number; professorProfiles: number; staffMembers: number };
}

export interface PlatformDashboardData {
  totalInstitutions: number;
  activeInstitutions: number;
  inactiveInstitutions: number;
  totalUsers: number;
  totalStudents: number;
  planOverview: Array<{ plan: SubscriptionPlan; count: number }>;
  subscriptionStatusOverview: Array<{ status: SubscriptionStatus; count: number }>;
}

export interface InstitutionPayload {
  name: string;
  code?: string;
  logoUrl?: string;
  email?: string;
  phone?: string;
  address?: string;
  contactPerson?: string;
  academicYear?: string;
  subscriptionPlan?: SubscriptionPlan;
  subscriptionStatus?: SubscriptionStatus;
  studentLimit?: number;
  teacherLimit?: number;
  staffLimit?: number;
  isActive?: boolean;
}

export const getPlatformDashboard = () => apiClient<{ success: boolean; data: PlatformDashboardData }>('/platform/dashboard');
export const listInstitutions = () => apiClient<{ success: boolean; data: Institution[] }>('/platform/institutions');
export const createInstitution = (payload: InstitutionPayload) => apiClient<{ success: boolean; data: Institution }>('/platform/institutions', { method: 'POST', body: JSON.stringify(payload) });
export const updateInstitution = (id: string, payload: Partial<InstitutionPayload>) => apiClient<{ success: boolean; data: Institution }>(`/platform/institutions/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
export const createInstitutionAdmin = (id: string, payload: { name: string; email: string; password: string }) => apiClient<{ success: boolean; data: { id: string; email: string } }>(`/platform/institutions/${id}/admins`, { method: 'POST', body: JSON.stringify(payload) });

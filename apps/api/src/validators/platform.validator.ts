import { z } from 'zod';

const plan = z.enum(['FREE_TRIAL', 'BASIC', 'PRO', 'ENTERPRISE']);
const status = z.enum(['TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED']);

export const institutionSchema = z.object({
  name: z.string().trim().min(2),
  code: z.string().trim().min(2).max(32).optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  address: z.string().trim().max(1000).optional().or(z.literal('')),
  contactPerson: z.string().trim().max(120).optional().or(z.literal('')),
  academicYear: z.string().trim().max(20).optional(),
  subscriptionPlan: plan.optional(),
  subscriptionStatus: status.optional(),
  trialEndsAt: z.string().datetime().optional().or(z.literal('')),
  studentLimit: z.coerce.number().int().min(1).optional(),
  teacherLimit: z.coerce.number().int().min(1).optional(),
  staffLimit: z.coerce.number().int().min(1).optional(),
  featureFlags: z.record(z.string(), z.boolean()).optional(),
  isActive: z.boolean().optional(),
});

export const institutionUpdateSchema = institutionSchema.partial();

export const institutionAdminSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(8).max(128),
});

export const institutionAdminPasswordResetSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(12).max(128),
});

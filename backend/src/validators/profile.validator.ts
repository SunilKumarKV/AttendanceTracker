import { z } from 'zod';

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  email: z.string().trim().email().toLowerCase().optional(),
  phone: z.string().trim().optional(),
  department: z.string().trim().optional(),
  avatarDataUrl: z.string().trim().optional().nullable(),
  preferences: z.record(z.string(), z.unknown()).optional(),
});

const passwordRules = z.string().min(8, 'Password must be at least 8 characters').max(128)
  .regex(/[A-Z]/, 'Password must include an uppercase letter')
  .regex(/[a-z]/, 'Password must include a lowercase letter')
  .regex(/[0-9]/, 'Password must include a number');

export const profilePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordRules,
});

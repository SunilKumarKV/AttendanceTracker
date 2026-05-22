import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(1),
  institutionCode: z.string().trim().max(32).optional().or(z.literal('')),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(32).optional(),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(32).optional(),
});

const passwordRules = z.string().min(8, 'Password must be at least 8 characters').max(128)
  .regex(/[A-Z]/, 'Password must include an uppercase letter')
  .regex(/[a-z]/, 'Password must include a lowercase letter')
  .regex(/[0-9]/, 'Password must include a number');

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordRules,
});

export const forgotPasswordSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordRules,
});

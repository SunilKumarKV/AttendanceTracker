import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(32),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(32).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
});

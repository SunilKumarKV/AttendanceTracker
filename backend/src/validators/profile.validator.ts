import { z } from 'zod';

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  email: z.string().trim().email().toLowerCase().optional(),
  phone: z.string().trim().optional(),
  department: z.string().trim().optional(),
  avatarDataUrl: z.string().trim().optional().nullable(),
  preferences: z.record(z.string(), z.unknown()).optional(),
});

export const profilePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

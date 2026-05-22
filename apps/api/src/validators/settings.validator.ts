import { z } from 'zod';

export const appSettingsSchema = z.object({
  institution: z.object({
    name: z.string().trim().min(1).optional(),
    email: z.string().trim().email().optional().or(z.literal('')),
    phone: z.string().trim().optional(),
    address: z.string().trim().optional(),
  }).optional(),
  academicYear: z.string().trim().optional(),
  principalName: z.string().trim().optional(),
  theme: z.enum(['light', 'dark']).optional(),
  attendanceLockAfterSubmit: z.boolean().optional(),
  timezone: z.string().trim().optional(),
});

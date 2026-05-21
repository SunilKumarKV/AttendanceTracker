import { z } from 'zod';

export const notificationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().optional(),
  channel: z.string().trim().optional(),
  status: z.string().trim().optional(),
  type: z.string().trim().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});

export const testNotificationSchema = z.object({
  channel: z.enum(['email', 'sms', 'whatsapp']).default('email'),
  recipient: z.string().trim().min(1).optional(),
  rule: z.enum(['absent_alert', 'low_attendance_alert', 'monthly_report_alert']).default('low_attendance_alert'),
  studentId: z.string().trim().optional(),
});

export const notificationSettingsSchema = z.object({
  minimumAttendancePct: z.number().int().min(0).max(100).optional(),
  notificationEnabled: z.boolean().optional(),
  absentAlertsEnabled: z.boolean().optional(),
  lowAttendanceAlertsEnabled: z.boolean().optional(),
  monthlyReportsEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  whatsappEnabled: z.boolean().optional(),
  supportEmail: z.string().trim().email().optional().or(z.literal('')),
});

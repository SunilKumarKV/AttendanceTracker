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
  warningAttendancePct: z.number().int().min(0).max(100).optional(),
  criticalAttendancePct: z.number().int().min(0).max(100).optional(),
  severeAttendancePct: z.number().int().min(0).max(100).optional(),
  notificationEnabled: z.boolean().optional(),
  absentAlertsEnabled: z.boolean().optional(),
  lowAttendanceAlertsEnabled: z.boolean().optional(),
  monthlyReportsEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  whatsappEnabled: z.boolean().optional(),
  alertTimingPreference: z.string().trim().max(50).optional(),
  supportEmail: z.string().trim().email().optional().or(z.literal('')),
});


export const templateSchema = z.object({
  key: z.enum(['low_attendance_warning', 'low_attendance_critical', 'low_attendance_severe', 'monthly_report']),
  channel: z.enum(['email', 'whatsapp']),
  name: z.string().trim().min(2).max(120),
  subject: z.string().trim().max(160).optional().or(z.literal('')),
  body: z.string().trim().min(10).max(2000),
  isActive: z.boolean().optional(),
});

export const templateUpdateSchema = templateSchema.partial().refine((data) => Object.keys(data).length > 0, { message: 'At least one field is required' });

export const sendStudentAlertSchema = z.object({
  studentId: z.string().trim().min(1),
  channel: z.enum(['email', 'whatsapp']),
  type: z.enum(['low_attendance_alert', 'monthly_report_alert']),
  recipientType: z.enum(['student', 'parent']).default('parent'),
  manual: z.boolean().optional().default(false),
});

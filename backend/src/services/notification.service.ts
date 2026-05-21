import { Prisma } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { getPagination, toPaginatedResponse } from '../utils/pagination.js';
import { requireInstitutionId } from './adminContext.service.js';
import { providers } from './notificationProviders.js';
import { notificationQuerySchema, notificationSettingsSchema, testNotificationSchema } from '../validators/notification.validator.js';

interface NotificationContext {
  userId?: string;
  institutionId?: string | null;
}

const defaultNotificationSettings = {
  absentAlertsEnabled: true,
  lowAttendanceAlertsEnabled: true,
  monthlyReportsEnabled: true,
  emailEnabled: true,
  smsEnabled: false,
  whatsappEnabled: true,
  alertTimingPreference: '08:00',
  supportEmail: '',
  warningAttendancePct: 75,
  criticalAttendancePct: 55,
  severeAttendancePct: 45,
};

const parseJsonSettings = (settings: Prisma.JsonValue | null | undefined) => {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    return defaultNotificationSettings;
  }
  return { ...defaultNotificationSettings, ...(settings as Record<string, unknown>) };
};

export const getNotificationSettings = async (context: NotificationContext) => {
  const institutionId = requireInstitutionId(context.institutionId);
  const settings = await prisma.appSettings.upsert({
    where: { institutionId },
    update: {},
    create: { institutionId, settings: defaultNotificationSettings },
  });
  const values = parseJsonSettings(settings.settings);
  return {
    minimumAttendancePct: settings.minimumAttendancePct,
    notificationEnabled: settings.notificationEnabled,
    absentAlertsEnabled: Boolean(values.absentAlertsEnabled),
    lowAttendanceAlertsEnabled: Boolean(values.lowAttendanceAlertsEnabled),
    monthlyReportsEnabled: Boolean(values.monthlyReportsEnabled),
    emailEnabled: Boolean(values.emailEnabled),
    smsEnabled: Boolean(values.smsEnabled),
    whatsappEnabled: Boolean(values.whatsappEnabled),
    alertTimingPreference: String(values.alertTimingPreference || defaultNotificationSettings.alertTimingPreference),
    supportEmail: String(values.supportEmail || env.supportEmail),
    warningAttendancePct: Number(values.warningAttendancePct || settings.minimumAttendancePct || defaultNotificationSettings.warningAttendancePct),
    criticalAttendancePct: Number(values.criticalAttendancePct || defaultNotificationSettings.criticalAttendancePct),
    severeAttendancePct: Number(values.severeAttendancePct || defaultNotificationSettings.severeAttendancePct),
    smtpConfigured: Boolean(env.smtp.host && env.smtp.user && env.smtp.pass),
    smsConfigured: Boolean(env.twilio.accountSid && env.twilio.authToken && env.twilio.fromNumber),
    whatsappConfigured: Boolean((env.whatsappCloud.token && env.whatsappCloud.phoneNumberId) || (env.twilio.accountSid && env.twilio.authToken && env.twilio.whatsappFrom)),
  };
};

export const updateNotificationSettings = async (context: NotificationContext, rawData: unknown) => {
  const institutionId = requireInstitutionId(context.institutionId);
  const data = notificationSettingsSchema.parse(rawData);
  const current = await getNotificationSettings(context);
  const nextJsonSettings = {
    absentAlertsEnabled: data.absentAlertsEnabled ?? current.absentAlertsEnabled,
    lowAttendanceAlertsEnabled: data.lowAttendanceAlertsEnabled ?? current.lowAttendanceAlertsEnabled,
    monthlyReportsEnabled: data.monthlyReportsEnabled ?? current.monthlyReportsEnabled,
    emailEnabled: data.emailEnabled ?? current.emailEnabled,
    smsEnabled: data.smsEnabled ?? current.smsEnabled,
    whatsappEnabled: data.whatsappEnabled ?? current.whatsappEnabled,
    alertTimingPreference: data.alertTimingPreference ?? current.alertTimingPreference,
    supportEmail: data.supportEmail ?? current.supportEmail,
    warningAttendancePct: data.warningAttendancePct ?? current.warningAttendancePct,
    criticalAttendancePct: data.criticalAttendancePct ?? current.criticalAttendancePct,
    severeAttendancePct: data.severeAttendancePct ?? current.severeAttendancePct,
  };
  const settings = await prisma.appSettings.upsert({
    where: { institutionId },
    update: {
      minimumAttendancePct: data.minimumAttendancePct,
      notificationEnabled: data.notificationEnabled,
      settings: nextJsonSettings,
    },
    create: {
      institutionId,
      minimumAttendancePct: data.minimumAttendancePct ?? 75,
      notificationEnabled: data.notificationEnabled ?? true,
      settings: nextJsonSettings,
    },
  });
  return {
    ...parseJsonSettings(settings.settings),
    minimumAttendancePct: settings.minimumAttendancePct,
    notificationEnabled: settings.notificationEnabled,
    smtpConfigured: Boolean(env.smtp.host && env.smtp.user && env.smtp.pass),
    smsConfigured: Boolean(env.twilio.accountSid && env.twilio.authToken && env.twilio.fromNumber),
    whatsappConfigured: Boolean((env.whatsappCloud.token && env.whatsappCloud.phoneNumberId) || (env.twilio.accountSid && env.twilio.authToken && env.twilio.whatsappFrom)),
  };
};

const dateRange = (fromDate?: string, toDate?: string) => {
  const range: Prisma.DateTimeFilter = {};
  if (fromDate) {
    const from = new Date(fromDate);
    if (Number.isNaN(from.getTime())) throw new AppError('Invalid fromDate', StatusCodes.BAD_REQUEST);
    from.setHours(0, 0, 0, 0);
    range.gte = from;
  }
  if (toDate) {
    const to = new Date(toDate);
    if (Number.isNaN(to.getTime())) throw new AppError('Invalid toDate', StatusCodes.BAD_REQUEST);
    to.setHours(23, 59, 59, 999);
    range.lte = to;
  }
  return Object.keys(range).length ? range : undefined;
};

const logInclude = {
  student: {
    select: {
      id: true,
      name: true,
      rollNumber: true,
      course: { select: { name: true } },
      section: { select: { name: true } },
    },
  },
} satisfies Prisma.NotificationLogInclude;

const toNotificationDto = (log: Prisma.NotificationLogGetPayload<{ include: typeof logInclude }>) => ({
  id: log.id,
  createdAt: log.createdAt.toISOString(),
  sentAt: log.sentAt?.toISOString() ?? null,
  channel: log.channel,
  recipient: log.recipient,
  subject: log.subject,
  message: log.message,
  status: log.status,
  provider: log.provider,
  providerRef: log.providerRef,
  recipientType: log.recipientType ?? 'General',
  reason: log.reason ?? '',
  attendanceSessionId: log.attendanceSessionId ?? null,
  studentId: log.studentId,
  studentName: log.student?.name ?? '',
  rollNo: log.student?.rollNumber ?? '',
  className: log.student?.course.name ?? '',
  sectionName: log.student?.section.name ?? '',
  type: log.type ?? (log.subject?.includes('Monthly') ? 'Monthly Report' : log.subject?.includes('Absent') ? 'Absent Alert' : 'Low Attendance'),
});

export const listNotifications = async (context: NotificationContext, rawQuery: unknown) => {
  const institutionId = requireInstitutionId(context.institutionId);
  const query = notificationQuerySchema.parse(rawQuery);
  const { page, pageSize, skip, take, search } = getPagination(query);
  const typeSubjectSearch = query.type === 'Monthly Report'
    ? 'Monthly'
    : query.type === 'Absent Alert'
      ? 'Absent'
      : query.type === 'Low Attendance'
        ? 'Low Attendance'
        : query.type;
  const where: Prisma.NotificationLogWhereInput = {
    institutionId,
    ...(query.channel ? { channel: query.channel } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(typeSubjectSearch ? { subject: { contains: typeSubjectSearch, mode: 'insensitive' } } : {}),
    ...(dateRange(query.fromDate, query.toDate) ? { createdAt: dateRange(query.fromDate, query.toDate) } : {}),
    ...(search ? {
      OR: [
        { recipient: { contains: search, mode: 'insensitive' } },
        { message: { contains: search, mode: 'insensitive' } },
        { student: { name: { contains: search, mode: 'insensitive' } } },
        { student: { rollNumber: { contains: search, mode: 'insensitive' } } },
      ],
    } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.notificationLog.findMany({ where, include: logInclude, skip, take, orderBy: { createdAt: 'desc' } }),
    prisma.notificationLog.count({ where }),
  ]);
  return toPaginatedResponse(items.map(toNotificationDto), total, page, pageSize);
};

const calculateStudentAttendance = async (studentId: string) => {
  const records = await prisma.attendanceRecord.findMany({ where: { studentId }, select: { status: true } });
  const total = records.length;
  const attended = records.filter((record) => record.status === 'PRESENT' || record.status === 'LATE').length;
  return { total, attended, percentage: total === 0 ? 100 : Number(((attended / total) * 100).toFixed(1)) };
};

const severityForPercentage = (percentage: number, settings: Awaited<ReturnType<typeof getNotificationSettings>>) => {
  if (percentage <= settings.severeAttendancePct) return 'SEVERE';
  if (percentage <= settings.criticalAttendancePct) return 'CRITICAL';
  if (percentage < settings.warningAttendancePct) return 'WARNING';
  return 'OK';
};

const messageForRule = async (rule: string, studentId?: string, settings?: Awaited<ReturnType<typeof getNotificationSettings>>) => {
  const student = studentId
    ? await prisma.student.findUnique({ where: { id: studentId }, include: { course: true, section: true } })
    : null;
  const studentName = student?.name ?? 'Test Student';
  const rollNo = student?.rollNumber ?? 'TEST-001';
  const stats = student ? await calculateStudentAttendance(student.id) : { total: 30, attended: 20, percentage: 66.7 };
  const level = settings ? severityForPercentage(stats.percentage, settings) : 'WARNING';
  const courseLine = student ? `${student.course.name} / ${student.section.name}` : 'Demo Class';

  if (rule === 'absent_alert') {
    return { student, subject: 'Absent Alert', message: `AttendancePro Alert: ${studentName} (${rollNo}) was marked absent today. Class: ${courseLine}. Please contact the institution if this needs correction.` };
  }
  if (rule === 'monthly_report_alert') {
    return { student, subject: 'Monthly Attendance Report', message: `Monthly attendance report for ${studentName} (${rollNo}) - ${courseLine}: ${stats.percentage}% attendance (${stats.attended}/${stats.total}).` };
  }
  const target = settings?.warningAttendancePct ?? 75;
  const action = level === 'SEVERE'
    ? 'Immediate parent/HOD intervention is required.'
    : level === 'CRITICAL'
      ? 'Parent notification and counselling are recommended.'
      : 'Please improve attendance to avoid shortage.';
  return { student, subject: `${level === 'OK' ? '' : level + ' '}Low Attendance Alert`.trim(), message: `AttendancePro Alert: ${studentName} (${rollNo}) has ${stats.percentage}% attendance (${stats.attended}/${stats.total}), below the required ${target}%. Class: ${courseLine}. ${action}`, attendancePercentage: stats.percentage, severity: level };
};

export const sendNotification = async (context: NotificationContext, data: {
  channel: 'email' | 'sms' | 'whatsapp';
  recipient: string;
  recipientType?: string;
  type?: string;
  subject: string;
  message: string;
  studentId?: string | null;
  attendanceSessionId?: string | null;
  reason?: string | null;
}) => {
  const institutionId = requireInstitutionId(context.institutionId);
  const settings = await getNotificationSettings(context);
  const disabledReason = data.channel === 'email' && !settings.emailEnabled
    ? 'Email channel is disabled'
    : data.channel === 'sms' && !settings.smsEnabled
      ? 'SMS channel is disabled'
      : data.channel === 'whatsapp' && !settings.whatsappEnabled
        ? 'WhatsApp channel is disabled'
        : null;
  if (disabledReason) {
    const log = await prisma.notificationLog.create({
      data: {
        institutionId,
        studentId: data.studentId ?? null,
        attendanceSessionId: data.attendanceSessionId ?? null,
        channel: data.channel,
        recipient: data.recipient,
        recipientType: data.recipientType ?? (data.studentId ? 'Guardian' : 'Admin'),
        type: data.type ?? data.subject,
        subject: data.subject,
        message: data.message,
        status: 'Skipped',
        provider: data.channel,
        reason: data.reason ?? disabledReason,
      },
      include: logInclude,
    });
    return toNotificationDto(log);
  }
  const provider = providers[data.channel];
  const result = await provider.send({ to: data.recipient, subject: data.subject, message: data.message });
  const status = result.status === 'SENT' ? 'Delivered' : result.status === 'SKIPPED' ? 'Skipped' : 'Failed';
  const log = await prisma.notificationLog.create({
    data: {
      institutionId,
      studentId: data.studentId ?? null,
      attendanceSessionId: data.attendanceSessionId ?? null,
      channel: data.channel,
      recipient: data.recipient,
      recipientType: data.recipientType ?? (data.studentId ? 'Guardian' : 'Admin'),
      type: data.type ?? data.subject,
      subject: data.subject,
      message: result.error ? `${data.message}\n\nDelivery note: ${result.error}` : data.message,
      status,
      provider: data.channel,
      providerRef: result.providerRef,
      reason: data.reason ?? result.error ?? null,
      sentAt: result.status === 'SENT' ? new Date() : null,
    },
    include: logInclude,
  });
  return toNotificationDto(log);
};

export const sendTestNotification = async (context: NotificationContext, rawData: unknown) => {
  const institutionId = requireInstitutionId(context.institutionId);
  const data = testNotificationSchema.parse(rawData);
  const settings = await getNotificationSettings(context);
  if (!settings.notificationEnabled) throw new AppError('Notifications are disabled', StatusCodes.BAD_REQUEST);
  const composed = await messageForRule(data.rule, data.studentId, settings);
  const recipient = data.recipient
    ?? (data.channel === 'email' ? settings.supportEmail || env.supportEmail : composed.student?.parentPhone || composed.student?.phone || 'not-configured');
  return sendNotification({
    ...context,
    institutionId,
  }, {
    channel: data.channel,
    recipient,
    subject: composed.subject,
    message: composed.message,
    studentId: composed.student?.id ?? null,
    type: composed.subject,
    recipientType: composed.student ? 'Guardian' : 'Admin',
  });
};

const logSkippedRule = async (
  context: NotificationContext,
  studentId: string,
  channel: 'email' | 'sms' | 'whatsapp',
  rule: string,
  reason: string,
  attendanceSessionId?: string | null,
) => {
  const settings = await getNotificationSettings(context);
  const composed = await messageForRule(rule, studentId, settings);
  return sendNotification(context, {
    channel,
    recipient: 'not-configured',
    recipientType: 'Guardian',
    type: composed.subject,
    subject: composed.subject,
    message: composed.message,
    studentId: composed.student?.id ?? studentId,
    attendanceSessionId,
    reason,
  });
};

export const sendAbsentAlert = async (context: NotificationContext, studentId: string, channel: 'email' | 'sms' | 'whatsapp' = 'email', attendanceSessionId?: string | null) => {
  const settings = await getNotificationSettings(context);
  if (!settings.notificationEnabled || !settings.absentAlertsEnabled) {
    return logSkippedRule(context, studentId, channel, 'absent_alert', 'Absent alerts are disabled', attendanceSessionId);
  }
  const composed = await messageForRule('absent_alert', studentId, settings);
  const recipient = channel === 'email' ? settings.supportEmail || env.supportEmail : composed.student?.parentPhone || composed.student?.phone || 'not-configured';
  return sendNotification(context, {
    channel,
    recipient,
    recipientType: channel === 'email' ? 'Admin' : 'Guardian',
    type: 'Absent Alert',
    subject: composed.subject,
    message: composed.message,
    studentId: composed.student?.id ?? studentId,
    attendanceSessionId,
  });
};

export const sendLowAttendanceAlert = async (context: NotificationContext, studentId: string, channel: 'email' | 'sms' | 'whatsapp' = 'email') => {
  const settings = await getNotificationSettings(context);
  if (!settings.notificationEnabled || !settings.lowAttendanceAlertsEnabled) {
    return logSkippedRule(context, studentId, channel, 'low_attendance_alert', 'Low attendance alerts are disabled');
  }
  const composed = await messageForRule('low_attendance_alert', studentId, settings);
  const recipient = channel === 'email' ? settings.supportEmail || env.supportEmail : composed.student?.parentPhone || composed.student?.phone || 'not-configured';
  return sendNotification(context, {
    channel,
    recipient,
    recipientType: channel === 'email' ? 'Admin' : 'Guardian',
    type: 'Low Attendance',
    subject: composed.subject,
    message: composed.message,
    studentId: composed.student?.id ?? studentId,
  });
};

export const sendMonthlyReportAlert = async (context: NotificationContext, studentId: string, channel: 'email' | 'sms' | 'whatsapp' = 'email') => {
  const settings = await getNotificationSettings(context);
  if (!settings.notificationEnabled || !settings.monthlyReportsEnabled) {
    return logSkippedRule(context, studentId, channel, 'monthly_report_alert', 'Monthly report alerts are disabled');
  }
  const composed = await messageForRule('monthly_report_alert', studentId, settings);
  const recipient = channel === 'email' ? settings.supportEmail || env.supportEmail : composed.student?.parentPhone || composed.student?.phone || 'not-configured';
  return sendNotification(context, {
    channel,
    recipient,
    recipientType: channel === 'email' ? 'Admin' : 'Guardian',
    type: 'Monthly Report',
    subject: composed.subject,
    message: composed.message,
    studentId: composed.student?.id ?? studentId,
  });
};


export const runLowAttendanceSweep = async (context: NotificationContext) => {
  const institutionId = requireInstitutionId(context.institutionId);
  const settings = await getNotificationSettings(context);
  if (!settings.notificationEnabled || !settings.lowAttendanceAlertsEnabled) {
    throw new AppError('Low attendance notifications are disabled', StatusCodes.BAD_REQUEST);
  }

  const students = await prisma.student.findMany({
    where: { institutionId, isActive: true },
    include: { course: true, section: true },
    orderBy: [{ course: { name: 'asc' } }, { section: { name: 'asc' } }, { rollNumber: 'asc' }],
  });

  const outcomes = [] as { status: string }[];
  for (const student of students) {
    const stats = await calculateStudentAttendance(student.id);
    const severity = severityForPercentage(stats.percentage, settings);
    if (stats.total === 0 || severity === 'OK') continue;

    const channels: ('email' | 'sms' | 'whatsapp')[] = [];
    if (settings.whatsappEnabled) channels.push('whatsapp');
    if (settings.smsEnabled && (severity === 'CRITICAL' || severity === 'SEVERE')) channels.push('sms');
    if (settings.emailEnabled && severity === 'SEVERE') channels.push('email');
    if (channels.length === 0) channels.push('email');

    for (const channel of channels) {
      const composed = await messageForRule('low_attendance_alert', student.id, settings);
      const recipient = channel === 'email' ? settings.supportEmail || env.supportEmail : student.parentPhone || student.phone || 'not-configured';
      const log = await sendNotification(context, {
        channel,
        recipient,
        recipientType: channel === 'email' ? 'HOD/Admin' : severity === 'WARNING' ? 'Student/Guardian' : 'Guardian',
        type: `${severity} Low Attendance`,
        subject: composed.subject,
        message: composed.message,
        studentId: student.id,
        reason: `Automated ${severity.toLowerCase()} threshold sweep`,
      });
      outcomes.push({ status: log.status });
    }
  }

  return {
    processed: outcomes.length,
    delivered: outcomes.filter((item) => item.status === 'Delivered').length,
    skipped: outcomes.filter((item) => item.status === 'Skipped').length,
    failed: outcomes.filter((item) => item.status === 'Failed').length,
  };
};

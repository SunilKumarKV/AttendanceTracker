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
  whatsappEnabled: false,
  supportEmail: '',
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
    supportEmail: String(values.supportEmail || env.supportEmail),
    smtpConfigured: Boolean(env.smtp.host && env.smtp.user && env.smtp.pass),
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
    supportEmail: data.supportEmail ?? current.supportEmail,
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
  studentId: log.studentId,
  studentName: log.student?.name ?? '',
  rollNo: log.student?.rollNumber ?? '',
  className: log.student?.course.name ?? '',
  sectionName: log.student?.section.name ?? '',
  type: log.subject?.includes('Monthly') ? 'Monthly Report' : log.subject?.includes('Absent') ? 'Absent Alert' : 'Low Attendance',
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
  const records = await prisma.attendanceRecord.findMany({
    where: { studentId },
    select: { status: true },
  });
  const total = records.length;
  const attended = records.filter((record) => ['PRESENT', 'LATE', 'EXCUSED'].includes(record.status)).length;
  return total === 0 ? 0 : Number(((attended / total) * 100).toFixed(1));
};

const messageForRule = async (rule: string, studentId?: string) => {
  const student = studentId
    ? await prisma.student.findUnique({ where: { id: studentId }, include: { course: true, section: true } })
    : null;
  const studentName = student?.name ?? 'Test Student';
  const rollNo = student?.rollNumber ?? 'TEST-001';
  const attendancePercentage = student ? await calculateStudentAttendance(student.id) : 68;

  if (rule === 'absent_alert') {
    return {
      student,
      subject: 'Absent Alert',
      message: `${studentName} (${rollNo}) was marked absent today. Please contact the institution for any correction.`,
    };
  }
  if (rule === 'monthly_report_alert') {
    return {
      student,
      subject: 'Monthly Attendance Report',
      message: `Monthly attendance report for ${studentName} (${rollNo}): ${attendancePercentage}% attendance.`,
    };
  }
  return {
    student,
    subject: 'Low Attendance Alert',
    message: `${studentName} (${rollNo}) has ${attendancePercentage}% attendance, which is below the required threshold.`,
  };
};

export const sendNotification = async (context: NotificationContext, data: {
  channel: 'email' | 'sms' | 'whatsapp';
  recipient: string;
  subject: string;
  message: string;
  studentId?: string | null;
}) => {
  const institutionId = requireInstitutionId(context.institutionId);
  const provider = providers[data.channel];
  const result = await provider.send({ to: data.recipient, subject: data.subject, message: data.message });
  const status = result.status === 'SENT' ? 'Delivered' : result.status === 'SKIPPED' ? 'Skipped' : 'Failed';
  const log = await prisma.notificationLog.create({
    data: {
      institutionId,
      studentId: data.studentId ?? null,
      channel: data.channel,
      recipient: data.recipient,
      subject: data.subject,
      message: result.error ? `${data.message}\n\nDelivery note: ${result.error}` : data.message,
      status,
      provider: data.channel,
      providerRef: result.providerRef,
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
  const composed = await messageForRule(data.rule, data.studentId);
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
  });
};

export const sendAbsentAlert = async (context: NotificationContext, studentId: string, channel: 'email' | 'sms' | 'whatsapp' = 'email') => {
  const settings = await getNotificationSettings(context);
  if (!settings.notificationEnabled || !settings.absentAlertsEnabled) {
    throw new AppError('Absent alerts are disabled', StatusCodes.BAD_REQUEST);
  }
  const composed = await messageForRule('absent_alert', studentId);
  const recipient = channel === 'email' ? settings.supportEmail || env.supportEmail : composed.student?.parentPhone || composed.student?.phone || 'not-configured';
  return sendNotification(context, {
    channel,
    recipient,
    subject: composed.subject,
    message: composed.message,
    studentId: composed.student?.id ?? studentId,
  });
};

export const sendLowAttendanceAlert = async (context: NotificationContext, studentId: string, channel: 'email' | 'sms' | 'whatsapp' = 'email') => {
  const settings = await getNotificationSettings(context);
  if (!settings.notificationEnabled || !settings.lowAttendanceAlertsEnabled) {
    throw new AppError('Low attendance alerts are disabled', StatusCodes.BAD_REQUEST);
  }
  const composed = await messageForRule('low_attendance_alert', studentId);
  const recipient = channel === 'email' ? settings.supportEmail || env.supportEmail : composed.student?.parentPhone || composed.student?.phone || 'not-configured';
  return sendNotification(context, {
    channel,
    recipient,
    subject: composed.subject,
    message: composed.message,
    studentId: composed.student?.id ?? studentId,
  });
};

export const sendMonthlyReportAlert = async (context: NotificationContext, studentId: string, channel: 'email' | 'sms' | 'whatsapp' = 'email') => {
  const settings = await getNotificationSettings(context);
  if (!settings.notificationEnabled || !settings.monthlyReportsEnabled) {
    throw new AppError('Monthly report alerts are disabled', StatusCodes.BAD_REQUEST);
  }
  const composed = await messageForRule('monthly_report_alert', studentId);
  const recipient = channel === 'email' ? settings.supportEmail || env.supportEmail : composed.student?.parentPhone || composed.student?.phone || 'not-configured';
  return sendNotification(context, {
    channel,
    recipient,
    subject: composed.subject,
    message: composed.message,
    studentId: composed.student?.id ?? studentId,
  });
};

import { Prisma } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { requireInstitutionId } from './adminContext.service.js';
import { sendNotification, getNotificationSettings } from './notification.service.js';
import { sendStudentAlertSchema, templateSchema, templateUpdateSchema } from '../validators/notification.validator.js';

interface CommunicationContext {
  userId?: string;
  institutionId?: string | null;
}

type TemplateKey = 'low_attendance_warning' | 'low_attendance_critical' | 'low_attendance_severe' | 'monthly_report';
type TemplateChannel = 'email' | 'whatsapp';

type StudentWithRelations = Prisma.StudentGetPayload<{ include: { course: true; section: true } }>;

const defaultTemplates: Array<{ key: TemplateKey; channel: TemplateChannel; name: string; subject?: string; body: string }> = [
  {
    key: 'low_attendance_warning',
    channel: 'email',
    name: 'Low attendance email - warning',
    subject: 'Attendance warning for {{studentName}}',
    body: 'Dear Parent, {{studentName}} (Roll No: {{rollNumber}}) from {{className}}/{{sectionName}} has attendance of {{attendancePercentage}}%. Required minimum is {{threshold}}%. Please encourage regular attendance.',
  },
  {
    key: 'low_attendance_critical',
    channel: 'email',
    name: 'Low attendance email - critical',
    subject: 'Critical attendance alert for {{studentName}}',
    body: 'Critical Attendance Alert: {{studentName}} ({{rollNumber}}) has {{attendancePercentage}}% attendance. Immediate action is required to avoid academic shortage.',
  },
  {
    key: 'low_attendance_severe',
    channel: 'email',
    name: 'Low attendance email - severe',
    subject: 'Severe attendance shortage for {{studentName}}',
    body: 'Severe Attendance Alert: {{studentName}} ({{rollNumber}}) has only {{attendancePercentage}}% attendance. Please contact the institution immediately.',
  },
  {
    key: 'monthly_report',
    channel: 'email',
    name: 'Monthly attendance report email',
    subject: 'Monthly attendance report - {{studentName}}',
    body: 'Monthly Attendance Report for {{studentName}} ({{rollNumber}}): {{attendancePercentage}}% attendance ({{attendedClasses}}/{{totalClasses}}). Class: {{className}}/{{sectionName}}.',
  },
  {
    key: 'low_attendance_warning',
    channel: 'whatsapp',
    name: 'Low attendance WhatsApp - warning',
    body: 'AttendanceTracker Alert: {{studentName}} ({{rollNumber}}) has {{attendancePercentage}}% attendance, below {{threshold}}%. Class: {{className}}/{{sectionName}}.',
  },
  {
    key: 'low_attendance_critical',
    channel: 'whatsapp',
    name: 'Low attendance WhatsApp - critical',
    body: 'Critical Alert: {{studentName}} ({{rollNumber}}) attendance is {{attendancePercentage}}%. Parent action is recommended.',
  },
  {
    key: 'low_attendance_severe',
    channel: 'whatsapp',
    name: 'Low attendance WhatsApp - severe',
    body: 'Severe Attendance Alert: {{studentName}} ({{rollNumber}}) is at {{attendancePercentage}}%. Please contact the institution immediately.',
  },
  {
    key: 'monthly_report',
    channel: 'whatsapp',
    name: 'Monthly report WhatsApp',
    body: 'Monthly report: {{studentName}} ({{rollNumber}}) attendance is {{attendancePercentage}}% ({{attendedClasses}}/{{totalClasses}}).',
  },
];

const cleanPhone = (value?: string | null) => (value ?? '').replace(/[^+\d]/g, '');

export const createWhatsappLink = (phone: string, message: string) => {
  const normalized = cleanPhone(phone).replace(/^\+/, '');
  if (!normalized) return '';
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
};

const calculateStudentAttendance = async (studentId: string) => {
  const records = await prisma.attendanceRecord.findMany({ where: { studentId }, select: { status: true } });
  const total = records.length;
  const attended = records.filter((record) => record.status === 'PRESENT' || record.status === 'LATE' || record.status === 'EXCUSED').length;
  const percentage = total === 0 ? 100 : Number(((attended / total) * 100).toFixed(1));
  return { total, attended, percentage };
};

const thresholdKey = (percentage: number, settings: Awaited<ReturnType<typeof getNotificationSettings>>): TemplateKey => {
  if (percentage <= settings.severeAttendancePct) return 'low_attendance_severe';
  if (percentage <= settings.criticalAttendancePct) return 'low_attendance_critical';
  return 'low_attendance_warning';
};

const severity = (percentage: number, settings: Awaited<ReturnType<typeof getNotificationSettings>>) => {
  if (percentage <= settings.severeAttendancePct) return 'SEVERE';
  if (percentage <= settings.criticalAttendancePct) return 'CRITICAL';
  if (percentage < settings.warningAttendancePct) return 'WARNING';
  return 'OK';
};

const ensureDefaultTemplates = async (institutionId: string) => {
  for (const template of defaultTemplates) {
    await prisma.communicationTemplate.upsert({
      where: { institutionId_key_channel: { institutionId, key: template.key, channel: template.channel } },
      update: {},
      create: { institutionId, ...template },
    });
  }
};

export const listTemplates = async (context: CommunicationContext) => {
  const institutionId = requireInstitutionId(context.institutionId);
  await ensureDefaultTemplates(institutionId);
  return prisma.communicationTemplate.findMany({ where: { institutionId }, orderBy: [{ channel: 'asc' }, { key: 'asc' }] });
};

export const createTemplate = async (context: CommunicationContext, rawData: unknown) => {
  const institutionId = requireInstitutionId(context.institutionId);
  const data = templateSchema.parse(rawData);
  return prisma.communicationTemplate.upsert({
    where: { institutionId_key_channel: { institutionId, key: data.key, channel: data.channel } },
    update: { name: data.name, subject: data.subject || null, body: data.body, isActive: data.isActive ?? true },
    create: { institutionId, ...data, subject: data.subject || null, isActive: data.isActive ?? true },
  });
};

export const updateTemplate = async (context: CommunicationContext, id: string, rawData: unknown) => {
  const institutionId = requireInstitutionId(context.institutionId);
  const data = templateUpdateSchema.parse(rawData);
  const existing = await prisma.communicationTemplate.findFirst({ where: { id, institutionId } });
  if (!existing) throw new AppError('Template not found', StatusCodes.NOT_FOUND);
  return prisma.communicationTemplate.update({ where: { id }, data: { ...data, subject: data.subject === '' ? null : data.subject } });
};

const render = (template: string, values: Record<string, string | number>) => template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key: string) => String(values[key] ?? ''));

const getStudent = async (institutionId: string, studentId: string): Promise<StudentWithRelations> => {
  const student = await prisma.student.findFirst({ where: { id: studentId, institutionId }, include: { course: true, section: true } });
  if (!student) throw new AppError('Student not found', StatusCodes.NOT_FOUND);
  return student;
};

const recipientFor = (student: StudentWithRelations, channel: TemplateChannel, recipientType: 'student' | 'parent') => {
  if (channel === 'email') return recipientType === 'student' ? student.email : student.parentEmail || student.email;
  return recipientType === 'student' ? student.phone : student.parentPhone || student.phone;
};

const buildMessage = async (institutionId: string, student: StudentWithRelations, channel: TemplateChannel, type: 'low_attendance_alert' | 'monthly_report_alert') => {
  const settings = await getNotificationSettings({ institutionId });
  const stats = await calculateStudentAttendance(student.id);
  const key = type === 'monthly_report_alert' ? 'monthly_report' : thresholdKey(stats.percentage, settings);
  const template = await prisma.communicationTemplate.findFirst({ where: { institutionId, key, channel, isActive: true } })
    ?? defaultTemplates.find((item) => item.key === key && item.channel === channel);
  if (!template) throw new AppError('Communication template not found', StatusCodes.NOT_FOUND);
  const values = {
    studentName: student.name,
    rollNumber: student.rollNumber,
    className: student.course.name,
    sectionName: student.section.name,
    studentEmail: student.email ?? '',
    parentName: student.parentName ?? '',
    parentEmail: student.parentEmail ?? '',
    parentMobile: student.parentPhone ?? '',
    mobile: student.phone ?? '',
    attendancePercentage: stats.percentage,
    attendedClasses: stats.attended,
    totalClasses: stats.total,
    threshold: settings.warningAttendancePct,
    severity: severity(stats.percentage, settings),
  };
  return {
    subject: render(template.subject ?? (type === 'monthly_report_alert' ? 'Monthly Attendance Report' : 'Low Attendance Alert'), values),
    message: render(template.body, values),
    stats,
    severity: severity(stats.percentage, settings),
    key,
  };
};

export const getLowAttendanceStudents = async (context: CommunicationContext) => {
  const institutionId = requireInstitutionId(context.institutionId);
  const settings = await getNotificationSettings(context);
  const students = await prisma.student.findMany({ where: { institutionId, isActive: true }, include: { course: true, section: true }, orderBy: [{ course: { name: 'asc' } }, { section: { name: 'asc' } }, { rollNumber: 'asc' }] });
  const result = [];
  for (const student of students) {
    const stats = await calculateStudentAttendance(student.id);
    const level = severity(stats.percentage, settings);
    if (stats.total > 0 && level !== 'OK') {
      const lastAlert = await prisma.notificationLog.findFirst({ where: { institutionId, studentId: student.id, type: { contains: 'Attendance', mode: 'insensitive' } }, orderBy: { createdAt: 'desc' } });
      const whatsapp = await buildMessage(institutionId, student, 'whatsapp', 'low_attendance_alert');
      result.push({
        id: student.id,
        name: student.name,
        rollNumber: student.rollNumber,
        email: student.email,
        phone: student.phone,
        parentName: student.parentName,
        parentEmail: student.parentEmail,
        parentPhone: student.parentPhone,
        className: student.course.name,
        sectionName: student.section.name,
        attendancePercentage: stats.percentage,
        attendedClasses: stats.attended,
        totalClasses: stats.total,
        severity: level,
        lastAlertStatus: lastAlert?.status ?? 'Not sent',
        whatsappLink: createWhatsappLink(student.parentPhone || student.phone || '', whatsapp.message),
        whatsappMessage: whatsapp.message,
      });
    }
  }
  return result;
};

export const sendStudentAlert = async (context: CommunicationContext, rawData: unknown) => {
  const institutionId = requireInstitutionId(context.institutionId);
  const data = sendStudentAlertSchema.parse(rawData);
  const settings = await getNotificationSettings(context);
  if (!settings.notificationEnabled) throw new AppError('Notifications are disabled', StatusCodes.BAD_REQUEST);
  const student = await getStudent(institutionId, data.studentId);
  const channel = data.channel;
  if (channel === 'email' && !settings.emailEnabled) throw new AppError('Email alerts are disabled', StatusCodes.BAD_REQUEST);
  if (channel === 'whatsapp' && !settings.whatsappEnabled) throw new AppError('WhatsApp alerts are disabled', StatusCodes.BAD_REQUEST);
  const composed = await buildMessage(institutionId, student, channel, data.type);
  const recipient = recipientFor(student, channel, data.recipientType);
  if (!recipient) throw new AppError(`${data.recipientType} ${channel === 'email' ? 'email' : 'phone'} is not configured`, StatusCodes.BAD_REQUEST);

  const alertType = data.type === 'monthly_report_alert' ? 'Monthly Report' : `${composed.severity} Low Attendance`;
  const duplicateWindowStart = new Date();
  duplicateWindowStart.setHours(0, 0, 0, 0);
  const alreadySentToday = await prisma.notificationLog.findFirst({
    where: {
      institutionId,
      studentId: student.id,
      channel,
      recipient,
      type: alertType,
      createdAt: { gte: duplicateWindowStart },
      status: { in: ['Delivered', 'Manual', 'Skipped'] },
    },
    orderBy: { createdAt: 'desc' },
  });
  if (alreadySentToday) {
    throw new AppError('An alert for this student, channel, and alert type was already generated today.', StatusCodes.CONFLICT);
  }

  if (channel === 'whatsapp' || data.manual) {
    const log = await prisma.notificationLog.create({
      data: {
        institutionId,
        studentId: student.id,
        channel,
        recipient,
        recipientType: data.recipientType,
        type: alertType,
        subject: composed.subject,
        message: composed.message,
        status: 'Manual',
        provider: 'manual-link',
        providerRef: channel === 'whatsapp' ? createWhatsappLink(recipient, composed.message) : null,
        sentAt: null,
      },
    });
    return { log, whatsappLink: channel === 'whatsapp' ? createWhatsappLink(recipient, composed.message) : null, message: composed.message };
  }

  const log = await sendNotification(context, {
    channel: 'email',
    recipient,
    recipientType: data.recipientType,
    type: alertType,
    subject: composed.subject,
    message: composed.message,
    studentId: student.id,
  });
  return { log, whatsappLink: null, message: composed.message };
};

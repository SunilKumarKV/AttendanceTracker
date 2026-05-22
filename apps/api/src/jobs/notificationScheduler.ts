import cron, { ScheduledTask } from 'node-cron';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { sendLowAttendanceAlert, sendMonthlyReportAlert } from '../services/notification.service.js';

let tasks: ScheduledTask[] = [];
let running = false;

const startOfDay = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

const startOfMonth = () => {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
};

const attendancePercentage = async (studentId: string) => {
  const records = await prisma.attendanceRecord.findMany({ where: { studentId }, select: { status: true } });
  if (records.length === 0) return 100;
  const attended = records.filter((record) => record.status === 'PRESENT').length;
  return (attended / records.length) * 100;
};

const withRetry = async (name: string, job: () => Promise<void>, attempts = 3) => {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      await job();
      return;
    } catch (error) {
      logger.warn('Scheduled notification job attempt failed.', {
        name,
        attempt,
        error: error instanceof Error ? error.message : String(error),
      });
      if (attempt === attempts) throw error;
    }
  }
};

const alreadyLogged = async (studentId: string, subject: string, since: Date) => (
  await prisma.notificationLog.count({
    where: {
      studentId,
      channel: 'email',
      subject,
      createdAt: { gte: since },
    },
  }) > 0
);

export const runLowAttendanceAlerts = async () => {
  const settings = await prisma.appSettings.findMany({
    where: { notificationEnabled: true },
    include: { institution: { include: { students: { where: { isActive: true } } } } },
  });
  for (const setting of settings) {
    const values = typeof setting.settings === 'object' && setting.settings && !Array.isArray(setting.settings) ? setting.settings as Record<string, unknown> : {};
    if (values.lowAttendanceAlertsEnabled === false) continue;
    for (const student of setting.institution.students) {
      const percentage = await attendancePercentage(student.id);
      if (percentage >= setting.minimumAttendancePct) continue;
      if (await alreadyLogged(student.id, 'Low Attendance Alert', startOfDay())) continue;
      await withRetry('low-attendance-alert', async () => {
        await sendLowAttendanceAlert({ institutionId: setting.institutionId }, student.id);
      });
    }
  }
};

export const runMonthlyAttendanceSummaries = async () => {
  const settings = await prisma.appSettings.findMany({
    where: { notificationEnabled: true },
    include: { institution: { include: { students: { where: { isActive: true } } } } },
  });
  for (const setting of settings) {
    const values = typeof setting.settings === 'object' && setting.settings && !Array.isArray(setting.settings) ? setting.settings as Record<string, unknown> : {};
    if (values.monthlyReportsEnabled === false) continue;
    for (const student of setting.institution.students) {
      if (await alreadyLogged(student.id, 'Monthly Attendance Report', startOfMonth())) continue;
      await withRetry('monthly-attendance-summary', async () => {
        await sendMonthlyReportAlert({ institutionId: setting.institutionId }, student.id);
      });
    }
  }
};

export const runReminderFramework = async () => {
  logger.info('Reminder job framework executed. No reminder providers are enabled yet.');
};

export const runNotificationJobsOnce = async () => {
  if (running) {
    logger.warn('Notification scheduler run skipped because a previous run is still active.');
    return;
  }
  running = true;
  try {
    await runLowAttendanceAlerts();
    await runMonthlyAttendanceSummaries();
    await runReminderFramework();
    logger.info('Notification scheduler run completed.');
  } finally {
    running = false;
  }
};

export const startNotificationScheduler = () => {
  if (!env.schedulerEnabled) {
    logger.info('Notification scheduler disabled. Set ENABLE_SCHEDULER=true to enable cron jobs.');
    return;
  }
  if (tasks.length > 0) {
    logger.warn('Notification scheduler already started; duplicate start prevented.');
    return;
  }
  tasks = [
    cron.schedule('0 8 * * *', () => void runLowAttendanceAlerts(), { timezone: 'Asia/Kolkata' }),
    cron.schedule('15 8 1 * *', () => void runMonthlyAttendanceSummaries(), { timezone: 'Asia/Kolkata' }),
    cron.schedule('30 8 * * 1', () => void runReminderFramework(), { timezone: 'Asia/Kolkata' }),
  ];
  logger.info('Notification scheduler started.', { jobs: tasks.length });
};

export const stopNotificationScheduler = () => {
  tasks.forEach((task) => task.stop());
  tasks = [];
};

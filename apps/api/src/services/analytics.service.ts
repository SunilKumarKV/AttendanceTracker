import { Role } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';

type Context = { userId?: string; institutionId?: string | null; role?: Role | string };
type Query = Record<string, unknown>;
const db = prisma as any;
const adminRoles = new Set(['SUPER_ADMIN', 'ADMIN', 'HOD']);
const teacherRoles = new Set(['TEACHER', 'PROFESSOR']);

const requireInstitution = (context: Context) => {
  if (!context.userId) throw new AppError('Authentication required', StatusCodes.UNAUTHORIZED);
  if (!context.institutionId) throw new AppError('Institution context is required', StatusCodes.FORBIDDEN);
  return context.institutionId;
};

const isAdmin = (context: Context) => adminRoles.has(String(context.role));
const isTeacher = (context: Context) => teacherRoles.has(String(context.role));

const stringValue = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const numberValue = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const dateOrDefault = (value: unknown, fallback: Date) => {
  const raw = stringValue(value);
  const date = raw ? new Date(raw) : fallback;
  return Number.isNaN(date.getTime()) ? fallback : date;
};
const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const endOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
const isoDay = (date: Date) => date.toISOString().slice(0, 10);
const percent = (numerator: number, denominator: number) => denominator > 0 ? Number(((numerator / denominator) * 100).toFixed(2)) : 0;

const baseWhere = (context: Context, query: Query = {}) => {
  const institutionId = requireInstitution(context);
  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setDate(now.getDate() - 30);
  const fromDate = startOfDay(dateOrDefault(query.fromDate, defaultFrom));
  const toDate = endOfDay(dateOrDefault(query.toDate, now));
  const where: any = { institutionId, sessionDate: { gte: fromDate, lte: toDate } };
  const courseId = stringValue(query.classId ?? query.courseId);
  const sectionId = stringValue(query.sectionId);
  const subjectId = stringValue(query.subjectId);
  const teacherId = stringValue(query.teacherId);
  if (courseId) where.courseId = courseId;
  if (sectionId) where.sectionId = sectionId;
  if (subjectId) where.subjectId = subjectId;
  if (teacherId && isAdmin(context)) where.professorId = teacherId;
  if (isTeacher(context)) where.professorId = context.userId;
  return { institutionId, where, fromDate, toDate };
};

const recordsFor = async (context: Context, query: Query = {}) => {
  const { where } = baseWhere(context, query);
  const recordWhere: any = { session: where };
  const status = stringValue(query.status).toUpperCase();
  const studentId = stringValue(query.studentId);
  if (['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'].includes(status)) recordWhere.status = status;
  if (studentId) recordWhere.studentId = studentId;
  return db.attendanceRecord.findMany({
    where: recordWhere,
    include: {
      student: { include: { course: true, section: true } },
      session: { include: { course: true, section: true, subject: true, professor: { select: { id: true, name: true, email: true } } } },
    },
    orderBy: { markedAt: 'asc' },
  });
};

const groupBy = <T>(items: T[], keyFn: (item: T) => string) => items.reduce<Record<string, T[]>>((acc, item) => {
  const key = keyFn(item);
  acc[key] = acc[key] ?? [];
  acc[key].push(item);
  return acc;
}, {});

const attendanceStats = (rows: any[]) => {
  const present = rows.filter((r) => ['PRESENT', 'LATE', 'EXCUSED'].includes(String(r.status))).length;
  const absent = rows.filter((r) => String(r.status) === 'ABSENT').length;
  const late = rows.filter((r) => String(r.status) === 'LATE').length;
  const excused = rows.filter((r) => String(r.status) === 'EXCUSED').length;
  return { total: rows.length, present, absent, late, excused, percentage: percent(present, rows.length) };
};

const riskCategory = (percentage: number) => {
  if (percentage < 50) return 'critical';
  if (percentage < 65) return 'high';
  if (percentage < 75) return 'medium';
  return 'low';
};

const buildStudentRisks = (rows: any[]) => Object.entries(groupBy(rows, (r) => r.studentId)).map(([studentId, items]) => {
  const stats = attendanceStats(items as any[]);
  const latestTen = [...(items as any[])].sort((a, b) => new Date(b.session.sessionDate).getTime() - new Date(a.session.sessionDate).getTime()).slice(0, 10);
  const previousTen = [...(items as any[])].sort((a, b) => new Date(b.session.sessionDate).getTime() - new Date(a.session.sessionDate).getTime()).slice(10, 20);
  const latestPct = attendanceStats(latestTen).percentage;
  const previousPct = attendanceStats(previousTen).percentage;
  const student = (items as any[])[0]?.student;
  return {
    studentId,
    studentName: student?.name ?? 'Unknown',
    rollNumber: student?.rollNumber ?? '',
    className: student?.course?.name ?? '',
    sectionName: student?.section?.name ?? '',
    totalClasses: stats.total,
    present: stats.present,
    absent: stats.absent,
    late: stats.late,
    excused: stats.excused,
    percentage: stats.percentage,
    riskCategory: riskCategory(stats.percentage),
    frequentlyAbsent: stats.absent >= 3 || percent(stats.absent, stats.total) >= 25,
    droppingTrend: previousTen.length > 0 && latestPct + 5 < previousPct,
  };
}).sort((a, b) => a.percentage - b.percentage);

export const getAnalyticsOverview = async (context: Context, query: Query = {}) => {
  const { institutionId, where, fromDate, toDate } = baseWhere(context, query);
  const rows = await recordsFor(context, query);
  const stats = attendanceStats(rows);
  const [students, staff, sessions, pendingCorrections, pendingLeaves, alertLogs] = await Promise.all([
    isAdmin(context) ? db.student.count({ where: { institutionId, isActive: true } }) : Promise.resolve(0),
    isAdmin(context) ? db.staffProfile.count({ where: { institutionId, isActive: true } }) : Promise.resolve(0),
    db.attendanceSession.count({ where }),
    isAdmin(context) ? db.attendanceCorrectionRequest.count({ where: { institutionId, status: 'PENDING' } }) : Promise.resolve(0),
    isAdmin(context) ? db.leaveRequest.count({ where: { institutionId, status: 'PENDING' } }) : Promise.resolve(0),
    isAdmin(context) ? db.notificationLog.groupBy({ by: ['status'], where: { institutionId, createdAt: { gte: fromDate, lte: toDate } }, _count: { _all: true } }) : Promise.resolve([]),
  ]);
  const risks = buildStudentRisks(rows);
  const staffSummary = isAdmin(context) ? await db.staffAttendanceRecord.groupBy({ by: ['status'], where: { institutionId, attendanceDate: { gte: fromDate, lte: toDate } }, _count: { _all: true } }) : [];
  return {
    dateRange: { fromDate: isoDay(fromDate), toDate: isoDay(toDate) },
    kpis: {
      totalStudents: students,
      totalStaff: staff,
      attendanceSessions: sessions,
      records: stats.total,
      attendancePercentage: stats.percentage,
      present: stats.present,
      absent: stats.absent,
      late: stats.late,
      excused: stats.excused,
      lowAttendanceStudents: risks.filter((r) => r.percentage < numberValue(query.threshold, 75)).length,
      criticalRiskStudents: risks.filter((r) => r.riskCategory === 'critical').length,
      pendingCorrections,
      pendingLeaveApprovals: pendingLeaves,
    },
    staffAttendanceSummary: staffSummary.map((item: any) => ({ status: item.status, count: item._count._all })),
    alertSummary: alertLogs.map((item: any) => ({ status: item.status, count: item._count._all })),
    topLowAttendanceClasses: classComparison(rows).sort((a: any, b: any) => a.percentage - b.percentage).slice(0, 5),
    mostAbsentStudents: risks.sort((a, b) => b.absent - a.absent).slice(0, 10),
  };
};

const dailyTrend = (rows: any[]) => Object.entries(groupBy(rows, (r) => isoDay(new Date(r.session.sessionDate)))).map(([date, items]) => ({ date, ...attendanceStats(items as any[]) })).sort((a, b) => a.date.localeCompare(b.date));
const weeklyTrend = (rows: any[]) => Object.entries(groupBy(rows, (r) => {
  const d = new Date(r.session.sessionDate);
  const first = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil((((d.getTime() - first.getTime()) / 86400000) + first.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
})).map(([week, items]) => ({ week, ...attendanceStats(items as any[]) })).sort((a, b) => a.week.localeCompare(b.week));
const monthlyTrend = (rows: any[]) => Object.entries(groupBy(rows, (r) => new Date(r.session.sessionDate).toISOString().slice(0, 7))).map(([month, items]) => ({ month, ...attendanceStats(items as any[]) })).sort((a, b) => a.month.localeCompare(b.month));
const classComparison = (rows: any[]) => Object.entries(groupBy(rows, (r) => r.session.courseId ?? 'unknown')).map(([classId, items]) => ({ classId, className: (items as any[])[0]?.session?.course?.name ?? 'Unknown', ...attendanceStats(items as any[]) }));
const subjectComparison = (rows: any[]) => Object.entries(groupBy(rows, (r) => r.session.subjectId ?? 'unknown')).map(([subjectId, items]) => ({ subjectId, subjectName: (items as any[])[0]?.session?.subject?.name ?? 'Unknown', ...attendanceStats(items as any[]) }));

export const getAnalyticsCharts = async (context: Context, query: Query = {}) => {
  const rows = await recordsFor(context, query);
  const risks = buildStudentRisks(rows);
  return {
    daily: dailyTrend(rows),
    weekly: weeklyTrend(rows),
    monthly: monthlyTrend(rows),
    classComparison: classComparison(rows),
    subjectComparison: subjectComparison(rows),
    lowAttendanceDistribution: ['low', 'medium', 'high', 'critical'].map((risk) => ({ risk, count: risks.filter((r) => r.riskCategory === risk).length })),
  };
};

export const getStudentRiskInsights = async (context: Context, query: Query = {}) => {
  const threshold = numberValue(query.threshold, 75);
  const rows = await recordsFor(context, query);
  const risks = buildStudentRisks(rows);
  return {
    threshold,
    belowThreshold: risks.filter((r) => r.percentage < threshold),
    frequentlyAbsent: risks.filter((r) => r.frequentlyAbsent),
    droppingTrend: risks.filter((r) => r.droppingTrend),
    all: risks,
  };
};

export const getTeacherInsights = async (context: Context, query: Query = {}) => {
  const institutionId = requireInstitution(context);
  const { where, fromDate, toDate } = baseWhere(context, query);
  const sessionWhere = isAdmin(context) ? where : { ...where, professorId: context.userId };
  const sessions = await db.attendanceSession.findMany({ where: sessionWhere, include: { course: true, section: true, subject: true, professor: { select: { id: true, name: true, email: true } }, records: true }, orderBy: { sessionDate: 'desc' } });
  const teachers = Object.entries(groupBy(sessions, (s: any) => s.professorId)).map(([teacherId, items]) => {
    const teacher = (items as any[])[0]?.professor;
    const subjects = new Set((items as any[]).map((s) => s.subjectId));
    const classes = new Set((items as any[]).map((s) => `${s.courseId}-${s.sectionId ?? ''}`));
    const expectedDays = Math.max(1, Math.ceil((toDate.getTime() - fromDate.getTime()) / 86400000));
    return {
      teacherId,
      teacherName: teacher?.name ?? 'Unknown',
      email: teacher?.email ?? '',
      classesHandled: classes.size,
      subjectsHandled: subjects.size,
      sessionsSubmitted: (items as any[]).length,
      attendanceSubmissionConsistency: percent((items as any[]).length, expectedDays),
      pendingAttendanceDays: Math.max(0, expectedDays - (items as any[]).length),
      subjectSummary: Object.entries(groupBy(items as any[], (s: any) => s.subjectId)).map(([subjectId, subjectItems]) => ({ subjectId, subjectName: (subjectItems as any[])[0]?.subject?.name ?? 'Unknown', sessions: (subjectItems as any[]).length, records: (subjectItems as any[]).reduce((sum, s) => sum + s.records.length, 0) })),
    };
  });
  if (!isAdmin(context) && !isTeacher(context)) throw new AppError('Analytics access denied', StatusCodes.FORBIDDEN);
  return { institutionId, teachers };
};

export const getFilterOptions = async (context: Context) => {
  const institutionId = requireInstitution(context);
  const [classes, sections, subjects, teachers, students] = await Promise.all([
    db.course.findMany({ where: { institutionId, isActive: true }, select: { id: true, name: true, code: true }, orderBy: { name: 'asc' } }),
    db.section.findMany({ where: { institutionId, isActive: true }, select: { id: true, name: true, courseId: true }, orderBy: { name: 'asc' } }),
    db.subject.findMany({ where: { institutionId, isActive: true }, select: { id: true, name: true, code: true, courseId: true }, orderBy: { name: 'asc' } }),
    isAdmin(context) ? db.user.findMany({ where: { institutionId, role: { in: ['TEACHER', 'PROFESSOR'] }, isActive: true }, select: { id: true, name: true, email: true }, orderBy: { name: 'asc' } }) : Promise.resolve([]),
    isAdmin(context) ? db.student.findMany({ where: { institutionId, isActive: true }, select: { id: true, name: true, rollNumber: true, courseId: true, sectionId: true }, orderBy: { name: 'asc' }, take: 500 }) : Promise.resolve([]),
  ]);
  return { classes, sections, subjects, teachers, students };
};

export const exportRows = async (context: Context, query: Query = {}) => {
  const overview = await getAnalyticsOverview(context, query);
  const charts = await getAnalyticsCharts(context, query);
  const risks = await getStudentRiskInsights(context, query);
  const type = stringValue(query.type) || 'summary';
  if (type === 'risks') return risks.all.map((r) => ({ student: r.studentName, rollNumber: r.rollNumber, class: r.className, section: r.sectionName, percentage: r.percentage, risk: r.riskCategory, absent: r.absent, droppingTrend: r.droppingTrend ? 'Yes' : 'No' }));
  if (type === 'classes') return charts.classComparison.map((r: any) => ({ class: r.className, total: r.total, present: r.present, absent: r.absent, percentage: r.percentage }));
  if (type === 'subjects') return charts.subjectComparison.map((r: any) => ({ subject: r.subjectName, total: r.total, present: r.present, absent: r.absent, percentage: r.percentage }));
  return [
    { metric: 'Attendance %', value: overview.kpis.attendancePercentage },
    { metric: 'Total Records', value: overview.kpis.records },
    { metric: 'Present', value: overview.kpis.present },
    { metric: 'Absent', value: overview.kpis.absent },
    { metric: 'Low Attendance Students', value: overview.kpis.lowAttendanceStudents },
    { metric: 'Critical Risk Students', value: overview.kpis.criticalRiskStudents },
    { metric: 'Pending Corrections', value: overview.kpis.pendingCorrections },
    { metric: 'Pending Leave Approvals', value: overview.kpis.pendingLeaveApprovals },
  ];
};

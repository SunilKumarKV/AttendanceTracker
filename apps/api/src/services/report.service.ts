import { AttendanceStatus, Prisma } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';
import { prisma } from '../config/prisma.js';
import { requireInstitutionId } from './adminContext.service.js';
import { AppError } from '../utils/AppError.js';
import { toCsv, toSimplePdf } from '../utils/reportExport.js';
import { reportQuerySchema, ReportQuery } from '../validators/report.validator.js';
import { writeAuditLog } from './audit.service.js';

interface ReportContext {
  userId?: string;
  institutionId?: string | null;
}

interface AttendanceCalculationSettings {
  countLateAsPresent: boolean;
  countExcusedAsPresent: boolean;
}

const defaultAttendanceCalculation: AttendanceCalculationSettings = {
  countLateAsPresent: false,
  countExcusedAsPresent: false,
};

const parseQuery = (query: unknown) => {
  const parsed = reportQuerySchema.safeParse(query);
  if (!parsed.success) {
    throw new AppError('Invalid report filters', StatusCodes.BAD_REQUEST, parsed.error.flatten());
  }
  return parsed.data;
};

const startOfDay = (value?: string) => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new AppError('Invalid fromDate', StatusCodes.BAD_REQUEST);
  date.setHours(0, 0, 0, 0);
  return date;
};

const endOfDay = (value?: string) => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new AppError('Invalid toDate', StatusCodes.BAD_REQUEST);
  date.setHours(23, 59, 59, 999);
  return date;
};

const monthRange = (month?: string) => {
  if (!month) return {};
  const [year, monthNumber] = month.split('-').map(Number);
  const fromDate = new Date(year, monthNumber - 1, 1);
  const toDate = new Date(year, monthNumber, 0);
  toDate.setHours(23, 59, 59, 999);
  return { fromDate, toDate };
};

const getDateRange = (query: ReportQuery) => {
  const monthly = monthRange(query.month);
  return {
    fromDate: monthly.fromDate ?? startOfDay(query.fromDate),
    toDate: monthly.toDate ?? endOfDay(query.toDate),
  };
};

const sessionWhere = (institutionId: string, query: ReportQuery): Prisma.AttendanceSessionWhereInput => {
  const { fromDate, toDate } = getDateRange(query);
  const courseId = query.classId ?? query.courseId;
  return {
    institutionId,
    ...(fromDate || toDate ? { sessionDate: { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lte: toDate } : {}) } } : {}),
    ...(courseId ? { courseId } : {}),
    ...(query.semesterId ? { semesterId: query.semesterId } : {}),
    ...(query.sectionId ? { sectionId: query.sectionId } : {}),
    ...(query.subjectId ? { subjectId: query.subjectId } : {}),
  };
};

const percentage = (attended: number, total: number) => (
  total === 0 ? 0 : Number(((attended / total) * 100).toFixed(1))
);

const statusFromPercentage = (value: number, threshold = 75) => (value < threshold ? 'Shortage' : 'Regular');

const lowAttendanceSeverity = (value: number) => {
  if (value < 50) return 'CRITICAL_BELOW_50';
  if (value < 65) return 'BELOW_65';
  if (value < 75) return 'BELOW_75';
  return 'OK';
};

const getAttendanceCalculationSettings = async (institutionId: string): Promise<AttendanceCalculationSettings> => {
  const settings = await prisma.appSettings.findUnique({ where: { institutionId }, select: { settings: true } });
  const values = settings?.settings;
  if (!values || typeof values !== 'object' || Array.isArray(values)) return defaultAttendanceCalculation;
  const calculation = (values as Record<string, unknown>).attendanceCalculation;
  if (!calculation || typeof calculation !== 'object' || Array.isArray(calculation)) return defaultAttendanceCalculation;
  const typed = calculation as Record<string, unknown>;
  return {
    countLateAsPresent: typed.countLateAsPresent === true,
    countExcusedAsPresent: typed.countExcusedAsPresent === true,
  };
};

const attendedCount = (present: number, late: number, excused: number, calculation: AttendanceCalculationSettings) => (
  present
  + (calculation.countLateAsPresent ? late : 0)
  + (calculation.countExcusedAsPresent ? excused : 0)
);

const summarizeStudent = (student: {
  id: string;
  name: string;
  rollNumber: string;
  course?: { id: string; name: string } | null;
  section?: { id: string; name: string } | null;
  attendanceRecords: {
    status: AttendanceStatus;
    session: { subject: { id: string; name: string }; semester?: { id: string; name: string } | null };
  }[];
}, threshold = 75, calculation: AttendanceCalculationSettings = defaultAttendanceCalculation) => {
  const totalClasses = student.attendanceRecords.length;
  const present = student.attendanceRecords.filter((record) => record.status === 'PRESENT').length;
  const late = student.attendanceRecords.filter((record) => record.status === 'LATE').length;
  const excused = student.attendanceRecords.filter((record) => record.status === 'EXCUSED').length;
  const absent = student.attendanceRecords.filter((record) => record.status === 'ABSENT').length;
  const attended = attendedCount(present, late, excused, calculation);
  const attendancePercentage = percentage(attended, totalClasses);
  const subjectNames = [...new Set(student.attendanceRecords.map((record) => record.session.subject.name))].sort();

  return {
    studentId: student.id,
    studentName: student.name,
    rollNo: student.rollNumber,
    classId: student.course?.id ?? null,
    className: student.course?.name ?? '',
    sectionId: student.section?.id ?? null,
    sectionName: student.section?.name ?? '',
    subjects: subjectNames,
    subjectName: subjectNames.join(', '),
    totalClasses,
    present,
    late,
    excused,
    absent,
    attended,
    attendancePercentage,
    status: statusFromPercentage(attendancePercentage, threshold),
    lowAttendanceSeverity: lowAttendanceSeverity(attendancePercentage),
  };
};

const studentInclude = (institutionId: string, query: ReportQuery) => ({
  course: true,
  section: true,
  attendanceRecords: {
    where: {
      session: sessionWhere(institutionId, query),
    },
    include: {
      session: {
        include: {
          subject: true,
          course: true,
          section: true,
          semester: true,
          professor: true,
        },
      },
    },
    orderBy: { session: { sessionDate: 'asc' } },
  },
}) satisfies Prisma.StudentInclude;

const getStudentSummaries = async (institutionId: string, query: ReportQuery) => {
  const courseId = query.classId ?? query.courseId;
  const calculation = await getAttendanceCalculationSettings(institutionId);
  const students = await prisma.student.findMany({
    where: {
      institutionId,
      isActive: true,
      ...(query.studentId ? { id: query.studentId } : {}),
      ...(courseId ? { courseId } : {}),
      ...(query.sectionId ? { sectionId: query.sectionId } : {}),
      ...(query.semesterId ? { section: { semesterId: query.semesterId } } : {}),
    },
    include: studentInclude(institutionId, query),
    orderBy: [{ course: { name: 'asc' } }, { section: { name: 'asc' } }, { rollNumber: 'asc' }],
  });

  return students.map((student) => summarizeStudent(student, query.threshold ?? 75, calculation));
};

const summarizeOverview = (students: ReturnType<typeof summarizeStudent>[]) => {
  const totalClasses = students.reduce((sum, student) => sum + student.totalClasses, 0);
  const overallPresent = students.reduce((sum, student) => sum + student.present, 0);
  const overallLate = students.reduce((sum, student) => sum + student.late, 0);
  const overallExcused = students.reduce((sum, student) => sum + student.excused, 0);
  const overallAbsent = students.reduce((sum, student) => sum + student.absent, 0);
  const attended = students.reduce((sum, student) => sum + student.attended, 0);
  const averageAttendance = percentage(attended, totalClasses);
  return {
    totalClasses,
    averageAttendance,
    overallPresent,
    overallLate,
    overallExcused,
    overallAbsent,
    lowAttendanceCount: students.filter((student) => student.status === 'Shortage').length,
    lowAttendanceBands: {
      below75: students.filter((student) => student.totalClasses > 0 && student.attendancePercentage < 75).length,
      below65: students.filter((student) => student.totalClasses > 0 && student.attendancePercentage < 65).length,
      criticalBelow50: students.filter((student) => student.totalClasses > 0 && student.attendancePercentage < 50).length,
    },
  };
};

export const getOverview = async (context: ReportContext, rawQuery: unknown) => {
  const institutionId = requireInstitutionId(context.institutionId);
  const query = parseQuery(rawQuery);
  const students = await getStudentSummaries(institutionId, query);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [sessions, reportsExportedThisMonth] = await Promise.all([
    prisma.attendanceSession.count({ where: sessionWhere(institutionId, query) }),
    prisma.auditLog.count({
      where: {
        institutionId,
        entityType: 'Report',
        action: 'EXPORT',
        createdAt: { gte: monthStart },
      },
    }),
  ]);
  return {
    summary: {
      ...summarizeOverview(students),
      sessions,
      studentCount: students.length,
      absentToday: await prisma.attendanceRecord.count({
        where: {
          status: 'ABSENT',
          session: {
            institutionId,
            sessionDate: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
              lte: new Date(new Date().setHours(23, 59, 59, 999)),
            },
          },
        },
      }),
      reportsExportedThisMonth,
    },
    students,
  };
};

export const getStudentReport = async (context: ReportContext, studentId: string, rawQuery: unknown) => {
  const institutionId = requireInstitutionId(context.institutionId);
  const query = parseQuery({ ...(rawQuery as object), studentId });
  const [student] = await getStudentSummaries(institutionId, query);
  if (!student) throw new AppError('Student not found', StatusCodes.NOT_FOUND);
  const records = await prisma.attendanceRecord.findMany({
    where: { studentId, session: sessionWhere(institutionId, query) },
    include: { session: { include: { subject: true, course: true, section: true, professor: true } } },
    orderBy: { session: { sessionDate: 'asc' } },
  });
  return {
    student,
    records: records.map((record) => ({
      id: record.id,
      date: record.session.sessionDate.toISOString(),
      className: record.session.course.name,
      subjectName: record.session.subject.name,
      sectionName: record.session.section?.name ?? '',
      professorName: record.session.professor.name,
      status: record.status,
      remarks: record.remarks,
    })),
  };
};

export const getClassReport = async (context: ReportContext, classId: string, rawQuery: unknown) => (
  getOverview(context, { ...(rawQuery as object), classId })
);

export const getSubjectReport = async (context: ReportContext, subjectId: string, rawQuery: unknown) => (
  getOverview(context, { ...(rawQuery as object), subjectId })
);

export const getDateReport = async (context: ReportContext, date: string, rawQuery: unknown) => (
  getOverview(context, { ...(rawQuery as object), fromDate: date, toDate: date })
);

export const getLowAttendance = async (context: ReportContext, rawQuery: unknown) => {
  const institutionId = requireInstitutionId(context.institutionId);
  const query = parseQuery(rawQuery);
  const threshold = query.threshold ?? 75;
  const students = await getStudentSummaries(institutionId, query);
  return {
    threshold,
    bands: {
      below75: students.filter((student) => student.totalClasses > 0 && student.attendancePercentage < 75).length,
      below65: students.filter((student) => student.totalClasses > 0 && student.attendancePercentage < 65).length,
      criticalBelow50: students.filter((student) => student.totalClasses > 0 && student.attendancePercentage < 50).length,
    },
    students: students.filter((student) => student.totalClasses > 0 && student.attendancePercentage < threshold),
  };
};

export const getMonthlyReport = async (context: ReportContext, rawQuery: unknown) => {
  const currentMonth = new Date().toISOString().slice(0, 7);
  return getOverview(context, { ...(rawQuery as object), month: (rawQuery as any)?.month ?? currentMonth });
};

const csvRows = (students: ReturnType<typeof summarizeStudent>[]) => students.map((student) => ({
  'Student Name': student.studentName,
  'Roll No': student.rollNo,
  Class: student.className,
  Section: student.sectionName,
  Subjects: student.subjectName,
  'Total Classes': student.totalClasses,
  Present: student.present,
  Late: student.late,
  Excused: student.excused,
  Absent: student.absent,
  'Attendance %': student.attendancePercentage,
  Status: student.status,
}));

export const exportCsv = async (context: ReportContext, rawQuery: unknown) => {
  const report = await getOverview(context, rawQuery);
  await writeAuditLog({ actorId: context.userId, institutionId: requireInstitutionId(context.institutionId), action: 'EXPORT', entityType: 'Report', metadata: { format: 'csv', filters: rawQuery } });
  return toCsv(csvRows(report.students));
};

export const exportPdf = async (context: ReportContext, rawQuery: unknown) => {
  const report = await getOverview(context, rawQuery);
  await writeAuditLog({ actorId: context.userId, institutionId: requireInstitutionId(context.institutionId), action: 'EXPORT', entityType: 'Report', metadata: { format: 'pdf', filters: rawQuery } });
  const generatedAt = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const lines = [
    'Institution: AttendanceTracker',
    `Generated: ${generatedAt}`,
    `Applied filters: ${JSON.stringify(rawQuery)}`,
    '',
    `Students: ${report.summary.studentCount}`,
    `Sessions: ${report.summary.sessions}`,
    `Average Attendance: ${report.summary.averageAttendance}%`,
    `Present: ${report.summary.overallPresent}`,
    `Absent: ${report.summary.overallAbsent}`,
    `Late: ${report.summary.overallLate}`,
    `Excused: ${report.summary.overallExcused}`,
    `Low Attendance: ${report.summary.lowAttendanceCount}`,
    '',
    'Student Attendance',
    ...report.students.map((student) => `${student.rollNo} - ${student.studentName}: ${student.attendancePercentage}% (${student.status}) Present ${student.present}/${student.totalClasses}`),
    '',
    `Footer: AttendanceTracker report exported at ${generatedAt}`,
  ];
  return toSimplePdf('AttendanceTracker Report', lines);
};

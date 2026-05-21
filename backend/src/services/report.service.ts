import { AttendanceStatus, Prisma } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';
import { prisma } from '../config/prisma.js';
import { requireInstitutionId } from './adminContext.service.js';
import { AppError } from '../utils/AppError.js';
import { toCsv, toSimplePdf } from '../utils/reportExport.js';
import { reportQuerySchema, ReportQuery } from '../validators/report.validator.js';

interface ReportContext {
  institutionId?: string | null;
}

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
    ...(query.sectionId ? { sectionId: query.sectionId } : {}),
    ...(query.subjectId ? { subjectId: query.subjectId } : {}),
  };
};

const percentage = (attended: number, total: number) => (
  total === 0 ? 0 : Number(((attended / total) * 100).toFixed(1))
);

const statusFromPercentage = (value: number, threshold = 75) => (value < threshold ? 'Shortage' : 'Regular');

const summarizeStudent = (student: {
  id: string;
  name: string;
  rollNumber: string;
  course?: { id: string; name: string } | null;
  section?: { id: string; name: string } | null;
  attendanceRecords: { status: AttendanceStatus }[];
}, threshold = 75) => {
  const totalClasses = student.attendanceRecords.length;
  const present = student.attendanceRecords.filter((record) => record.status === 'PRESENT').length;
  const late = student.attendanceRecords.filter((record) => record.status === 'LATE').length;
  const excused = student.attendanceRecords.filter((record) => record.status === 'EXCUSED').length;
  const absent = student.attendanceRecords.filter((record) => record.status === 'ABSENT').length;
  const attended = present + late + excused;
  const attendancePercentage = percentage(attended, totalClasses);

  return {
    studentId: student.id,
    studentName: student.name,
    rollNo: student.rollNumber,
    classId: student.course?.id ?? null,
    className: student.course?.name ?? '',
    sectionId: student.section?.id ?? null,
    sectionName: student.section?.name ?? '',
    totalClasses,
    present,
    late,
    excused,
    absent,
    attended,
    attendancePercentage,
    status: statusFromPercentage(attendancePercentage, threshold),
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
          professor: true,
        },
      },
    },
    orderBy: { session: { sessionDate: 'asc' } },
  },
}) satisfies Prisma.StudentInclude;

const getStudentSummaries = async (institutionId: string, query: ReportQuery) => {
  const courseId = query.classId ?? query.courseId;
  const students = await prisma.student.findMany({
    where: {
      institutionId,
      isActive: true,
      ...(query.studentId ? { id: query.studentId } : {}),
      ...(courseId ? { courseId } : {}),
      ...(query.sectionId ? { sectionId: query.sectionId } : {}),
    },
    include: studentInclude(institutionId, query),
    orderBy: [{ course: { name: 'asc' } }, { section: { name: 'asc' } }, { rollNumber: 'asc' }],
  });

  return students.map((student) => summarizeStudent(student, query.threshold ?? 75));
};

const summarizeOverview = (students: ReturnType<typeof summarizeStudent>[]) => {
  const totalClasses = students.reduce((sum, student) => sum + student.totalClasses, 0);
  const overallPresent = students.reduce((sum, student) => sum + student.present, 0);
  const overallLate = students.reduce((sum, student) => sum + student.late, 0);
  const overallExcused = students.reduce((sum, student) => sum + student.excused, 0);
  const overallAbsent = students.reduce((sum, student) => sum + student.absent, 0);
  const averageAttendance = percentage(overallPresent + overallLate + overallExcused, totalClasses);
  return {
    totalClasses,
    averageAttendance,
    overallPresent,
    overallLate,
    overallExcused,
    overallAbsent,
    lowAttendanceCount: students.filter((student) => student.status === 'Shortage').length,
  };
};

export const getOverview = async (context: ReportContext, rawQuery: unknown) => {
  const institutionId = requireInstitutionId(context.institutionId);
  const query = parseQuery(rawQuery);
  const students = await getStudentSummaries(institutionId, query);
  const sessions = await prisma.attendanceSession.count({ where: sessionWhere(institutionId, query) });
  return {
    summary: {
      ...summarizeOverview(students),
      sessions,
      studentCount: students.length,
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

export const getLowAttendance = async (context: ReportContext, rawQuery: unknown) => {
  const institutionId = requireInstitutionId(context.institutionId);
  const query = parseQuery(rawQuery);
  const threshold = query.threshold ?? 75;
  const students = await getStudentSummaries(institutionId, query);
  return {
    threshold,
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
  return toCsv(csvRows(report.students));
};

export const exportPdf = async (context: ReportContext, rawQuery: unknown) => {
  const report = await getOverview(context, rawQuery);
  const lines = [
    `Students: ${report.summary.studentCount}`,
    `Sessions: ${report.summary.sessions}`,
    `Average Attendance: ${report.summary.averageAttendance}%`,
    `Low Attendance: ${report.summary.lowAttendanceCount}`,
    '',
    'Student Attendance',
    ...report.students.map((student) => `${student.rollNo} - ${student.studentName}: ${student.attendancePercentage}% (${student.status})`),
  ];
  return toSimplePdf('AttendanceTracker Report', lines);
};

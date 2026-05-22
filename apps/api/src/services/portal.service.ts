import { AttendanceStatus, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { StatusCodes } from 'http-status-codes';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { writeAuditLog } from './audit.service.js';

type Context = { userId?: string; institutionId?: string | null };

type AttendanceSummary = {
  present: number;
  absent: number;
  late: number;
  approvedLeave: number;
  total: number;
  percentage: number;
  lowAttendanceWarning: 'NONE' | 'LOW' | 'VERY_LOW' | 'CRITICAL';
};

const requireInstitution = (context: Context) => {
  if (!context.institutionId) throw new AppError('Institution context is required', StatusCodes.BAD_REQUEST);
  return context.institutionId;
};

const sanitizeStudent = (student: any) => ({
  id: student.id,
  name: student.name,
  rollNumber: student.rollNumber,
  email: student.email,
  phone: student.phone,
  parentName: student.parentName,
  parentEmail: student.parentEmail,
  parentPhone: student.parentPhone,
  academicYear: student.institution?.appSettings?.settings && typeof student.institution.appSettings.settings === 'object'
    ? (student.institution.appSettings.settings as any).academicYear ?? null
    : null,
  course: student.course ? { id: student.course.id, name: student.course.name, code: student.course.code } : null,
  section: student.section ? { id: student.section.id, name: student.section.name, code: student.section.code } : null,
});

const computeSummary = (records: Array<{ status: AttendanceStatus }>): AttendanceSummary => {
  const present = records.filter((record) => record.status === 'PRESENT').length;
  const absent = records.filter((record) => record.status === 'ABSENT').length;
  const late = records.filter((record) => record.status === 'LATE').length;
  const approvedLeave = records.filter((record) => record.status === 'EXCUSED').length;
  const total = records.length;
  const attended = present + late + approvedLeave;
  const percentage = total === 0 ? 0 : Math.round((attended / total) * 10000) / 100;
  const lowAttendanceWarning = percentage === 0 && total === 0
    ? 'NONE'
    : percentage < 50
      ? 'CRITICAL'
      : percentage < 65
        ? 'VERY_LOW'
        : percentage < 75
          ? 'LOW'
          : 'NONE';

  return { present, absent, late, approvedLeave, total, percentage, lowAttendanceWarning };
};

const getStudentByPortalUser = async (context: Context) => {
  const institutionId = requireInstitution(context);
  if (!context.userId) throw new AppError('Authentication required', StatusCodes.UNAUTHORIZED);

  const student = await prisma.student.findFirst({
    where: { institutionId, portalUserId: context.userId, isActive: true },
    include: {
      course: true,
      section: true,
      institution: { include: { appSettings: true } },
    },
  });

  if (!student) throw new AppError('Student portal access is not linked to an active student', StatusCodes.FORBIDDEN);
  return student;
};

const getParentProfile = async (context: Context) => {
  const institutionId = requireInstitution(context);
  if (!context.userId) throw new AppError('Authentication required', StatusCodes.UNAUTHORIZED);

  const parentProfile = await prisma.parentProfile.findFirst({
    where: { institutionId, userId: context.userId },
    include: {
      children: {
        include: {
          student: {
            include: {
              course: true,
              section: true,
              institution: { include: { appSettings: true } },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!parentProfile) throw new AppError('Parent portal access is not linked to any child', StatusCodes.FORBIDDEN);
  return parentProfile;
};

const assertParentCanAccessStudent = async (context: Context, studentId: string) => {
  const profile = await getParentProfile(context);
  const link = profile.children.find((child) => child.studentId === studentId);
  if (!link) throw new AppError('You do not have access to this student', StatusCodes.FORBIDDEN);
  return link.student;
};

const attendanceRecordsForStudent = async (studentId: string) => prisma.attendanceRecord.findMany({
  where: { studentId },
  include: {
    session: {
      include: {
        subject: true,
        course: true,
        section: true,
      },
    },
  },
  orderBy: { markedAt: 'desc' },
});

const subjectWiseSummary = (records: Awaited<ReturnType<typeof attendanceRecordsForStudent>>) => {
  const grouped = new Map<string, { subjectId: string; subjectName: string; records: Array<{ status: AttendanceStatus }> }>();
  records.forEach((record) => {
    const subjectId = record.session.subjectId;
    const existing = grouped.get(subjectId) ?? {
      subjectId,
      subjectName: record.session.subject?.name ?? 'Subject',
      records: [],
    };
    existing.records.push({ status: record.status });
    grouped.set(subjectId, existing);
  });
  return Array.from(grouped.values()).map((entry) => ({
    subjectId: entry.subjectId,
    subjectName: entry.subjectName,
    ...computeSummary(entry.records),
  }));
};

const monthlySummary = (records: Awaited<ReturnType<typeof attendanceRecordsForStudent>>) => {
  const grouped = new Map<string, Array<{ status: AttendanceStatus }>>();
  records.forEach((record) => {
    const date = record.session.sessionDate;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    grouped.set(key, [...(grouped.get(key) ?? []), { status: record.status }]);
  });
  return Array.from(grouped.entries()).sort(([a], [b]) => b.localeCompare(a)).map(([month, monthRecords]) => ({
    month,
    ...computeSummary(monthRecords),
  }));
};

const leaveStatus = async (studentId: string) => prisma.leaveRequest.findMany({
  where: { studentId },
  orderBy: { createdAt: 'desc' },
  take: 25,
});

const correctionStatus = async (studentId: string) => prisma.attendanceCorrectionRequest.findMany({
  where: { studentId },
  include: { session: { include: { subject: true } } },
  orderBy: { createdAt: 'desc' },
  take: 25,
});

const notificationsForStudent = async (institutionId: string, studentId: string) => prisma.notificationLog.findMany({
  where: { institutionId, studentId },
  orderBy: { createdAt: 'desc' },
  take: 50,
});

const buildStudentDashboard = async (student: any) => {
  const records = await attendanceRecordsForStudent(student.id);
  return {
    profile: sanitizeStudent(student),
    summary: computeSummary(records),
    subjects: subjectWiseSummary(records),
    months: monthlySummary(records),
    recentAttendance: records.slice(0, 20).map((record) => ({
      id: record.id,
      status: record.status,
      date: record.session.sessionDate,
      subject: record.session.subject?.name,
      course: record.session.course?.name,
      section: record.session.section?.name,
      period: record.session.period,
      remarks: record.remarks,
    })),
    leaves: await leaveStatus(student.id),
    corrections: await correctionStatus(student.id),
    notifications: await notificationsForStudent(student.institutionId, student.id),
  };
};

export const studentDashboard = async (context: Context) => buildStudentDashboard(await getStudentByPortalUser(context));
export const studentProfile = async (context: Context) => sanitizeStudent(await getStudentByPortalUser(context));
export const studentNotifications = async (context: Context) => {
  const student = await getStudentByPortalUser(context);
  return notificationsForStudent(student.institutionId, student.id);
};
export const studentReport = async (context: Context) => {
  const student = await getStudentByPortalUser(context);
  const records = await attendanceRecordsForStudent(student.id);
  return {
    profile: sanitizeStudent(student),
    summary: computeSummary(records),
    subjects: subjectWiseSummary(records),
    months: monthlySummary(records),
    rows: records.map((record) => ({
      date: record.session.sessionDate,
      subject: record.session.subject?.name,
      course: record.session.course?.name,
      section: record.session.section?.name,
      period: record.session.period,
      status: record.status,
      remarks: record.remarks,
    })),
  };
};

export const parentChildren = async (context: Context) => {
  const profile = await getParentProfile(context);
  return profile.children.map((child) => sanitizeStudent(child.student));
};

export const parentChildDashboard = async (context: Context, studentId: string) => buildStudentDashboard(await assertParentCanAccessStudent(context, studentId));
export const parentChildReport = async (context: Context, studentId: string) => {
  await assertParentCanAccessStudent(context, studentId);
  const records = await attendanceRecordsForStudent(studentId);
  const student = await prisma.student.findUniqueOrThrow({
    where: { id: studentId },
    include: { course: true, section: true, institution: { include: { appSettings: true } } },
  });
  return {
    profile: sanitizeStudent(student),
    summary: computeSummary(records),
    subjects: subjectWiseSummary(records),
    months: monthlySummary(records),
    rows: records.map((record) => ({
      date: record.session.sessionDate,
      subject: record.session.subject?.name,
      status: record.status,
      remarks: record.remarks,
    })),
  };
};

export const parentNotifications = async (context: Context) => {
  const profile = await getParentProfile(context);
  const studentIds = profile.children.map((child) => child.studentId);
  return prisma.notificationLog.findMany({
    where: { institutionId: requireInstitution(context), studentId: { in: studentIds } },
    orderBy: { createdAt: 'desc' },
    take: 75,
  });
};

export const createStudentPortalAccess = async (context: Context, input: { studentId: string; email?: string; password: string }) => {
  const institutionId = requireInstitution(context);
  const student = await prisma.student.findFirst({ where: { id: input.studentId, institutionId, isActive: true } });
  if (!student) throw new AppError('Student not found', StatusCodes.NOT_FOUND);
  const email = (input.email || student.email || '').trim().toLowerCase();
  if (!email) throw new AppError('Student email is required to create portal access', StatusCodes.BAD_REQUEST);
  if (!input.password || input.password.length < 8) throw new AppError('Password must be at least 8 characters', StatusCodes.BAD_REQUEST);

  const data = await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email },
      update: { name: student.name, role: Role.STUDENT, institutionId, passwordHash: await bcrypt.hash(input.password, 12), isActive: true },
      create: { name: student.name, email, role: Role.STUDENT, institutionId, passwordHash: await bcrypt.hash(input.password, 12), isActive: true },
    });
    return tx.student.update({ where: { id: student.id }, data: { portalUserId: user.id }, include: { portalUser: { select: { id: true, email: true, role: true, isActive: true } } } });
  });

  await writeAuditLog({ actorId: context.userId, institutionId, action: 'STUDENT_PORTAL_ACCESS_UPDATED', entityType: 'Student', entityId: student.id }).catch(() => undefined);
  return data;
};

export const createParentPortalAccess = async (context: Context, input: { name: string; email: string; phone?: string; password: string; studentIds: string[] }) => {
  const institutionId = requireInstitution(context);
  const email = input.email.trim().toLowerCase();
  if (!email) throw new AppError('Parent email is required', StatusCodes.BAD_REQUEST);
  if (!input.password || input.password.length < 8) throw new AppError('Password must be at least 8 characters', StatusCodes.BAD_REQUEST);
  if (!Array.isArray(input.studentIds) || input.studentIds.length === 0) throw new AppError('At least one student is required', StatusCodes.BAD_REQUEST);

  const students = await prisma.student.findMany({ where: { institutionId, id: { in: input.studentIds }, isActive: true } });
  if (students.length !== new Set(input.studentIds).size) throw new AppError('One or more students are invalid', StatusCodes.BAD_REQUEST);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email },
      update: { name: input.name, role: Role.PARENT, institutionId, passwordHash: await bcrypt.hash(input.password, 12), isActive: true },
      create: { name: input.name, email, role: Role.PARENT, institutionId, passwordHash: await bcrypt.hash(input.password, 12), isActive: true },
    });
    const profile = await tx.parentProfile.upsert({
      where: { userId: user.id },
      update: { phone: input.phone },
      create: { institutionId, userId: user.id, phone: input.phone },
    });
    await tx.parentStudent.deleteMany({ where: { parentProfileId: profile.id } });
    await tx.parentStudent.createMany({
      data: students.map((student) => ({ institutionId, parentProfileId: profile.id, studentId: student.id })),
      skipDuplicates: true,
    });
    return tx.parentProfile.findUnique({ where: { id: profile.id }, include: { user: { select: { id: true, email: true, name: true, role: true } }, children: { include: { student: true } } } });
  });

  await writeAuditLog({ actorId: context.userId, institutionId, action: 'PARENT_PORTAL_ACCESS_UPDATED', entityType: 'ParentProfile', entityId: result?.id }).catch(() => undefined);
  return result;
};

import { AttendanceStatus, Prisma } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { getPagination, toPaginatedResponse } from '../utils/pagination.js';
import { writeAuditLog } from './audit.service.js';
import { getNotificationSettings, sendAbsentAlert, sendLowAttendanceAlert } from './notification.service.js';

interface ProfessorContext {
  userId?: string;
  institutionId?: string | null;
}

const requireProfessor = (context: ProfessorContext) => {
  if (!context.userId || !context.institutionId) {
    throw new AppError('Professor is not linked to an institution', StatusCodes.BAD_REQUEST);
  }
  return { userId: context.userId, institutionId: context.institutionId };
};

const startOfDay = (value: string | Date) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AppError('Invalid session date', StatusCodes.BAD_REQUEST);
  }
  date.setHours(0, 0, 0, 0);
  return date;
};

const assignmentInclude = {
  course: true,
  subject: true,
  semester: true,
  section: true,
} satisfies Prisma.ProfessorSubjectAssignmentInclude;

const toAssignmentDto = (assignment: Prisma.ProfessorSubjectAssignmentGetPayload<{ include: typeof assignmentInclude }>) => ({
  id: assignment.id,
  courseId: assignment.courseId,
  classId: assignment.courseId,
  className: assignment.course.name,
  subjectId: assignment.subjectId,
  subjectName: assignment.subject.name,
  semesterId: assignment.semesterId,
  semesterName: assignment.semester?.name ?? null,
  sectionId: assignment.sectionId,
  sectionName: assignment.section?.name ?? null,
});

const sessionInclude = {
  course: true,
  subject: true,
  semester: true,
  section: true,
  records: { include: { student: true }, orderBy: { student: { rollNumber: 'asc' } } },
} satisfies Prisma.AttendanceSessionInclude;

const toSessionDto = (session: Prisma.AttendanceSessionGetPayload<{ include: typeof sessionInclude }>) => ({
  id: session.id,
  courseId: session.courseId,
  classId: session.courseId,
  className: session.course.name,
  subjectId: session.subjectId,
  subjectName: session.subject.name,
  semesterId: session.semesterId,
  semesterName: session.semester?.name ?? null,
  sectionId: session.sectionId,
  sectionName: session.section?.name ?? null,
  sessionDate: session.sessionDate.toISOString(),
  period: session.period,
  topic: session.topic,
  notes: session.notes,
  isLocked: session.isLocked,
  lockedAt: session.lockedAt?.toISOString() ?? null,
  records: session.records.map((record) => ({
    id: record.id,
    studentId: record.studentId,
    studentName: record.student.name,
    rollNo: record.student.rollNumber,
    status: record.status,
    remarks: record.remarks,
  })),
});

export const getProfessorAssignments = async (context: ProfessorContext) => {
  const { userId } = requireProfessor(context);
  const assignments = await prisma.professorSubjectAssignment.findMany({
    where: { professorId: userId, isActive: true },
    include: assignmentInclude,
    orderBy: { createdAt: 'desc' },
  });
  return assignments.map(toAssignmentDto);
};

export const getProfessorDashboard = async (context: ProfessorContext) => {
  const { userId } = requireProfessor(context);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [assignments, sessions] = await Promise.all([
    getProfessorAssignments(context),
    prisma.attendanceSession.findMany({
      where: { professorId: userId },
      include: sessionInclude,
      orderBy: { sessionDate: 'desc' },
      take: 5,
    }),
  ]);
  const todaySessions = sessions.filter((session) => session.sessionDate >= today && session.sessionDate < tomorrow);

  return {
    assignedCount: assignments.length,
    classCount: new Set(assignments.map((assignment) => assignment.classId)).size,
    subjectCount: new Set(assignments.map((assignment) => assignment.subjectId)).size,
    todaySessionCount: todaySessions.length,
    pendingAttendanceCount: Math.max(assignments.length - todaySessions.length, 0),
    recentSessions: sessions.map(toSessionDto),
    assignments,
  };
};

export const getClassStudents = async (context: ProfessorContext, classId: string, query: any) => {
  const { userId, institutionId } = requireProfessor(context);
  const assignment = await prisma.professorSubjectAssignment.findFirst({
    where: { professorId: userId, courseId: classId, isActive: true },
  });
  if (!assignment) throw new AppError('Class is not assigned to this professor', StatusCodes.FORBIDDEN);
  const sectionId = typeof query.sectionId === 'string' ? query.sectionId : assignment.sectionId;
  const students = await prisma.student.findMany({
    where: {
      institutionId,
      courseId: classId,
      ...(sectionId ? { sectionId } : {}),
      isActive: true,
    },
    orderBy: { rollNumber: 'asc' },
  });
  return students.map((student) => ({
    id: student.id,
    name: student.name,
    rollNo: student.rollNumber,
    phone: student.phone ?? '',
    parentPhone: student.parentPhone ?? '',
    courseId: student.courseId,
    sectionId: student.sectionId,
  }));
};

const assertAssignment = async (context: ProfessorContext, courseId: string, subjectId: string, semesterId?: string | null, sectionId?: string | null) => {
  const { userId } = requireProfessor(context);
  const [assignment, subject, section, semester] = await Promise.all([
    prisma.professorSubjectAssignment.findFirst({
      where: {
        professorId: userId,
        courseId,
        subjectId,
        isActive: true,
        OR: [{ sectionId }, { sectionId: null }],
        AND: semesterId ? [{ OR: [{ semesterId }, { semesterId: null }] }] : [],
      },
    }),
    prisma.subject.findFirst({ where: { id: subjectId, courseId } }),
    sectionId ? prisma.section.findFirst({ where: { id: sectionId, courseId, ...(semesterId ? { semesterId } : {}) } }) : Promise.resolve(null),
    semesterId ? prisma.semester.findFirst({ where: { id: semesterId, courseId } }) : Promise.resolve(null),
  ]);
  if (!assignment) throw new AppError('This class and subject are not assigned to this professor', StatusCodes.FORBIDDEN);
  if (!subject) throw new AppError('Subject does not belong to the selected class', StatusCodes.BAD_REQUEST);
  if (sectionId && !section) throw new AppError('Section does not belong to the selected class and semester', StatusCodes.BAD_REQUEST);
  if (semesterId && !semester) throw new AppError('Semester does not belong to the selected class', StatusCodes.BAD_REQUEST);
};

const assertRecordsBelongToClass = async (courseId: string, sectionId: string | null | undefined, records: { studentId: string }[]) => {
  const studentCount = await prisma.student.count({
    where: {
      id: { in: records.map((record) => record.studentId) },
      courseId,
      ...(sectionId ? { sectionId } : {}),
      isActive: true,
    },
  });
  if (studentCount !== records.length) {
    throw new AppError('One or more students do not belong to the selected class', StatusCodes.BAD_REQUEST);
  }
};

const attendancePercentageForStudent = async (studentId: string) => {
  const records = await prisma.attendanceRecord.findMany({
    where: { studentId },
    select: { status: true },
  });
  if (records.length === 0) return 100;
  const attended = records.filter((record) => record.status === 'PRESENT').length;
  return (attended / records.length) * 100;
};

const sendAttendanceNotifications = async (
  context: { userId: string; institutionId: string },
  records: { studentId: string; status: AttendanceStatus }[],
  attendanceSessionId?: string,
) => {
  const settings = await getNotificationSettings(context);
  const threshold = settings.warningAttendancePct ?? settings.minimumAttendancePct ?? 75;

  const tasks = records.flatMap((record) => {
    const notifications: Promise<unknown>[] = [];
    if (record.status === 'ABSENT') {
      if (settings.emailEnabled) notifications.push(sendAbsentAlert(context, record.studentId, 'email', attendanceSessionId));
      if (settings.whatsappEnabled) notifications.push(sendAbsentAlert(context, record.studentId, 'whatsapp', attendanceSessionId));
    }
    notifications.push(attendancePercentageForStudent(record.studentId).then(async (percentage) => {
      if (percentage >= threshold) return undefined;
      const jobs: Promise<unknown>[] = [];
      if (settings.whatsappEnabled) jobs.push(sendLowAttendanceAlert(context, record.studentId, 'whatsapp'));
      if (settings.smsEnabled && percentage <= settings.criticalAttendancePct) jobs.push(sendLowAttendanceAlert(context, record.studentId, 'sms'));
      if (settings.emailEnabled && percentage <= settings.severeAttendancePct) jobs.push(sendLowAttendanceAlert(context, record.studentId, 'email'));
      if (jobs.length === 0) jobs.push(sendLowAttendanceAlert(context, record.studentId, 'email'));
      return Promise.allSettled(jobs);
    }));
    return notifications.map((task) => task.catch((error) => {
      logger.warn('Attendance notification was not sent.', { studentId: record.studentId, error: error instanceof Error ? error.message : String(error) });
    }));
  });

  await Promise.allSettled(tasks);
};

const shouldLockAttendanceAfterSubmit = async (institutionId: string) => {
  const appSettings = await prisma.appSettings.findUnique({ where: { institutionId }, select: { settings: true } });
  const settings = appSettings?.settings;
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return false;
  return (settings as Record<string, unknown>).attendanceLockAfterSubmit === true;
};

export const createAttendanceSession = async (context: ProfessorContext, data: any) => {
  const { userId, institutionId } = requireProfessor(context);
  const sessionDate = startOfDay(data.sessionDate);
  const lockAfterSubmit = await shouldLockAttendanceAfterSubmit(institutionId);
  await assertAssignment(context, data.courseId, data.subjectId, data.semesterId, data.sectionId);
  await assertRecordsBelongToClass(data.courseId, data.sectionId, data.records);

  const duplicate = await prisma.attendanceSession.findFirst({
    where: {
      sessionDate,
      courseId: data.courseId,
      subjectId: data.subjectId,
      professorId: userId,
      period: data.period,
      sectionId: data.sectionId ?? null,
    },
  });
  if (duplicate) {
    throw new AppError('Attendance already exists for this date, class, section, subject, professor, and period.', StatusCodes.CONFLICT);
  }

  const session = await prisma.attendanceSession.create({
    data: {
      institutionId,
      courseId: data.courseId,
      subjectId: data.subjectId,
      semesterId: data.semesterId,
      sectionId: data.sectionId,
      professorId: userId,
      sessionDate,
      period: data.period,
      topic: data.topic,
      notes: data.notes,
      isLocked: lockAfterSubmit,
      lockedAt: lockAfterSubmit ? new Date() : null,
      records: {
        create: data.records.map((record: any) => ({
          studentId: record.studentId,
          status: record.status as AttendanceStatus,
          remarks: record.remarks,
        })),
      },
    },
    include: sessionInclude,
  });
  await writeAuditLog({ actorId: userId, institutionId, action: 'CREATE', entityType: 'AttendanceSession', entityId: session.id, metadata: { courseId: data.courseId, subjectId: data.subjectId, sectionId: data.sectionId, period: data.period, sessionDate } });
  await sendAttendanceNotifications({ userId, institutionId }, session.records.map((record) => ({ studentId: record.studentId, status: record.status })), session.id);
  return toSessionDto(session);
};

export const listAttendanceSessions = async (context: ProfessorContext, query: unknown) => {
  const { userId } = requireProfessor(context);
  const { page, pageSize, skip, take } = getPagination(query);
  const filters = query && typeof query === 'object' ? query as Record<string, unknown> : {};
  const fromDate = typeof filters.fromDate === 'string' ? startOfDay(filters.fromDate) : undefined;
  const toDate = typeof filters.toDate === 'string' ? startOfDay(filters.toDate) : undefined;
  if (toDate) toDate.setHours(23, 59, 59, 999);
  const where: Prisma.AttendanceSessionWhereInput = {
    professorId: userId,
    ...(typeof filters.classId === 'string' ? { courseId: filters.classId } : {}),
    ...(typeof filters.courseId === 'string' ? { courseId: filters.courseId } : {}),
    ...(typeof filters.subjectId === 'string' ? { subjectId: filters.subjectId } : {}),
    ...(typeof filters.sectionId === 'string' ? { sectionId: filters.sectionId } : {}),
    ...(filters.locked === 'true' ? { isLocked: true } : {}),
    ...(filters.locked === 'false' ? { isLocked: false } : {}),
    ...(fromDate || toDate ? { sessionDate: { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lte: toDate } : {}) } } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.attendanceSession.findMany({ where, include: sessionInclude, skip, take, orderBy: { sessionDate: 'desc' } }),
    prisma.attendanceSession.count({ where }),
  ]);
  return toPaginatedResponse(items.map(toSessionDto), total, page, pageSize);
};

export const getAttendanceSession = async (context: ProfessorContext, id: string) => {
  const { userId } = requireProfessor(context);
  const session = await prisma.attendanceSession.findFirst({ where: { id, professorId: userId }, include: sessionInclude });
  if (!session) throw new AppError('Attendance session not found', StatusCodes.NOT_FOUND);
  return toSessionDto(session);
};

export const updateAttendanceSession = async (context: ProfessorContext, id: string, data: any) => {
  const { userId, institutionId } = requireProfessor(context);
  const existing = await prisma.attendanceSession.findFirst({ where: { id, professorId: userId }, include: { records: true } });
  if (!existing) throw new AppError('Attendance session not found', StatusCodes.NOT_FOUND);
  if (existing.isLocked) throw new AppError('Locked attendance sessions cannot be edited.', StatusCodes.CONFLICT);
  if (data.records) await assertRecordsBelongToClass(existing.courseId, existing.sectionId, data.records);

  const session = await prisma.$transaction(async (tx) => {
    if (data.records) {
      for (const record of data.records) {
        await tx.attendanceRecord.upsert({
          where: { sessionId_studentId: { sessionId: id, studentId: record.studentId } },
          update: { status: record.status, remarks: record.remarks },
          create: { sessionId: id, studentId: record.studentId, status: record.status, remarks: record.remarks },
        });
      }
    }
    return tx.attendanceSession.update({
      where: { id },
      data: { topic: data.topic, notes: data.notes },
      include: sessionInclude,
    });
  });
  await writeAuditLog({ actorId: userId, institutionId, action: 'UPDATE', entityType: 'AttendanceSession', entityId: id, metadata: data });
  await sendAttendanceNotifications({ userId, institutionId }, session.records.map((record) => ({ studentId: record.studentId, status: record.status })), session.id);
  return toSessionDto(session);
};

export const lockAttendanceSession = async (context: ProfessorContext, id: string) => {
  const { userId, institutionId } = requireProfessor(context);
  const existing = await prisma.attendanceSession.findFirst({ where: { id, professorId: userId } });
  if (!existing) throw new AppError('Attendance session not found', StatusCodes.NOT_FOUND);
  const session = await prisma.attendanceSession.update({
    where: { id },
    data: { isLocked: true, lockedAt: new Date() },
    include: sessionInclude,
  });
  await writeAuditLog({ actorId: userId, institutionId, action: 'UPDATE', entityType: 'AttendanceSession', entityId: id, metadata: { locked: true } });
  return toSessionDto(session);
};

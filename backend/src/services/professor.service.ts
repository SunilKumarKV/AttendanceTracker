import { AttendanceStatus, Prisma } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { getPagination, toPaginatedResponse } from '../utils/pagination.js';
import { writeAuditLog } from './audit.service.js';
import { sendAbsentAlert, sendLowAttendanceAlert } from './notification.service.js';

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
  const [assignments, sessions] = await Promise.all([
    getProfessorAssignments(context),
    prisma.attendanceSession.findMany({
      where: { professorId: userId },
      include: sessionInclude,
      orderBy: { sessionDate: 'desc' },
      take: 5,
    }),
  ]);

  return {
    assignedCount: assignments.length,
    classCount: new Set(assignments.map((assignment) => assignment.classId)).size,
    subjectCount: new Set(assignments.map((assignment) => assignment.subjectId)).size,
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

const assertAssignment = async (context: ProfessorContext, courseId: string, subjectId: string, sectionId?: string | null) => {
  const { userId } = requireProfessor(context);
  const assignment = await prisma.professorSubjectAssignment.findFirst({
    where: {
      professorId: userId,
      courseId,
      subjectId,
      isActive: true,
      OR: [{ sectionId }, { sectionId: null }],
    },
  });
  if (!assignment) throw new AppError('This class and subject are not assigned to this professor', StatusCodes.FORBIDDEN);
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
  const attended = records.filter((record) => record.status === 'PRESENT' || record.status === 'LATE' || record.status === 'EXCUSED').length;
  return (attended / records.length) * 100;
};

const sendAttendanceNotifications = async (
  context: { userId: string; institutionId: string },
  records: { studentId: string; status: AttendanceStatus }[],
) => {
  const settings = await prisma.appSettings.findUnique({ where: { institutionId: context.institutionId } });
  const threshold = settings?.minimumAttendancePct ?? 75;

  const tasks = records.flatMap((record) => {
    const notifications: Promise<unknown>[] = [];
    if (record.status === 'ABSENT') {
      notifications.push(sendAbsentAlert(context, record.studentId).catch((error) => {
        logger.warn('Absent alert was not sent.', { studentId: record.studentId, error: error instanceof Error ? error.message : String(error) });
      }));
    }
    notifications.push(attendancePercentageForStudent(record.studentId).then((percentage) => {
      if (percentage < threshold) return sendLowAttendanceAlert(context, record.studentId);
      return undefined;
    }).catch((error) => {
      logger.warn('Low attendance alert was not sent.', { studentId: record.studentId, error: error instanceof Error ? error.message : String(error) });
    }));
    return notifications;
  });

  await Promise.allSettled(tasks);
};

export const createAttendanceSession = async (context: ProfessorContext, data: any) => {
  const { userId, institutionId } = requireProfessor(context);
  const sessionDate = startOfDay(data.sessionDate);
  await assertAssignment(context, data.courseId, data.subjectId, data.sectionId);
  await assertRecordsBelongToClass(data.courseId, data.sectionId, data.records);

  const duplicate = await prisma.attendanceSession.findUnique({
    where: {
      sessionDate_courseId_subjectId_professorId: {
        sessionDate,
        courseId: data.courseId,
        subjectId: data.subjectId,
        professorId: userId,
      },
    },
  });
  if (duplicate) {
    throw new AppError('Attendance already exists for this date, class, subject, and professor.', StatusCodes.CONFLICT);
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
      topic: data.topic,
      notes: data.notes,
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
  await writeAuditLog({ actorId: userId, institutionId, action: 'CREATE', entityType: 'AttendanceSession', entityId: session.id, metadata: { courseId: data.courseId, subjectId: data.subjectId, sessionDate } });
  await sendAttendanceNotifications({ userId, institutionId }, session.records.map((record) => ({ studentId: record.studentId, status: record.status })));
  return toSessionDto(session);
};

export const listAttendanceSessions = async (context: ProfessorContext, query: unknown) => {
  const { userId } = requireProfessor(context);
  const { page, pageSize, skip, take } = getPagination(query);
  const where: Prisma.AttendanceSessionWhereInput = { professorId: userId };
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
  await sendAttendanceNotifications({ userId, institutionId }, session.records.map((record) => ({ studentId: record.studentId, status: record.status })));
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

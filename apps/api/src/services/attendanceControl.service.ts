import { AttendanceStatus, Prisma, RequestStatus } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { writeAuditLog } from './audit.service.js';

interface Context {
  userId?: string;
  institutionId?: string | null;
}

const requireInstitution = (context: Context) => {
  if (!context.institutionId) throw new AppError('User is not linked to an institution', StatusCodes.BAD_REQUEST);
  return context.institutionId;
};

const startOfDay = (value: string | Date) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new AppError('Invalid date', StatusCodes.BAD_REQUEST);
  date.setHours(0, 0, 0, 0);
  return date;
};

const academicYearFor = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  return month >= 6 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
};

export const getPolicy = async (institutionId: string) => {
  return prisma.attendancePolicy.upsert({
    where: { institutionId },
    update: {},
    create: { institutionId },
  });
};

export const assertAttendanceDateAllowed = async (
  institutionId: string,
  sessionDate: Date,
  allowAdminOverride = false,
) => {
  const date = startOfDay(sessionDate);
  const policy = await getPolicy(institutionId);
  const holiday = await prisma.holiday.findUnique({ where: { institutionId_date: { institutionId, date } } });
  const isWorkingDay = policy.workingDays.includes(date.getDay());
  if (allowAdminOverride && policy.adminOverrideEnabled) return { policy, holiday, isWorkingDay };
  if (holiday) throw new AppError(`Attendance is blocked on holiday: ${holiday.name}`, StatusCodes.CONFLICT);
  if (!isWorkingDay) throw new AppError('Attendance is blocked on a non-working day.', StatusCodes.CONFLICT);
  return { policy, holiday, isWorkingDay };
};

export const isSessionFrozen = async (institutionId: string, sessionDate: Date, locked: boolean) => {
  if (locked) return true;
  const policy = await getPolicy(institutionId);
  const freezeAt = new Date(sessionDate);
  freezeAt.setHours(freezeAt.getHours() + policy.lockAfterHours);
  return Date.now() > freezeAt.getTime();
};

export const applyApprovedLeaveStatuses = async (
  institutionId: string,
  sessionDate: Date,
  records: { studentId: string; status: AttendanceStatus; remarks?: string | null }[],
) => {
  const date = startOfDay(sessionDate);
  const leaves = await prisma.leaveRequest.findMany({
    where: {
      institutionId,
      status: RequestStatus.APPROVED,
      fromDate: { lte: date },
      toDate: { gte: date },
      studentId: { in: records.map((record) => record.studentId) },
    },
    select: { studentId: true },
  });
  const leaveStudentIds = new Set(leaves.map((leave) => leave.studentId));
  return records.map((record) => (
    leaveStudentIds.has(record.studentId)
      ? { ...record, status: AttendanceStatus.EXCUSED, remarks: record.remarks || 'Approved leave' }
      : record
  ));
};

const notifyInApp = async (institutionId: string, recipient: string, type: string, message: string, subject?: string) => {
  await prisma.notificationLog.create({
    data: {
      institutionId,
      channel: 'in_app',
      recipient,
      recipientType: 'user',
      type,
      subject,
      message,
      status: 'created',
      provider: 'internal',
    },
  });
};

export const listHolidays = async (context: Context, query: Record<string, unknown>) => {
  const institutionId = requireInstitution(context);
  const academicYear = typeof query.academicYear === 'string' ? query.academicYear : undefined;
  return prisma.holiday.findMany({
    where: { institutionId, ...(academicYear ? { academicYear } : {}) },
    orderBy: { date: 'asc' },
  });
};

export const createHoliday = async (context: Context, data: any) => {
  const institutionId = requireInstitution(context);
  const date = startOfDay(data.date);
  const holiday = await prisma.holiday.upsert({
    where: { institutionId_date: { institutionId, date } },
    update: { name: data.name, description: data.description ?? null, academicYear: data.academicYear ?? academicYearFor(date) },
    create: { institutionId, date, name: data.name, description: data.description ?? null, academicYear: data.academicYear ?? academicYearFor(date) },
  });
  await writeAuditLog({ actorId: context.userId, institutionId, action: 'UPSERT', entityType: 'Holiday', entityId: holiday.id, metadata: data });
  return holiday;
};

export const updateHoliday = async (context: Context, id: string, data: any) => {
  const institutionId = requireInstitution(context);
  const date = data.date ? startOfDay(data.date) : undefined;
  const holiday = await prisma.holiday.update({ where: { id }, data: { ...data, date } });
  if (holiday.institutionId !== institutionId) throw new AppError('Holiday not found', StatusCodes.NOT_FOUND);
  await writeAuditLog({ actorId: context.userId, institutionId, action: 'UPDATE', entityType: 'Holiday', entityId: id, metadata: data });
  return holiday;
};

export const deleteHoliday = async (context: Context, id: string) => {
  const institutionId = requireInstitution(context);
  const holiday = await prisma.holiday.findFirst({ where: { id, institutionId } });
  if (!holiday) throw new AppError('Holiday not found', StatusCodes.NOT_FOUND);
  await prisma.holiday.delete({ where: { id } });
  await writeAuditLog({ actorId: context.userId, institutionId, action: 'DELETE', entityType: 'Holiday', entityId: id });
};

export const updatePolicy = async (context: Context, data: any) => {
  const institutionId = requireInstitution(context);
  const policy = await prisma.attendancePolicy.upsert({
    where: { institutionId },
    update: {
      lockAfterHours: data.lockAfterHours,
      workingDays: data.workingDays,
      adminOverrideEnabled: data.adminOverrideEnabled,
    },
    create: {
      institutionId,
      lockAfterHours: data.lockAfterHours ?? 24,
      workingDays: data.workingDays ?? [1, 2, 3, 4, 5, 6],
      adminOverrideEnabled: data.adminOverrideEnabled ?? true,
    },
  });
  await writeAuditLog({ actorId: context.userId, institutionId, action: 'UPDATE', entityType: 'AttendancePolicy', entityId: policy.id, metadata: data });
  return policy;
};

export const todayStatus = async (context: Context) => {
  const institutionId = requireInstitution(context);
  const date = startOfDay(new Date());
  const policy = await getPolicy(institutionId);
  const holiday = await prisma.holiday.findUnique({ where: { institutionId_date: { institutionId, date } } });
  return { date, workingDay: policy.workingDays.includes(date.getDay()), holiday, policy };
};

export const createCorrectionRequest = async (context: Context, data: any) => {
  const institutionId = requireInstitution(context);
  if (!context.userId) throw new AppError('Unauthorized', StatusCodes.UNAUTHORIZED);
  if (!data.reason || String(data.reason).trim().length < 3) throw new AppError('Reason is required', StatusCodes.BAD_REQUEST);
  const session = await prisma.attendanceSession.findFirst({
    where: { id: data.sessionId, institutionId, professorId: context.userId },
    include: { records: true },
  });
  if (!session) throw new AppError('Attendance session not found', StatusCodes.NOT_FOUND);
  const record = data.attendanceRecordId
    ? session.records.find((item) => item.id === data.attendanceRecordId)
    : data.studentId
      ? session.records.find((item) => item.studentId === data.studentId)
      : undefined;
  const request = await prisma.attendanceCorrectionRequest.create({
    data: {
      institutionId,
      sessionId: session.id,
      attendanceRecordId: record?.id ?? null,
      studentId: record?.studentId ?? data.studentId ?? null,
      requestedById: context.userId,
      currentStatus: record?.status ?? null,
      requestedStatus: data.requestedStatus ?? null,
      reason: String(data.reason).trim(),
    },
  });
  await notifyInApp(institutionId, 'admin', 'correction_request', 'New attendance correction request submitted.', 'Attendance correction request');
  await writeAuditLog({ actorId: context.userId, institutionId, action: 'CREATE', entityType: 'AttendanceCorrectionRequest', entityId: request.id, metadata: data });
  return request;
};

export const listCorrectionRequests = async (context: Context, status?: string) => {
  const institutionId = requireInstitution(context);
  return prisma.attendanceCorrectionRequest.findMany({
    where: { institutionId, ...(status ? { status: status as RequestStatus } : {}) },
    include: { requestedBy: { select: { name: true, email: true, role: true } }, reviewedBy: { select: { name: true, email: true } }, student: true, session: { include: { course: true, subject: true, section: true } } },
    orderBy: { createdAt: 'desc' },
  });
};

export const reviewCorrectionRequest = async (context: Context, id: string, approved: boolean, adminNote?: string) => {
  const institutionId = requireInstitution(context);
  if (!context.userId) throw new AppError('Unauthorized', StatusCodes.UNAUTHORIZED);
  const request = await prisma.attendanceCorrectionRequest.findFirst({ where: { id, institutionId }, include: { attendanceRecord: true } });
  if (!request) throw new AppError('Correction request not found', StatusCodes.NOT_FOUND);
  if (request.status !== RequestStatus.PENDING) throw new AppError('Correction request is already reviewed', StatusCodes.CONFLICT);
  const result = await prisma.$transaction(async (tx) => {
    if (approved && request.attendanceRecordId && request.requestedStatus) {
      await tx.attendanceRecord.update({ where: { id: request.attendanceRecordId }, data: { status: request.requestedStatus, remarks: adminNote ?? request.attendanceRecord?.remarks } });
    }
    return tx.attendanceCorrectionRequest.update({
      where: { id },
      data: { status: approved ? RequestStatus.APPROVED : RequestStatus.REJECTED, reviewedById: context.userId, adminNote, resolvedAt: new Date() },
    });
  });
  await notifyInApp(institutionId, request.requestedById, 'correction_reviewed', `Correction request ${approved ? 'approved' : 'rejected'}.`, 'Correction request reviewed');
  await writeAuditLog({ actorId: context.userId, institutionId, action: approved ? 'APPROVE' : 'REJECT', entityType: 'AttendanceCorrectionRequest', entityId: id, metadata: { adminNote } });
  return result;
};

export const createLeaveRequest = async (context: Context, data: any) => {
  const institutionId = requireInstitution(context);
  const fromDate = startOfDay(data.fromDate);
  const toDate = startOfDay(data.toDate);
  if (toDate < fromDate) throw new AppError('Leave end date cannot be before start date', StatusCodes.BAD_REQUEST);
  if (!data.reason || String(data.reason).trim().length < 3) throw new AppError('Reason is required', StatusCodes.BAD_REQUEST);
  const student = await prisma.student.findFirst({ where: { id: data.studentId, institutionId, isActive: true } });
  if (!student) throw new AppError('Student not found', StatusCodes.NOT_FOUND);
  const leave = await prisma.leaveRequest.create({
    data: { institutionId, studentId: data.studentId, requestedById: context.userId ?? null, fromDate, toDate, reason: String(data.reason).trim() },
  });
  await notifyInApp(institutionId, 'admin', 'leave_request', 'New student leave request submitted.', 'Student leave request');
  await writeAuditLog({ actorId: context.userId, institutionId, action: 'CREATE', entityType: 'LeaveRequest', entityId: leave.id, metadata: data });
  return leave;
};

export const listLeaveRequests = async (context: Context, status?: string) => {
  const institutionId = requireInstitution(context);
  return prisma.leaveRequest.findMany({
    where: { institutionId, ...(status ? { status: status as RequestStatus } : {}) },
    include: { student: { include: { course: true, section: true } }, requestedBy: { select: { name: true, email: true, role: true } }, reviewedBy: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  });
};

export const reviewLeaveRequest = async (context: Context, id: string, approved: boolean, adminNote?: string) => {
  const institutionId = requireInstitution(context);
  if (!context.userId) throw new AppError('Unauthorized', StatusCodes.UNAUTHORIZED);
  const leave = await prisma.leaveRequest.findFirst({ where: { id, institutionId } });
  if (!leave) throw new AppError('Leave request not found', StatusCodes.NOT_FOUND);
  if (leave.status !== RequestStatus.PENDING) throw new AppError('Leave request is already reviewed', StatusCodes.CONFLICT);
  const result = await prisma.leaveRequest.update({
    where: { id },
    data: { status: approved ? RequestStatus.APPROVED : RequestStatus.REJECTED, reviewedById: context.userId, adminNote, resolvedAt: new Date() },
  });
  if (leave.requestedById) await notifyInApp(institutionId, leave.requestedById, 'leave_reviewed', `Leave request ${approved ? 'approved' : 'rejected'}.`, 'Leave request reviewed');
  await writeAuditLog({ actorId: context.userId, institutionId, action: approved ? 'APPROVE' : 'REJECT', entityType: 'LeaveRequest', entityId: id, metadata: { adminNote } });
  return result;
};

export const dashboardCounts = async (institutionId: string) => {
  const [pendingCorrections, pendingLeaveRequests, today] = await Promise.all([
    prisma.attendanceCorrectionRequest.count({ where: { institutionId, status: RequestStatus.PENDING } }),
    prisma.leaveRequest.count({ where: { institutionId, status: RequestStatus.PENDING } }),
    todayStatus({ institutionId }),
  ]);
  return { pendingCorrections, pendingLeaveRequests, todayStatus: today };
};

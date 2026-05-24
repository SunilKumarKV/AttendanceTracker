import { Prisma, RequestStatus, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { StatusCodes } from 'http-status-codes';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { writeAuditLog } from './audit.service.js';
import { assertWithinPlanLimit } from './platform.service.js';

export interface Context {
  userId?: string;
  institutionId?: string | null;
  role?: Role;
}

const STAFF_STATUSES = new Set(['PRESENT', 'ABSENT', 'LATE', 'LEAVE']);
const DEFAULT_PASSWORD = 'ChangeMe@123';

const requireInstitution = (context: Context) => {
  if (!context.institutionId) {
    throw new AppError('User is not linked to an institution.', StatusCodes.BAD_REQUEST);
  }
  return context.institutionId;
};

const requireUser = (context: Context) => {
  if (!context.userId) {
    throw new AppError('Authentication required.', StatusCodes.UNAUTHORIZED);
  }
  return context.userId;
};

const normalizeDay = (value: string | Date) => {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AppError('Invalid date.', StatusCodes.BAD_REQUEST);
  }
  date.setHours(0, 0, 0, 0);
  return date;
};

const sanitizeStaffRole = (role?: string) => {
  const value = String(role ?? '').trim();
  if (!value) throw new AppError('Staff role is required.', StatusCodes.BAD_REQUEST);
  return value;
};

export const listStaff = async (context: Context, query: Record<string, unknown> = {}) => {
  const institutionId = requireInstitution(context);
  const page = Math.max(Number(query.page ?? 1), 1);
  const pageSize = Math.min(Math.max(Number(query.pageSize ?? 20), 1), 100);
  const search = String(query.search ?? '').trim();
  const where: Prisma.StaffProfileWhereInput = {
    institutionId,
    ...(search ? {
      OR: [
        { employeeCode: { contains: search, mode: 'insensitive' } },
        { staffRole: { contains: search, mode: 'insensitive' } },
        { department: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ],
    } : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.staffProfile.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true, role: true, isActive: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.staffProfile.count({ where }),
  ]);
  return { items, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
};

export const createStaff = async (context: Context, body: any) => {
  const institutionId = requireInstitution(context);
  const actorId = requireUser(context);
  const name = String(body.name ?? '').trim();
  const email = String(body.email ?? '').trim().toLowerCase();
  const employeeCode = String(body.employeeCode ?? '').trim();
  if (!name || !email || !employeeCode) {
    throw new AppError('Name, email, and employee code are required.', StatusCodes.BAD_REQUEST);
  }
  const passwordHash = await bcrypt.hash(String(body.password ?? DEFAULT_PASSWORD), 12);
  const data = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { institutionId, name, email, passwordHash, role: Role.STAFF, isActive: body.isActive ?? true },
    });
    const institutionId = requireInstitution(context);
const actorId = requireUser(context);

await assertWithinPlanLimit(institutionId, 'staff');
    return tx.staffProfile.create({
      data: {
        institutionId,
        userId: user.id,
        employeeCode,
        staffRole: sanitizeStaffRole(body.staffRole),
        department: body.department?.trim?.() || null,
        designation: body.designation?.trim?.() || null,
        phone: body.phone?.trim?.() || null,
        isActive: body.isActive ?? true,
      },
      include: { user: { select: { id: true, name: true, email: true, role: true, isActive: true } } },
    });
  });
  await writeAuditLog({ actorId, institutionId, action: 'STAFF_CREATED', entityType: 'StaffProfile', entityId: data.id, metadata: { employeeCode } }).catch(() => undefined);
  return data;
};

export const updateStaff = async (context: Context, id: string, body: any) => {
  const institutionId = requireInstitution(context);
  const actorId = requireUser(context);
  const existing = await prisma.staffProfile.findFirst({ where: { id, institutionId }, include: { user: true } });
  if (!existing) throw new AppError('Staff member not found.', StatusCodes.NOT_FOUND);
  const data = await prisma.$transaction(async (tx) => {
    if (body.name !== undefined || body.email !== undefined || body.isActive !== undefined) {
      await tx.user.update({
        where: { id: existing.userId },
        data: {
          ...(body.name !== undefined ? { name: String(body.name).trim() } : {}),
          ...(body.email !== undefined ? { email: String(body.email).trim().toLowerCase() } : {}),
          ...(body.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {}),
        },
      });
    }
    return tx.staffProfile.update({
      where: { id },
      data: {
        ...(body.employeeCode !== undefined ? { employeeCode: String(body.employeeCode).trim() } : {}),
        ...(body.staffRole !== undefined ? { staffRole: sanitizeStaffRole(body.staffRole) } : {}),
        ...(body.department !== undefined ? { department: String(body.department || '').trim() || null } : {}),
        ...(body.designation !== undefined ? { designation: String(body.designation || '').trim() || null } : {}),
        ...(body.phone !== undefined ? { phone: String(body.phone || '').trim() || null } : {}),
        ...(body.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {}),
      },
      include: { user: { select: { id: true, name: true, email: true, role: true, isActive: true } } },
    });
  });
  await writeAuditLog({ actorId, institutionId, action: 'STAFF_UPDATED', entityType: 'StaffProfile', entityId: id }).catch(() => undefined);
  return data;
};

export const deleteStaff = async (context: Context, id: string) => {
  const institutionId = requireInstitution(context);
  const actorId = requireUser(context);
  const existing = await prisma.staffProfile.findFirst({ where: { id, institutionId } });
  if (!existing) throw new AppError('Staff member not found.', StatusCodes.NOT_FOUND);
  await prisma.user.update({ where: { id: existing.userId }, data: { isActive: false } });
  await prisma.staffProfile.update({ where: { id }, data: { isActive: false } });
  await writeAuditLog({ actorId, institutionId, action: 'STAFF_DEACTIVATED', entityType: 'StaffProfile', entityId: id }).catch(() => undefined);
};

export const markStaffAttendance = async (context: Context, body: any) => {
  const institutionId = requireInstitution(context);
  const actorId = requireUser(context);
  const staffId = String(body.staffId ?? '');
  const status = String(body.status ?? '').toUpperCase();
  if (!STAFF_STATUSES.has(status)) throw new AppError('Invalid staff attendance status.', StatusCodes.BAD_REQUEST);
  const attendanceDate = normalizeDay(body.attendanceDate ?? new Date());
  const staff = await prisma.staffProfile.findFirst({ where: { id: staffId, institutionId, isActive: true } });
  if (!staff) throw new AppError('Staff member not found.', StatusCodes.NOT_FOUND);
  const data = await prisma.staffAttendanceRecord.upsert({
    where: { staffId_attendanceDate: { staffId, attendanceDate } },
    update: { status, remarks: body.remarks?.trim?.() || null, markedById: actorId },
    create: { institutionId, staffId, markedById: actorId, attendanceDate, status, remarks: body.remarks?.trim?.() || null },
    include: { staff: { include: { user: { select: { name: true, email: true } } } } },
  });
  await writeAuditLog({ actorId, institutionId, action: 'STAFF_ATTENDANCE_MARKED', entityType: 'StaffAttendanceRecord', entityId: data.id, metadata: { staffId, status } }).catch(() => undefined);
  return data;
};

export const listStaffAttendance = async (context: Context, query: Record<string, unknown> = {}) => {
  const institutionId = requireInstitution(context);
  const fromDate = query.fromDate ? normalizeDay(String(query.fromDate)) : undefined;
  const toDate = query.toDate ? normalizeDay(String(query.toDate)) : undefined;
  const where: Prisma.StaffAttendanceRecordWhereInput = {
    institutionId,
    ...(query.staffId ? { staffId: String(query.staffId) } : {}),
    ...(fromDate || toDate ? { attendanceDate: { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lte: toDate } : {}) } } : {}),
  };
  if (context.role === Role.STAFF) {
    const profile = await prisma.staffProfile.findUnique({ where: { userId: requireUser(context) }, select: { id: true } });
    where.staffId = profile?.id ?? '__none__';
  }
  return prisma.staffAttendanceRecord.findMany({
    where,
    include: { staff: { include: { user: { select: { name: true, email: true } } } }, markedBy: { select: { name: true, email: true } } },
    orderBy: [{ attendanceDate: 'desc' }, { createdAt: 'desc' }],
    take: 500,
  });
};

export const createStaffLeave = async (context: Context, body: any) => {
  const institutionId = requireInstitution(context);
  const actorId = requireUser(context);
  const staffId = context.role === Role.STAFF
    ? (await prisma.staffProfile.findUnique({ where: { userId: actorId }, select: { id: true, institutionId: true } }))?.id
    : String(body.staffId ?? '');
  if (!staffId) throw new AppError('Staff member is required.', StatusCodes.BAD_REQUEST);
  const staff = await prisma.staffProfile.findFirst({ where: { id: staffId, institutionId } });
  if (!staff) throw new AppError('Staff member not found.', StatusCodes.NOT_FOUND);
  const fromDate = normalizeDay(body.fromDate);
  const toDate = normalizeDay(body.toDate);
  if (toDate < fromDate) throw new AppError('To date must be after from date.', StatusCodes.BAD_REQUEST);
  const data = await prisma.staffLeaveRequest.create({
    data: { institutionId, staffId, requestedById: actorId, fromDate, toDate, reason: String(body.reason ?? '').trim() },
    include: { staff: { include: { user: { select: { name: true, email: true } } } } },
  });
  await writeAuditLog({ actorId, institutionId, action: 'STAFF_LEAVE_REQUESTED', entityType: 'StaffLeaveRequest', entityId: data.id }).catch(() => undefined);
  return data;
};

export const listStaffLeaves = async (context: Context, query: Record<string, unknown> = {}) => {
  const institutionId = requireInstitution(context);
  const where: Prisma.StaffLeaveRequestWhereInput = { institutionId };
  if (query.status) where.status = String(query.status).toUpperCase() as RequestStatus;
  if (context.role === Role.STAFF) {
    const profile = await prisma.staffProfile.findUnique({ where: { userId: requireUser(context) }, select: { id: true } });
    where.staffId = profile?.id ?? '__none__';
  } else if (query.staffId) {
    where.staffId = String(query.staffId);
  }
  return prisma.staffLeaveRequest.findMany({
    where,
    include: { staff: { include: { user: { select: { name: true, email: true } } } }, reviewedBy: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
};

export const reviewStaffLeave = async (context: Context, id: string, approved: boolean, adminNote?: string) => {
  const institutionId = requireInstitution(context);
  const actorId = requireUser(context);
  const leave = await prisma.staffLeaveRequest.findFirst({ where: { id, institutionId } });
  if (!leave) throw new AppError('Staff leave request not found.', StatusCodes.NOT_FOUND);
  if (leave.status !== RequestStatus.PENDING) throw new AppError('Leave request already reviewed.', StatusCodes.CONFLICT);
  const data = await prisma.staffLeaveRequest.update({
    where: { id },
    data: { status: approved ? RequestStatus.APPROVED : RequestStatus.REJECTED, reviewedById: actorId, adminNote: adminNote?.trim?.() || null, resolvedAt: new Date() },
    include: { staff: { include: { user: { select: { name: true, email: true } } } } },
  });
  if (approved) {
    for (let d = new Date(data.fromDate); d <= data.toDate; d.setDate(d.getDate() + 1)) {
      const attendanceDate = normalizeDay(d);
      await prisma.staffAttendanceRecord.upsert({
        where: { staffId_attendanceDate: { staffId: data.staffId, attendanceDate } },
        update: { status: 'LEAVE', remarks: data.reason, markedById: actorId },
        create: { institutionId, staffId: data.staffId, attendanceDate, status: 'LEAVE', remarks: data.reason, markedById: actorId },
      });
    }
  }
  await writeAuditLog({ actorId, institutionId, action: approved ? 'STAFF_LEAVE_APPROVED' : 'STAFF_LEAVE_REJECTED', entityType: 'StaffLeaveRequest', entityId: id }).catch(() => undefined);
  return data;
};

export const getStaffDashboard = async (context: Context) => {
  const institutionId = requireInstitution(context);
  const userId = requireUser(context);
  const staff = await prisma.staffProfile.findUnique({ where: { userId }, include: { user: { select: { name: true, email: true } } } });
  if (!staff || staff.institutionId !== institutionId) throw new AppError('Staff profile not found.', StatusCodes.NOT_FOUND);
  const start = new Date();
  start.setDate(1); start.setHours(0,0,0,0);
  const today = normalizeDay(new Date());
  const [monthlyRecords, leaves, todayRecord] = await prisma.$transaction([
    prisma.staffAttendanceRecord.findMany({ where: { staffId: staff.id, attendanceDate: { gte: start } }, orderBy: { attendanceDate: 'desc' } }),
    prisma.staffLeaveRequest.findMany({ where: { staffId: staff.id }, orderBy: { createdAt: 'desc' }, take: 10 }),
    prisma.staffAttendanceRecord.findUnique({ where: { staffId_attendanceDate: { staffId: staff.id, attendanceDate: today } } }),
  ]);
  return {
    staff,
    todayRecord,
    monthlySummary: Array.from(STAFF_STATUSES).reduce(
  (acc, status) => ({
    ...acc,
    [status]: monthlyRecords.filter((record) => record.status === status).length,
  }),
  {}
),
    monthlyRecords,
    leaves,
  };
};

export const getAdminStaffSummary = async (context: Context) => {
  const institutionId = requireInstitution(context);
  const today = normalizeDay(new Date());
  const [totalStaff, todayAttendance, absentToday, pendingLeaves] = await prisma.$transaction([
    prisma.staffProfile.count({ where: { institutionId, isActive: true } }),
    prisma.staffAttendanceRecord.count({ where: { institutionId, attendanceDate: today } }),
    prisma.staffAttendanceRecord.count({ where: { institutionId, attendanceDate: today, status: 'ABSENT' } }),
    prisma.staffLeaveRequest.count({ where: { institutionId, status: RequestStatus.PENDING } }),
  ]);
  return { totalStaff, todayAttendance, absentToday, pendingLeaves };
};

export const exportStaffReportRows = async (context: Context, query: Record<string, unknown> = {}) => {
  const records = await listStaffAttendance(context, query);
  return records.map((record) => ({
    date: record.attendanceDate.toISOString().slice(0, 10),
    employeeCode: record.staff.employeeCode,
    name: record.staff.user.name,
    role: record.staff.staffRole,
    department: record.staff.department ?? '',
    status: record.status,
    remarks: record.remarks ?? '',
  }));
};

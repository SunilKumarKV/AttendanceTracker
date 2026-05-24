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
  await assertWithinPlanLimit(institutionId, 'staff');

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
        ...(body.department !== undefined ? { department: body.department?.trim?.() || null } : {}),
        ...(body.designation !== undefined ? { designation: body.designation?.trim?.() || null } : {}),
        ...(body.phone !== undefined ? { phone: body.phone?.trim?.() || null } : {}),
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
  await prisma.staffProfile.update({ where: { id }, data: { isActive: false, user: { update: { isActive: false } } } });
  await writeAuditLog({ actorId, institutionId, action: 'STAFF_DELETED', entityType: 'StaffProfile', entityId: id }).catch(() => undefined);
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
  const data = await prisma.staffAttendance.upsert({
    where: { institutionId_staffId_attendanceDate: { institutionId, staffId, attendanceDate } },
    update: { status, remarks: body.remarks?.trim?.() || null, markedById: actorId },
    create: { institutionId, staffId, markedById: actorId, attendanceDate, status, remarks: body.remarks?.trim?.() || null },
  });
  await writeAuditLog({ actorId, institutionId, action: 'STAFF_ATTENDANCE_MARKED', entityType: 'StaffAttendance', entityId: data.id, metadata: { staffId, status } }).catch(() => undefined);
  return data;
};

export const listStaffAttendance = async (context: Context, query: Record<string, unknown> = {}) => {
  const institutionId = requireInstitution(context);
  const page = Math.max(Number(query.page ?? 1), 1);
  const pageSize = Math.min(Math.max(Number(query.pageSize ?? 20), 1), 100);
  const [items, total] = await prisma.$transaction([
    prisma.staffAttendance.findMany({
      where: { institutionId },
      include: { staff: { include: { user: { select: { id: true, name: true, email: true } } } } },
      orderBy: [{ attendanceDate: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.staffAttendance.count({ where: { institutionId } }),
  ]);
  return { items, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
};

export const createStaffLeave = async (context: Context, body: any) => {
  const institutionId = requireInstitution(context);
  const actorId = requireUser(context);
  const staffId = String(body.staffId ?? '');
  const fromDate = normalizeDay(body.fromDate);
  const toDate = normalizeDay(body.toDate);
  if (toDate < fromDate) throw new AppError('To date must be after from date.', StatusCodes.BAD_REQUEST);
  const staff = await prisma.staffProfile.findFirst({ where: { id: staffId, institutionId, isActive: true } });
  if (!staff) throw new AppError('Staff member not found.', StatusCodes.NOT_FOUND);
  const data = await prisma.staffLeaveRequest.create({
    data: { institutionId, staffId, requestedById: actorId, fromDate, toDate, reason: body.reason, status: RequestStatus.PENDING },
    include: { staff: { include: { user: { select: { name: true, email: true } } } } },
  });
  await writeAuditLog({ actorId, institutionId, action: 'STAFF_LEAVE_CREATED', entityType: 'StaffLeaveRequest', entityId: data.id }).catch(() => undefined);
  return data;
};

export const updateStaffLeaveStatus = async (context: Context, id: string, status: RequestStatus) => {
  const institutionId = requireInstitution(context);
  const actorId = requireUser(context);
  const data = await prisma.staffLeaveRequest.update({ where: { id }, data: { status } });
  if (status === RequestStatus.APPROVED) {
    let attendanceDate = normalizeDay(data.fromDate);
    const end = normalizeDay(data.toDate);
    await prisma.$transaction(async (tx) => {
      while (attendanceDate <= end) {
        await tx.staffAttendance.upsert({
          where: { institutionId_staffId_attendanceDate: { institutionId, staffId: data.staffId, attendanceDate } },
          update: { status: 'LEAVE', remarks: data.reason, markedById: actorId },
          create: { institutionId, staffId: data.staffId, attendanceDate, status: 'LEAVE', remarks: data.reason, markedById: actorId },
        });
        attendanceDate = new Date(attendanceDate);
        attendanceDate.setDate(attendanceDate.getDate() + 1);
      }
    });
  }
  await writeAuditLog({ actorId, institutionId, action: 'STAFF_LEAVE_UPDATED', entityType: 'StaffLeaveRequest', entityId: id, metadata: { status } }).catch(() => undefined);
  return data;
};

export const getStaffSelfProfile = async (context: Context) => {
  const actorId = requireUser(context);
  const staff = await prisma.staffProfile.findFirst({ where: { userId: actorId }, include: { user: true } });
  if (!staff) throw new AppError('Staff profile not found.', StatusCodes.NOT_FOUND);
  return staff;
};

export const getStaffSelfDashboard = async (context: Context) => {
  const staff = await getStaffSelfProfile(context);
  const [attendanceTotal, leaves] = await Promise.all([
    prisma.staffAttendance.count({ where: { staffId: staff.id } }),
    prisma.staffLeaveRequest.findMany({ where: { staffId: staff.id }, orderBy: { createdAt: 'desc' }, take: 10 }),
  ]);
  return { staff, summary: { attendanceTotal, leaveRequests: leaves.length }, recentLeaves: leaves };
};

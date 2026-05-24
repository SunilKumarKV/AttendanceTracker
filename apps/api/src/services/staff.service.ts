import { Prisma, Role } from '@prisma/client';
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

export const markStaffAttendance = async () => {
  throw new AppError('Staff attendance module is not enabled in this schema.', StatusCodes.NOT_IMPLEMENTED);
};

export const listStaffAttendance = async () => {
  return { items: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } };
};

export const createStaffLeave = async () => {
  throw new AppError('Staff leave module is not enabled in this schema.', StatusCodes.NOT_IMPLEMENTED);
};

export const listStaffLeaves = async () => {
  return { items: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } };
};

export const reviewStaffLeave = async () => {
  throw new AppError('Staff leave review module is not enabled in this schema.', StatusCodes.NOT_IMPLEMENTED);
};

export const getStaffSelfProfile = async (context: Context) => {
  const actorId = requireUser(context);
  const staff = await prisma.staffProfile.findFirst({ where: { userId: actorId }, include: { user: true } });
  if (!staff) throw new AppError('Staff profile not found.', StatusCodes.NOT_FOUND);
  return staff;
};

export const getStaffSelfDashboard = async (context: Context) => {
  const staff = await getStaffSelfProfile(context);
  return { staff, summary: { attendanceTotal: 0, leaveRequests: 0 }, recentLeaves: [] };
};

export const getStaffDashboard = async (context: Context) => getStaffSelfDashboard(context);

export const getAdminStaffSummary = async (context: Context) => {
  const institutionId = requireInstitution(context);
  const totalStaff = await prisma.staffProfile.count({ where: { institutionId, isActive: true } });
  return { totalStaff, presentToday: 0, absentToday: 0, pendingLeaves: 0 };
};

export const exportStaffReportRows = async (context: Context) => {
  const institutionId = requireInstitution(context);
  const staff = await prisma.staffProfile.findMany({
    where: { institutionId, isActive: true },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return staff.map((item) => ({
    date: new Date().toISOString().slice(0, 10),
    employeeCode: item.employeeCode,
    name: item.user?.name ?? '',
    email: item.user?.email ?? '',
    status: 'N/A',
  }));
};

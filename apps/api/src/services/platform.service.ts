import { Prisma, Role, SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { StatusCodes } from 'http-status-codes';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { writeAuditLog } from './audit.service.js';

interface PlatformContext { userId?: string; role?: Role; institutionId?: string | null }

const assertSuperAdmin = (context: PlatformContext) => {
  if (context.role !== Role.SUPER_ADMIN) {
    throw new AppError('Super Admin access required', StatusCodes.FORBIDDEN);
  }
};

const planLimits: Record<SubscriptionPlan, { students: number; teachers: number; staff: number }> = {
  FREE_TRIAL: { students: 100, teachers: 10, staff: 10 },
  BASIC: { students: 500, teachers: 50, staff: 25 },
  PRO: { students: 2500, teachers: 200, staff: 100 },
  ENTERPRISE: { students: 100000, teachers: 10000, staff: 10000 },
};

const cleanCode = (code: string) => code.trim().toUpperCase().replace(/[^A-Z0-9-]+/g, '-').replace(/^-|-$/g, '');

export const listInstitutions = async (context: PlatformContext) => {
  assertSuperAdmin(context);
  return prisma.institution.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { users: true, students: true, professorProfiles: true, staffMembers: true } },
    },
  });
};

export const getPlatformDashboard = async (context: PlatformContext) => {
  assertSuperAdmin(context);
  const [totalInstitutions, activeInstitutions, totalUsers, totalStudents, planRows, statusRows] = await Promise.all([
    prisma.institution.count(),
    prisma.institution.count({ where: { isActive: true } }),
    prisma.user.count({ where: { isActive: true } }),
    prisma.student.count({ where: { isActive: true } }),
    prisma.institution.groupBy({ by: ['subscriptionPlan'], _count: { _all: true } }),
    prisma.institution.groupBy({ by: ['subscriptionStatus'], _count: { _all: true } }),
  ]);

  return {
    totalInstitutions,
    activeInstitutions,
    inactiveInstitutions: totalInstitutions - activeInstitutions,
    totalUsers,
    totalStudents,
    planOverview: planRows.map((row) => ({ plan: row.subscriptionPlan, count: row._count._all })),
    subscriptionStatusOverview: statusRows.map((row) => ({ status: row.subscriptionStatus, count: row._count._all })),
  };
};

const institutionData = (data: any): Prisma.InstitutionUncheckedCreateInput => {
  const plan = (data.subscriptionPlan ?? SubscriptionPlan.FREE_TRIAL) as SubscriptionPlan;
  const limits = planLimits[plan];
  return {
    name: String(data.name).trim(),
    code: cleanCode(String(data.code || data.name)),
    logoUrl: data.logoUrl || null,
    email: data.email || null,
    phone: data.phone || null,
    address: data.address || null,
    contactPerson: data.contactPerson || null,
    academicYear: data.academicYear || '2026-27',
    subscriptionPlan: plan,
    subscriptionStatus: (data.subscriptionStatus ?? SubscriptionStatus.TRIALING) as SubscriptionStatus,
    trialEndsAt: data.trialEndsAt ? new Date(data.trialEndsAt) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    studentLimit: Number(data.studentLimit ?? limits.students),
    teacherLimit: Number(data.teacherLimit ?? limits.teachers),
    staffLimit: Number(data.staffLimit ?? limits.staff),
    featureFlags: data.featureFlags ?? {},
    isActive: data.isActive ?? true,
  };
};

export const createInstitution = async (context: PlatformContext, data: any) => {
  assertSuperAdmin(context);
  const created = await prisma.institution.create({ data: institutionData(data) });
  await writeAuditLog({ actorId: context.userId, institutionId: created.id, action: 'INSTITUTION_CREATED', entityType: 'Institution', entityId: created.id, metadata: { code: created.code } }).catch(() => undefined);
  return created;
};

export const updateInstitution = async (context: PlatformContext, id: string, data: any) => {
  assertSuperAdmin(context);
  const current = await prisma.institution.findUnique({ where: { id } });
  if (!current) throw new AppError('Institution not found', StatusCodes.NOT_FOUND);
  const patch: Prisma.InstitutionUncheckedUpdateInput = {
    name: data.name !== undefined ? String(data.name).trim() : undefined,
    code: data.code !== undefined ? cleanCode(String(data.code)) : undefined,
    logoUrl: data.logoUrl !== undefined ? data.logoUrl || null : undefined,
    email: data.email !== undefined ? data.email || null : undefined,
    phone: data.phone !== undefined ? data.phone || null : undefined,
    address: data.address !== undefined ? data.address || null : undefined,
    contactPerson: data.contactPerson !== undefined ? data.contactPerson || null : undefined,
    academicYear: data.academicYear !== undefined ? data.academicYear || null : undefined,
    subscriptionPlan: data.subscriptionPlan,
    subscriptionStatus: data.subscriptionStatus,
    trialEndsAt: data.trialEndsAt !== undefined ? (data.trialEndsAt ? new Date(data.trialEndsAt) : null) : undefined,
    studentLimit: data.studentLimit !== undefined ? Number(data.studentLimit) : undefined,
    teacherLimit: data.teacherLimit !== undefined ? Number(data.teacherLimit) : undefined,
    staffLimit: data.staffLimit !== undefined ? Number(data.staffLimit) : undefined,
    featureFlags: data.featureFlags !== undefined ? data.featureFlags : undefined,
    isActive: data.isActive,
  };
  const updated = await prisma.institution.update({ where: { id }, data: patch });
  const lifecycleAction = data.isActive === false
    ? 'INSTITUTION_SUSPENDED'
    : data.isActive === true && current.isActive === false
      ? 'INSTITUTION_ACTIVATED'
      : 'INSTITUTION_UPDATED';
  await writeAuditLog({ actorId: context.userId, institutionId: id, action: lifecycleAction, entityType: 'Institution', entityId: id, metadata: data }).catch(() => undefined);
  return updated;
};

export const createInstitutionAdmin = async (context: PlatformContext, institutionId: string, data: any) => {
  assertSuperAdmin(context);
  const institution = await prisma.institution.findUnique({ where: { id: institutionId } });
  if (!institution) throw new AppError('Institution not found', StatusCodes.NOT_FOUND);
  const passwordHash = await bcrypt.hash(data.password, 12);
  const admin = await prisma.user.create({
    data: { institutionId, name: data.name, email: data.email, passwordHash, role: Role.ADMIN, isActive: true },
    select: { id: true, institutionId: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  });
  await writeAuditLog({ actorId: context.userId, institutionId, action: 'INSTITUTION_ADMIN_CREATED', entityType: 'User', entityId: admin.id, metadata: { email: admin.email } }).catch(() => undefined);
  return admin;
};

export const getInstitutionUsage = async (institutionId: string) => {
  const institution = await prisma.institution.findUnique({ where: { id: institutionId } });
  if (!institution) throw new AppError('Institution not found', StatusCodes.NOT_FOUND);
  const [students, teachers, staff] = await Promise.all([
    prisma.student.count({ where: { institutionId, isActive: true } }),
    prisma.user.count({ where: { institutionId, role: { in: [Role.TEACHER, Role.PROFESSOR] }, isActive: true } }),
    prisma.staffProfile.count({ where: { institutionId, isActive: true } }),
  ]);
  return {
    institution,
    usage: { students, teachers, staff },
    limits: { students: institution.studentLimit, teachers: institution.teacherLimit, staff: institution.staffLimit },
  };
};

export const assertWithinPlanLimit = async (institutionId: string, resource: 'students' | 'teachers' | 'staff') => {
  const { usage, limits, institution } = await getInstitutionUsage(institutionId);
  if (!institution.isActive || ['CANCELLED', 'EXPIRED', 'PAST_DUE'].includes(institution.subscriptionStatus)) {
    throw new AppError('Institution subscription is not active. Please update billing to continue.', StatusCodes.PAYMENT_REQUIRED);
  }
  if (usage[resource] >= limits[resource]) {
    throw new AppError(`${resource} plan limit reached for this institution`, StatusCodes.PAYMENT_REQUIRED);
  }
};

import { Role } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';
import { getBillingPlans } from '../config/billingPlans.js';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';

interface BillingContext {
  role?: Role;
  institutionId?: string | null;
}

export const listPlans = async () => getBillingPlans();

export const getCurrentBilling = async (context: BillingContext) => {
  const institutionId = context.institutionId;
  if (!institutionId) {
    throw new AppError('Institution context is required', StatusCodes.BAD_REQUEST);
  }

  const institution = await prisma.institution.findUnique({
    where: { id: institutionId },
    select: {
      id: true,
      name: true,
      code: true,
      subscriptionPlan: true,
      subscriptionStatus: true,
      trialEndsAt: true,
      studentLimit: true,
      teacherLimit: true,
      staffLimit: true,
      isActive: true,
    },
  });

  if (!institution) {
    throw new AppError('Institution not found', StatusCodes.NOT_FOUND);
  }

  const [students, teachers, staff] = await Promise.all([
    prisma.student.count({ where: { institutionId, isActive: true } }),
    prisma.user.count({ where: { institutionId, role: { in: [Role.TEACHER, Role.PROFESSOR] }, isActive: true } }),
    prisma.staffProfile.count({ where: { institutionId, isActive: true } }),
  ]);

  return {
    institution,
    usage: { students, teachers, staff },
    limits: {
      students: institution.studentLimit,
      teachers: institution.teacherLimit,
      staff: institution.staffLimit,
    },
  };
};

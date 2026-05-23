import { Role, SubscriptionPlan } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';
import Razorpay from 'razorpay';
import { billingPlans, getBillingPlans, getBillingPlan } from '../config/billingPlans.js';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { writeAuditLog } from './audit.service.js';

interface BillingContext {
  userId?: string;
  role?: Role;
  institutionId?: string | null;
}

interface CheckoutInput {
  plan: SubscriptionPlan;
  interval: 'monthly' | 'annual';
}

const getRazorpayClient = () => {
  if (!env.razorpay.keyId || !env.razorpay.keySecret) {
    throw new AppError('Razorpay is not configured yet', StatusCodes.SERVICE_UNAVAILABLE);
  }

  return new Razorpay({
    key_id: env.razorpay.keyId,
    key_secret: env.razorpay.keySecret,
  });
};

const getRazorpayPlanId = (plan: SubscriptionPlan, interval: CheckoutInput['interval']) => {
  const config = getBillingPlan(plan);
  return interval === 'annual' ? config.razorpayAnnualPlanId : config.razorpayMonthlyPlanId;
};

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

export const createCheckout = async (context: BillingContext, input: CheckoutInput) => {
  const institutionId = context.institutionId;
  if (!institutionId) throw new AppError('Institution context is required', StatusCodes.BAD_REQUEST);
  if (![Role.ADMIN, Role.SUPER_ADMIN].includes(context.role as Role)) throw new AppError('Admin access required', StatusCodes.FORBIDDEN);
  if (input.plan === SubscriptionPlan.FREE_TRIAL) throw new AppError('Free trial does not require checkout', StatusCodes.BAD_REQUEST);

  const planConfig = billingPlans[input.plan];
  if (!planConfig) throw new AppError('Invalid billing plan', StatusCodes.BAD_REQUEST);

  const razorpayPlanId = getRazorpayPlanId(input.plan, input.interval);
  if (!razorpayPlanId) throw new AppError('Selected Razorpay plan is not configured', StatusCodes.SERVICE_UNAVAILABLE);

  const institution = await prisma.institution.findUnique({ where: { id: institutionId } });
  if (!institution) throw new AppError('Institution not found', StatusCodes.NOT_FOUND);

  const razorpay = getRazorpayClient();
  const subscription = await razorpay.subscriptions.create({
    plan_id: razorpayPlanId,
    total_count: input.interval === 'annual' ? 10 : 120,
    quantity: 1,
    customer_notify: 1,
    notes: {
      institutionId,
      institutionCode: institution.code,
      requestedPlan: input.plan,
      interval: input.interval,
    },
  });

  await writeAuditLog({
    actorId: context.userId,
    institutionId,
    action: 'BILLING_CHECKOUT_CREATED',
    entityType: 'BillingSubscription',
    entityId: subscription.id,
    metadata: { plan: input.plan, interval: input.interval, razorpayPlanId },
  }).catch(() => undefined);

  return {
    provider: 'razorpay',
    keyId: env.razorpay.keyId,
    subscriptionId: subscription.id,
    shortUrl: subscription.short_url,
    plan: input.plan,
    interval: input.interval,
  };
};

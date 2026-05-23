import { Prisma, Role, SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import crypto from 'node:crypto';
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

const verifyWebhookSignature = (rawBody: string, signature?: string) => {
  if (!env.razorpay.webhookSecret) {
    throw new AppError('Razorpay webhook secret is not configured', StatusCodes.SERVICE_UNAVAILABLE);
  }
  if (!signature) {
    throw new AppError('Missing Razorpay signature', StatusCodes.UNAUTHORIZED);
  }

  const expected = crypto.createHmac('sha256', env.razorpay.webhookSecret).update(rawBody).digest('hex');
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== signatureBuffer.length || !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)) {
    throw new AppError('Invalid Razorpay signature', StatusCodes.UNAUTHORIZED);
  }
};

const extractSubscription = (payload: any) => payload?.payload?.subscription?.entity ?? null;
const extractPayment = (payload: any) => payload?.payload?.payment?.entity ?? null;
const extractInvoice = (payload: any) => payload?.payload?.invoice?.entity ?? null;

const extractInstitutionId = (payload: any) => (
  extractSubscription(payload)?.notes?.institutionId
  ?? extractPayment(payload)?.notes?.institutionId
  ?? extractInvoice(payload)?.notes?.institutionId
  ?? null
);

const planFromNotes = (payload: any): SubscriptionPlan | null => {
  const raw = extractSubscription(payload)?.notes?.requestedPlan
    ?? extractPayment(payload)?.notes?.requestedPlan
    ?? extractInvoice(payload)?.notes?.requestedPlan;
  return raw && Object.values(SubscriptionPlan).includes(raw) ? raw : null;
};

const dateFromUnix = (value: unknown) => (typeof value === 'number' ? new Date(value * 1000) : undefined);

const assertBillingAdmin = (context: BillingContext) => {
  if (![Role.ADMIN, Role.SUPER_ADMIN].includes(context.role as Role)) {
    throw new AppError('Admin access required', StatusCodes.FORBIDDEN);
  }
};

const syncInstitutionSubscription = async (payload: any, eventType: string, institutionId: string | null) => {
  if (!institutionId) return false;
  const subscription = extractSubscription(payload);
  const payment = extractPayment(payload);
  const plan = planFromNotes(payload);
  const subscriptionId = subscription?.id ?? payment?.subscription_id;

  const update: Prisma.InstitutionUpdateInput = {};

  if (subscriptionId) update.razorpaySubscriptionId = String(subscriptionId);
  if (plan) {
    const config = getBillingPlan(plan);
    update.subscriptionPlan = plan;
    update.studentLimit = config.studentLimit;
    update.teacherLimit = config.teacherLimit;
    update.staffLimit = config.staffLimit;
  }

  if (subscription?.current_start) update.currentPeriodStart = dateFromUnix(subscription.current_start);
  if (subscription?.current_end) update.currentPeriodEnd = dateFromUnix(subscription.current_end);

  if (eventType === 'subscription.activated' || eventType === 'subscription.charged') {
    update.subscriptionStatus = SubscriptionStatus.ACTIVE;
    update.isActive = true;
    update.cancelAtPeriodEnd = false;
  } else if (eventType === 'payment.failed') {
    update.subscriptionStatus = SubscriptionStatus.PAST_DUE;
  } else if (eventType === 'subscription.cancelled') {
    update.subscriptionStatus = SubscriptionStatus.CANCELLED;
    update.cancelAtPeriodEnd = true;
  } else if (eventType === 'subscription.completed') {
    update.subscriptionStatus = SubscriptionStatus.EXPIRED;
    update.isActive = false;
  } else {
    return false;
  }

  await prisma.institution.update({ where: { id: institutionId }, data: update });
  await writeAuditLog({
    institutionId,
    action: 'BILLING_SUBSCRIPTION_SYNCED',
    entityType: 'Institution',
    entityId: institutionId,
    metadata: { eventType, subscriptionId, plan },
  }).catch(() => undefined);
  return true;
};

const syncBillingInvoice = async (payload: any, eventType: string, institutionId: string | null) => {
  const invoice = extractInvoice(payload);
  const payment = extractPayment(payload);
  if (!institutionId || (!invoice && !payment)) return false;

  const providerInvoiceId = invoice?.id ? String(invoice.id) : payment?.invoice_id ? String(payment.invoice_id) : undefined;
  if (!providerInvoiceId) return false;

  const amount = Number(invoice?.amount ?? invoice?.amount_paid ?? payment?.amount ?? 0);
  const status = String(invoice?.status ?? (eventType === 'payment.failed' ? 'failed' : payment?.status ?? eventType));

  await prisma.billingInvoice.upsert({
    where: { providerInvoiceId },
    create: {
      institutionId,
      provider: 'razorpay',
      providerInvoiceId,
      providerPaymentId: payment?.id ? String(payment.id) : undefined,
      amount,
      currency: String(invoice?.currency ?? payment?.currency ?? 'INR').toUpperCase(),
      status,
      hostedUrl: invoice?.short_url ?? invoice?.hosted_url ?? null,
      pdfUrl: invoice?.pdf_url ?? null,
      paidAt: dateFromUnix(invoice?.paid_at ?? payment?.created_at),
      dueAt: dateFromUnix(invoice?.expire_by ?? invoice?.due_by),
      metadata: { eventType, invoice, payment } as Prisma.InputJsonValue,
    },
    update: {
      providerPaymentId: payment?.id ? String(payment.id) : undefined,
      amount,
      currency: String(invoice?.currency ?? payment?.currency ?? 'INR').toUpperCase(),
      status,
      hostedUrl: invoice?.short_url ?? invoice?.hosted_url ?? null,
      pdfUrl: invoice?.pdf_url ?? null,
      paidAt: dateFromUnix(invoice?.paid_at ?? payment?.created_at),
      dueAt: dateFromUnix(invoice?.expire_by ?? invoice?.due_by),
      metadata: { eventType, invoice, payment } as Prisma.InputJsonValue,
    },
  });

  await writeAuditLog({
    institutionId,
    action: 'BILLING_INVOICE_SYNCED',
    entityType: 'BillingInvoice',
    entityId: providerInvoiceId,
    metadata: { eventType, status, amount },
  }).catch(() => undefined);

  return true;
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
      razorpaySubscriptionId: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
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

export const listInvoices = async (context: BillingContext) => {
  const institutionId = context.institutionId;
  if (!institutionId) throw new AppError('Institution context is required', StatusCodes.BAD_REQUEST);

  return prisma.billingInvoice.findMany({
    where: { institutionId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
};

export const createCheckout = async (context: BillingContext, input: CheckoutInput) => {
  const institutionId = context.institutionId;
  if (!institutionId) throw new AppError('Institution context is required', StatusCodes.BAD_REQUEST);
  assertBillingAdmin(context);
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

export const cancelSubscription = async (context: BillingContext) => {
  const institutionId = context.institutionId;
  if (!institutionId) throw new AppError('Institution context is required', StatusCodes.BAD_REQUEST);
  assertBillingAdmin(context);

  const institution = await prisma.institution.findUnique({ where: { id: institutionId } });
  if (!institution?.razorpaySubscriptionId) throw new AppError('No active Razorpay subscription found', StatusCodes.BAD_REQUEST);

  const razorpay = getRazorpayClient();
  await razorpay.subscriptions.cancel(institution.razorpaySubscriptionId, false);

  const updated = await prisma.institution.update({
    where: { id: institutionId },
    data: { cancelAtPeriodEnd: true, subscriptionStatus: SubscriptionStatus.CANCELLED },
  });

  await writeAuditLog({
    actorId: context.userId,
    institutionId,
    action: 'BILLING_SUBSCRIPTION_CANCEL_REQUESTED',
    entityType: 'Institution',
    entityId: institutionId,
    metadata: { razorpaySubscriptionId: institution.razorpaySubscriptionId },
  }).catch(() => undefined);

  return updated;
};

export const resumeSubscription = async (context: BillingContext) => {
  const institutionId = context.institutionId;
  if (!institutionId) throw new AppError('Institution context is required', StatusCodes.BAD_REQUEST);
  assertBillingAdmin(context);

  const institution = await prisma.institution.findUnique({ where: { id: institutionId } });
  if (!institution) throw new AppError('Institution not found', StatusCodes.NOT_FOUND);
  if (!institution.razorpaySubscriptionId) throw new AppError('No Razorpay subscription found', StatusCodes.BAD_REQUEST);

  const updated = await prisma.institution.update({
    where: { id: institutionId },
    data: { cancelAtPeriodEnd: false, subscriptionStatus: SubscriptionStatus.ACTIVE, isActive: true },
  });

  await writeAuditLog({
    actorId: context.userId,
    institutionId,
    action: 'BILLING_SUBSCRIPTION_RESUMED',
    entityType: 'Institution',
    entityId: institutionId,
    metadata: { razorpaySubscriptionId: institution.razorpaySubscriptionId },
  }).catch(() => undefined);

  return updated;
};

export const handleWebhook = async (rawBody: string, signature?: string) => {
  verifyWebhookSignature(rawBody, signature);

  const payload = JSON.parse(rawBody);
  const eventType = String(payload.event ?? 'unknown');
  const providerEventId = payload.id ? String(payload.id) : undefined;
  const institutionId = extractInstitutionId(payload);

  if (providerEventId) {
    const existing = await prisma.billingEvent.findUnique({ where: { providerEventId } });
    if (existing) {
      return { received: true, duplicate: true, eventType };
    }
  }

  const synced = await syncInstitutionSubscription(payload, eventType, institutionId);
  const invoiceSynced = await syncBillingInvoice(payload, eventType, institutionId);

  await prisma.billingEvent.create({
    data: {
      institutionId,
      provider: 'razorpay',
      eventType,
      providerEventId,
      payload: payload as Prisma.InputJsonValue,
      processedAt: new Date(),
    },
  });

  await writeAuditLog({
    institutionId,
    action: 'BILLING_WEBHOOK_RECEIVED',
    entityType: 'BillingEvent',
    entityId: providerEventId,
    metadata: { eventType, synced, invoiceSynced },
  }).catch(() => undefined);

  return { received: true, duplicate: false, eventType, synced, invoiceSynced };
};

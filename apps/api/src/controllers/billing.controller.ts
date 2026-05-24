import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import * as billingService from '../services/billing.service.js';

const billingContext = (request: Request) => ({
  userId: request.auth?.userId,
  role: request.auth?.role,
  institutionId: request.auth?.institutionId,
});

export const listPlans = async (_request: Request, response: Response) => {
  const data = await billingService.listPlans();
  response.status(StatusCodes.OK).json({ success: true, data });
};

export const currentBilling = async (request: Request, response: Response) => {
  const data = await billingService.getCurrentBilling(billingContext(request));
  response.status(StatusCodes.OK).json({ success: true, data });
};

export const invoices = async (request: Request, response: Response) => {
  const data = await billingService.listInvoices(billingContext(request));
  response.status(StatusCodes.OK).json({ success: true, data });
};

export const checkout = async (request: Request, response: Response) => {
  const data = await billingService.createCheckout(billingContext(request), {
    plan: request.body.plan,
    interval: request.body.interval ?? 'monthly',
  });

  response.status(StatusCodes.CREATED).json({ success: true, data });
};

export const cronEnforceDunning = async (request: Request, response: Response) => {
  const secret = request.get('x-cron-secret');

  if (!env.billingCronSecret || secret !== env.billingCronSecret) {
    throw new AppError('Invalid billing cron secret', StatusCodes.UNAUTHORIZED);
  }

  const data = await billingService.enforceBillingDunning({
    userId: 'system:billing-cron',
    role: 'SUPER_ADMIN' as any,
    institutionId: null,
  });

  response.status(StatusCodes.OK).json({ success: true, data });
};

export const cancelSubscription = async (request: Request, response: Response) => {
  const data = await billingService.cancelSubscription(billingContext(request));
  response.status(StatusCodes.OK).json({ success: true, data });
};

export const resumeSubscription = async (request: Request, response: Response) => {
  const data = await billingService.resumeSubscription(billingContext(request));
  response.status(StatusCodes.OK).json({ success: true, data });
};

export const failedWebhooks = async (request: Request, response: Response) => {
  const data = await billingService.listFailedWebhooks(billingContext(request));
  response.status(StatusCodes.OK).json({ success: true, data });
};

export const retryWebhook = async (request: Request, response: Response) => {
  const data = await billingService.retryFailedWebhook(billingContext(request), request.params.billingEventId);
  response.status(StatusCodes.OK).json({ success: true, data });
};

export const enforceDunning = async (request: Request, response: Response) => {
  const data = await billingService.enforceBillingDunning(billingContext(request));
  response.status(StatusCodes.OK).json({ success: true, data });
};

export const webhook = async (request: Request, response: Response) => {
  if (!Buffer.isBuffer(request.body)) {
    throw new Error('Webhook route requires raw body middleware');
  }

  const rawBody = request.body.toString('utf8');
  const signature = request.get('x-razorpay-signature') ?? undefined;
  const data = await billingService.handleWebhook(rawBody, signature);
  response.status(StatusCodes.OK).json({ success: true, data });
};

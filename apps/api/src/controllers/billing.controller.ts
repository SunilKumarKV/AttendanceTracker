import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as billingService from '../services/billing.service.js';

export const listPlans = async (_request: Request, response: Response) => {
  const data = await billingService.listPlans();
  response.status(StatusCodes.OK).json({ success: true, data });
};

export const currentBilling = async (request: Request, response: Response) => {
  const data = await billingService.getCurrentBilling({
    role: request.auth?.role,
    institutionId: request.auth?.institutionId,
  });

  response.status(StatusCodes.OK).json({ success: true, data });
};

export const checkout = async (request: Request, response: Response) => {
  const data = await billingService.createCheckout({
    userId: request.auth?.userId,
    role: request.auth?.role,
    institutionId: request.auth?.institutionId,
  }, {
    plan: request.body.plan,
    interval: request.body.interval ?? 'monthly',
  });

  response.status(StatusCodes.CREATED).json({ success: true, data });
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

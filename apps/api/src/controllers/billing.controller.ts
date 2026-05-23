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

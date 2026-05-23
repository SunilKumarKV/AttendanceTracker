import { Router, type Router as ExpressRouter } from 'express';
import * as billingController from '../controllers/billing.controller.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const billingRouter: ExpressRouter = Router();

billingRouter.get('/billing/plans', asyncHandler(billingController.listPlans));
billingRouter.get('/billing/current', authenticate, asyncHandler(billingController.currentBilling));

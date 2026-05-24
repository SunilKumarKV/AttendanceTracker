import express, { Router, type Router as ExpressRouter } from 'express';
import * as billingController from '../controllers/billing.controller.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const billingRouter: ExpressRouter = Router();

billingRouter.get('/billing/plans', asyncHandler(billingController.listPlans));
billingRouter.get('/billing/current', authenticate, asyncHandler(billingController.currentBilling));
billingRouter.get('/billing/invoices', authenticate, asyncHandler(billingController.invoices));
billingRouter.get('/billing/webhooks/failed', authenticate, asyncHandler(billingController.failedWebhooks));
billingRouter.post('/billing/checkout', authenticate, asyncHandler(billingController.checkout));
billingRouter.post('/billing/cancel', authenticate, asyncHandler(billingController.cancelSubscription));
billingRouter.post('/billing/resume', authenticate, asyncHandler(billingController.resumeSubscription));
billingRouter.post('/billing/dunning/enforce', authenticate, asyncHandler(billingController.enforceDunning));
billingRouter.post('/billing/webhooks/retry/:billingEventId', authenticate, asyncHandler(billingController.retryWebhook));
billingRouter.post('/billing/cron/enforce', asyncHandler(billingController.cronEnforceDunning));
billingRouter.post('/billing/webhook', express.raw({ type: 'application/json' }), asyncHandler(billingController.webhook));

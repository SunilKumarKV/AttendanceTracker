import { Router, type Router as ExpressRouter } from 'express';
import * as settingsController from '../controllers/settings.controller.js';
import { adminOnly } from '../middleware/adminOnly.js';
import { writeRateLimiter } from '../middleware/rateLimit.js';
import { validateBody } from '../middleware/validateRequest.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { appSettingsSchema } from '../validators/settings.validator.js';

export const settingsRouter: ExpressRouter = Router();

settingsRouter.use('/settings', adminOnly);
settingsRouter.use('/settings', writeRateLimiter);

settingsRouter.get('/settings', asyncHandler(settingsController.getSettings));
settingsRouter.patch('/settings', validateBody(appSettingsSchema), asyncHandler(settingsController.updateSettings));

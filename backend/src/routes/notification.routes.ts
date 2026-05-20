import { Router } from 'express';
import * as notificationController from '../controllers/notification.controller.js';
import { adminOnly } from '../middleware/adminOnly.js';
import { validateBody } from '../middleware/validateRequest.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { notificationSettingsSchema, testNotificationSchema } from '../validators/notification.validator.js';

export const notificationRouter = Router();

notificationRouter.use(['/notifications', '/settings/notifications'], adminOnly);

notificationRouter.get('/notifications', asyncHandler(notificationController.list));
notificationRouter.post('/notifications/test', validateBody(testNotificationSchema), asyncHandler(notificationController.test));
notificationRouter.get('/settings/notifications', asyncHandler(notificationController.settings));
notificationRouter.patch('/settings/notifications', validateBody(notificationSettingsSchema), asyncHandler(notificationController.updateSettings));

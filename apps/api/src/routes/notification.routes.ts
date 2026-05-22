import { Router, type Router as ExpressRouter } from 'express';
import * as notificationController from '../controllers/notification.controller.js';
import { adminOnly } from '../middleware/adminOnly.js';
import { writeRateLimiter } from '../middleware/rateLimit.js';
import { validateBody } from '../middleware/validateRequest.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { notificationSettingsSchema, sendStudentAlertSchema, templateSchema, templateUpdateSchema, testNotificationSchema } from '../validators/notification.validator.js';

export const notificationRouter: ExpressRouter = Router();

notificationRouter.use(['/notifications', '/settings/notifications', '/communications'], adminOnly);
notificationRouter.use(['/notifications', '/settings/notifications', '/communications'], writeRateLimiter);


notificationRouter.get('/communications/low-attendance', asyncHandler(notificationController.lowAttendanceStudents));
notificationRouter.post('/communications/send-alert', validateBody(sendStudentAlertSchema), asyncHandler(notificationController.sendStudentAlert));
notificationRouter.get('/communications/templates', asyncHandler(notificationController.listTemplates));
notificationRouter.post('/communications/templates', validateBody(templateSchema), asyncHandler(notificationController.createTemplate));
notificationRouter.patch('/communications/templates/:id', validateBody(templateUpdateSchema), asyncHandler(notificationController.updateTemplate));

notificationRouter.get('/notifications', asyncHandler(notificationController.list));
notificationRouter.post('/notifications/test', validateBody(testNotificationSchema), asyncHandler(notificationController.test));
notificationRouter.post('/notifications/run-low-attendance-sweep', asyncHandler(notificationController.runLowAttendanceSweep));
notificationRouter.get('/settings/notifications', asyncHandler(notificationController.settings));
notificationRouter.patch('/settings/notifications', validateBody(notificationSettingsSchema), asyncHandler(notificationController.updateSettings));

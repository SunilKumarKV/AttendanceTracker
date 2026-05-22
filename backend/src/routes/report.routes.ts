import { Router, type Router as ExpressRouter } from 'express';
import * as reportController from '../controllers/report.controller.js';
import { adminOnly } from '../middleware/adminOnly.js';
import { reportExportRateLimiter } from '../middleware/rateLimit.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const reportRouter: ExpressRouter = Router();

reportRouter.use('/reports', adminOnly);

reportRouter.get('/reports/overview', asyncHandler(reportController.overview));
reportRouter.get('/reports/low-attendance', asyncHandler(reportController.lowAttendance));
reportRouter.get('/reports/monthly', asyncHandler(reportController.monthly));
reportRouter.get('/reports/export/csv', reportExportRateLimiter, asyncHandler(reportController.csv));
reportRouter.get('/reports/export/pdf', reportExportRateLimiter, asyncHandler(reportController.pdf));
reportRouter.get('/reports/student/:studentId', asyncHandler(reportController.student));
reportRouter.get('/reports/class/:classId', asyncHandler(reportController.classReport));
reportRouter.get('/reports/subject/:subjectId', asyncHandler(reportController.subject));
reportRouter.get('/reports/date/:date', asyncHandler(reportController.dateReport));

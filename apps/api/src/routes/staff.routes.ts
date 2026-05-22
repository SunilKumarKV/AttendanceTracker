import { Router, type Router as ExpressRouter } from 'express';
import { Role } from '@prisma/client';
import * as staffController from '../controllers/staff.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { writeRateLimiter } from '../middleware/rateLimit.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const staffRouter: ExpressRouter = Router();

staffRouter.use(authenticate);

staffRouter.get('/admin/staff/summary', requireRole(Role.ADMIN, Role.SUPER_ADMIN, Role.HOD), asyncHandler(staffController.adminSummary));
staffRouter.get('/admin/staff', requireRole(Role.ADMIN, Role.SUPER_ADMIN, Role.HOD), asyncHandler(staffController.listStaff));
staffRouter.post('/admin/staff', requireRole(Role.ADMIN, Role.SUPER_ADMIN, Role.HOD), writeRateLimiter, asyncHandler(staffController.createStaff));
staffRouter.patch('/admin/staff/:id', requireRole(Role.ADMIN, Role.SUPER_ADMIN, Role.HOD), writeRateLimiter, asyncHandler(staffController.updateStaff));
staffRouter.delete('/admin/staff/:id', requireRole(Role.ADMIN, Role.SUPER_ADMIN, Role.HOD), writeRateLimiter, asyncHandler(staffController.deleteStaff));

staffRouter.get('/admin/staff-attendance', requireRole(Role.ADMIN, Role.SUPER_ADMIN, Role.HOD), asyncHandler(staffController.listAttendance));
staffRouter.post('/admin/staff-attendance', requireRole(Role.ADMIN, Role.SUPER_ADMIN, Role.HOD), writeRateLimiter, asyncHandler(staffController.markAttendance));
staffRouter.get('/admin/staff-reports/export', requireRole(Role.ADMIN, Role.SUPER_ADMIN, Role.HOD), asyncHandler(staffController.exportReport));
staffRouter.get('/admin/staff-leaves', requireRole(Role.ADMIN, Role.SUPER_ADMIN, Role.HOD), asyncHandler(staffController.listLeaves));
staffRouter.post('/admin/staff-leaves/:id/approve', requireRole(Role.ADMIN, Role.SUPER_ADMIN, Role.HOD), writeRateLimiter, asyncHandler(staffController.approveLeave));
staffRouter.post('/admin/staff-leaves/:id/reject', requireRole(Role.ADMIN, Role.SUPER_ADMIN, Role.HOD), writeRateLimiter, asyncHandler(staffController.rejectLeave));

staffRouter.get('/staff/dashboard', requireRole(Role.STAFF), asyncHandler(staffController.dashboard));
staffRouter.get('/staff/attendance', requireRole(Role.STAFF), asyncHandler(staffController.listAttendance));
staffRouter.get('/staff/leaves', requireRole(Role.STAFF), asyncHandler(staffController.listLeaves));
staffRouter.post('/staff/leaves', requireRole(Role.STAFF), writeRateLimiter, asyncHandler(staffController.createLeave));
staffRouter.get('/staff/reports/export', requireRole(Role.STAFF), asyncHandler(staffController.exportReport));

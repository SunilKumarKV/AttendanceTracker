import { Router, type Router as ExpressRouter } from 'express';
import { Role } from '@prisma/client';
import * as portalController from '../controllers/portal.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { adminOnly } from '../middleware/adminOnly.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const portalRouter: ExpressRouter = Router();

portalRouter.use(authenticate);

portalRouter.get('/student-portal/dashboard', requireRole(Role.STUDENT), asyncHandler(portalController.studentDashboard));
portalRouter.get('/student-portal/profile', requireRole(Role.STUDENT), asyncHandler(portalController.studentProfile));
portalRouter.get('/student-portal/report', requireRole(Role.STUDENT), asyncHandler(portalController.studentReport));
portalRouter.get('/student-portal/notifications', requireRole(Role.STUDENT), asyncHandler(portalController.studentNotifications));

portalRouter.get('/parent-portal/children', requireRole(Role.PARENT), asyncHandler(portalController.parentChildren));
portalRouter.get('/parent-portal/children/:studentId/dashboard', requireRole(Role.PARENT), asyncHandler(portalController.parentChildDashboard));
portalRouter.get('/parent-portal/children/:studentId/report', requireRole(Role.PARENT), asyncHandler(portalController.parentChildReport));
portalRouter.get('/parent-portal/notifications', requireRole(Role.PARENT), asyncHandler(portalController.parentNotifications));

portalRouter.post('/admin/portal/student-access', adminOnly, asyncHandler(portalController.createStudentPortalAccess));
portalRouter.post('/admin/portal/parent-access', adminOnly, asyncHandler(portalController.createParentPortalAccess));

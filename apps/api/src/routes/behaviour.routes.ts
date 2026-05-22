import { Role } from '@prisma/client';
import { Router, type Router as ExpressRouter } from 'express';
import * as controller from '../controllers/behaviour.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { writeRateLimiter } from '../middleware/rateLimit.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const behaviourRouter: ExpressRouter = Router();
behaviourRouter.use(authenticate);
const allPortalRoles = [Role.ADMIN, Role.SUPER_ADMIN, Role.HOD, Role.TEACHER, Role.PROFESSOR, Role.STUDENT, Role.PARENT];
const staffRoles = [Role.ADMIN, Role.SUPER_ADMIN, Role.HOD, Role.TEACHER, Role.PROFESSOR];
const adminRoles = [Role.ADMIN, Role.SUPER_ADMIN, Role.HOD];

behaviourRouter.get('/behaviour/student-options', requireRole(...staffRoles), asyncHandler(controller.studentOptions));
behaviourRouter.get('/behaviour/dashboard', requireRole(...allPortalRoles), asyncHandler(controller.dashboard));
behaviourRouter.get('/behaviour/records', requireRole(...allPortalRoles), asyncHandler(controller.list));
behaviourRouter.post('/behaviour/records', requireRole(...staffRoles), writeRateLimiter, asyncHandler(controller.create));
behaviourRouter.patch('/behaviour/records/:id', requireRole(...staffRoles), writeRateLimiter, asyncHandler(controller.update));
behaviourRouter.patch('/behaviour/records/:id/approval', requireRole(...adminRoles), writeRateLimiter, asyncHandler(controller.approve));
behaviourRouter.delete('/behaviour/records/:id', requireRole(...staffRoles), writeRateLimiter, asyncHandler(controller.remove));
behaviourRouter.get('/behaviour/report', requireRole(...allPortalRoles), asyncHandler(controller.report));
behaviourRouter.get('/behaviour/export', requireRole(...allPortalRoles), asyncHandler(controller.exportReport));

import { Router, type Router as ExpressRouter } from 'express';
import * as platformController from '../controllers/platform.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validateRequest.js';
import { writeRateLimiter } from '../middleware/rateLimit.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { institutionAdminSchema, institutionSchema, institutionUpdateSchema } from '../validators/platform.validator.js';
import { Role } from '@prisma/client';

export const platformRouter: ExpressRouter = Router();

platformRouter.use(authenticate);
platformRouter.use(writeRateLimiter);

platformRouter.get('/platform/dashboard', requireRole(Role.SUPER_ADMIN), asyncHandler(platformController.dashboard));
platformRouter.get('/platform/institutions', requireRole(Role.SUPER_ADMIN), asyncHandler(platformController.listInstitutions));
platformRouter.post('/platform/institutions', requireRole(Role.SUPER_ADMIN), validateBody(institutionSchema), asyncHandler(platformController.createInstitution));
platformRouter.patch('/platform/institutions/:id', requireRole(Role.SUPER_ADMIN), validateBody(institutionUpdateSchema), asyncHandler(platformController.updateInstitution));
platformRouter.post('/platform/institutions/:id/admins', requireRole(Role.SUPER_ADMIN), validateBody(institutionAdminSchema), asyncHandler(platformController.createInstitutionAdmin));
platformRouter.get('/platform/institutions/:id/usage', requireRole(Role.SUPER_ADMIN), asyncHandler(platformController.usage));
platformRouter.get('/institution/usage', requireRole(Role.ADMIN, Role.HOD, Role.SUPER_ADMIN), asyncHandler(platformController.usage));

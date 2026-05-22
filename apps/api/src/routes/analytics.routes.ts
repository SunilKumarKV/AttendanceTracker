import { Router, type Router as ExpressRouter } from 'express';
import { Role } from '@prisma/client';
import * as controller from '../controllers/analytics.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const analyticsRouter: ExpressRouter = Router();
const analyticsRoles = [Role.ADMIN, Role.SUPER_ADMIN, Role.HOD, Role.TEACHER, Role.PROFESSOR];

analyticsRouter.use('/analytics', authenticate, requireRole(...analyticsRoles));
analyticsRouter.get('/analytics/overview', asyncHandler(controller.overview));
analyticsRouter.get('/analytics/charts', asyncHandler(controller.charts));
analyticsRouter.get('/analytics/risks', asyncHandler(controller.risks));
analyticsRouter.get('/analytics/teachers', asyncHandler(controller.teachers));
analyticsRouter.get('/analytics/filters', asyncHandler(controller.filters));
analyticsRouter.get('/analytics/export', asyncHandler(controller.exportAnalytics));

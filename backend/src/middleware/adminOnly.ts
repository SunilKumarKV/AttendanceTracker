import { Role } from '@prisma/client';
import type { RequestHandler } from 'express';
import { authenticate, requireRole } from './auth.js';

export const adminOnly: RequestHandler[] = [
  authenticate,
  requireRole(Role.SUPER_ADMIN, Role.ADMIN, Role.HOD),
];

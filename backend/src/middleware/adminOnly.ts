import { Role } from '@prisma/client';
import { authenticate, requireRole } from './auth.js';

export const adminOnly = [
  authenticate,
  requireRole(Role.SUPER_ADMIN, Role.ADMIN, Role.HOD),
];

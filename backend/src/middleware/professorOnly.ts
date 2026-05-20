import { Role } from '@prisma/client';
import { authenticate, requireRole } from './auth.js';

export const professorOnly = [
  authenticate,
  requireRole(Role.PROFESSOR),
];

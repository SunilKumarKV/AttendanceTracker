import { Role } from '@prisma/client';
import type { RequestHandler } from 'express';
import { authenticate, requireRole } from './auth.js';

export const professorOnly: RequestHandler[] = [
  authenticate,
  requireRole(Role.TEACHER, Role.PROFESSOR),
];

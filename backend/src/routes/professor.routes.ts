import { Router } from 'express';
import * as professorController from '../controllers/professor.controller.js';
import { professorOnly } from '../middleware/professorOnly.js';
import { writeRateLimiter } from '../middleware/rateLimit.js';
import { validateBody } from '../middleware/validateRequest.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createAttendanceSessionSchema, updateAttendanceSessionSchema } from '../validators/attendance.validator.js';

export const professorRouter = Router();

professorRouter.use(['/professor', '/attendance'], professorOnly);
professorRouter.use('/attendance', writeRateLimiter);

professorRouter.get('/professor/dashboard', asyncHandler(professorController.dashboard));
professorRouter.get('/professor/assignments', asyncHandler(professorController.assignments));
professorRouter.get('/professor/classes/:classId/students', asyncHandler(professorController.classStudents));

professorRouter.post('/attendance/sessions', validateBody(createAttendanceSessionSchema), asyncHandler(professorController.createSession));
professorRouter.get('/attendance/sessions', asyncHandler(professorController.listSessions));
professorRouter.get('/attendance/sessions/:id', asyncHandler(professorController.getSession));
professorRouter.patch('/attendance/sessions/:id', validateBody(updateAttendanceSessionSchema), asyncHandler(professorController.updateSession));
professorRouter.post('/attendance/sessions/:id/lock', asyncHandler(professorController.lockSession));

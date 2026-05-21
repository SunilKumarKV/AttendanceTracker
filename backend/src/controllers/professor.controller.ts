import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as professorService from '../services/professor.service.js';

const contextFrom = (request: Request) => ({
  userId: request.auth?.userId,
  institutionId: request.auth?.institutionId,
});

export const dashboard = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await professorService.getProfessorDashboard(contextFrom(request)) });
};

export const assignments = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await professorService.getProfessorAssignments(contextFrom(request)) });
};

export const classStudents = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await professorService.getClassStudents(contextFrom(request), request.params.classId, request.query) });
};

export const createSession = async (request: Request, response: Response) => {
  response.status(StatusCodes.CREATED).json({ success: true, data: await professorService.createAttendanceSession(contextFrom(request), request.body) });
};

export const listSessions = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await professorService.listAttendanceSessions(contextFrom(request), request.query) });
};

export const getSession = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await professorService.getAttendanceSession(contextFrom(request), request.params.id) });
};

export const updateSession = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await professorService.updateAttendanceSession(contextFrom(request), request.params.id, request.body) });
};

export const lockSession = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await professorService.lockAttendanceSession(contextFrom(request), request.params.id) });
};

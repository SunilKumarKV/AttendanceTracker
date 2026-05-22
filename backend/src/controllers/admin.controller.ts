import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as adminCrud from '../services/adminCrud.service.js';
import { listActivityTimeline, listAuditLogs } from '../services/audit.service.js';
import { prisma } from '../config/prisma.js';
import { importStudents } from '../services/studentImport.service.js';
import * as attendanceControl from '../services/attendanceControl.service.js';

const contextFrom = (request: Request) => ({
  userId: request.auth?.userId,
  institutionId: request.auth?.institutionId,
});

export const dashboard = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await adminCrud.getDashboard(contextFrom(request)) });
};

export const listProfessors = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await adminCrud.listProfessors(contextFrom(request), request.query) });
};

export const createProfessor = async (request: Request, response: Response) => {
  response.status(StatusCodes.CREATED).json({ success: true, data: await adminCrud.createProfessor(contextFrom(request), request.body) });
};

export const updateProfessor = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await adminCrud.updateProfessor(contextFrom(request), request.params.id, request.body) });
};

export const deleteProfessor = async (request: Request, response: Response) => {
  await adminCrud.deleteProfessor(contextFrom(request), request.params.id);
  response.status(StatusCodes.NO_CONTENT).send();
};

export const listStudents = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await adminCrud.listStudents(contextFrom(request), request.query) });
};

export const createStudent = async (request: Request, response: Response) => {
  response.status(StatusCodes.CREATED).json({ success: true, data: await adminCrud.createStudent(contextFrom(request), request.body) });
};


export const importStudentsFile = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await importStudents(contextFrom(request), request.file) });
};

export const updateStudent = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await adminCrud.updateStudent(contextFrom(request), request.params.id, request.body) });
};

export const deleteStudent = async (request: Request, response: Response) => {
  await adminCrud.deleteStudent(contextFrom(request), request.params.id);
  response.status(StatusCodes.NO_CONTENT).send();
};

const modelFromRoute = (request: Request) => request.params.model as any;

export const listModel = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await adminCrud.listModel(contextFrom(request), modelFromRoute(request), request.query) });
};

export const createModel = async (request: Request, response: Response) => {
  response.status(StatusCodes.CREATED).json({ success: true, data: await adminCrud.createModel(contextFrom(request), modelFromRoute(request), request.body) });
};

export const updateModel = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await adminCrud.updateModel(contextFrom(request), modelFromRoute(request), request.params.id, request.body) });
};

export const deleteModel = async (request: Request, response: Response) => {
  await adminCrud.deleteModel(contextFrom(request), modelFromRoute(request), request.params.id);
  response.status(StatusCodes.NO_CONTENT).send();
};


export const auditLogs = async (request: Request, response: Response) => {
  const institutionId = request.auth?.institutionId;
  if (!institutionId) {
    response.status(StatusCodes.BAD_REQUEST).json({ success: false, error: { message: 'Admin is not linked to an institution' } });
    return;
  }
  const limit = Number(request.query.limit ?? 50);
  response.status(StatusCodes.OK).json({ success: true, data: await listAuditLogs(institutionId, limit) });
};

export const activityTimeline = async (request: Request, response: Response) => {
  const institutionId = request.auth?.institutionId;
  if (!institutionId) {
    response.status(StatusCodes.BAD_REQUEST).json({ success: false, error: { message: 'Admin is not linked to an institution' } });
    return;
  }
  const limit = Number(request.query.limit ?? 20);
  response.status(StatusCodes.OK).json({ success: true, data: await listActivityTimeline(institutionId, limit) });
};

export const loginHistory = async (request: Request, response: Response) => {
  const institutionId = request.auth?.institutionId;
  if (!institutionId) {
    response.status(StatusCodes.BAD_REQUEST).json({ success: false, error: { message: 'Admin is not linked to an institution' } });
    return;
  }
  const limit = Math.min(Math.max(Number(request.query.limit ?? 50), 1), 100);
  const data = await prisma.loginHistory.findMany({
    where: { institutionId },
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  response.status(StatusCodes.OK).json({ success: true, data });
};


export const listHolidays = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await attendanceControl.listHolidays(contextFrom(request), request.query) });
};

export const createHoliday = async (request: Request, response: Response) => {
  response.status(StatusCodes.CREATED).json({ success: true, data: await attendanceControl.createHoliday(contextFrom(request), request.body) });
};

export const updateHoliday = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await attendanceControl.updateHoliday(contextFrom(request), request.params.id, request.body) });
};

export const deleteHoliday = async (request: Request, response: Response) => {
  await attendanceControl.deleteHoliday(contextFrom(request), request.params.id);
  response.status(StatusCodes.NO_CONTENT).send();
};

export const getAttendancePolicy = async (request: Request, response: Response) => {
  const institutionId = request.auth?.institutionId;
  if (!institutionId) {
    response.status(StatusCodes.BAD_REQUEST).json({ success: false, error: { message: 'Admin is not linked to an institution' } });
    return;
  }
  response.status(StatusCodes.OK).json({ success: true, data: await attendanceControl.getPolicy(institutionId) });
};

export const updateAttendancePolicy = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await attendanceControl.updatePolicy(contextFrom(request), request.body) });
};

export const todayAttendanceStatus = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await attendanceControl.todayStatus(contextFrom(request)) });
};

export const listCorrectionRequests = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await attendanceControl.listCorrectionRequests(contextFrom(request), request.query.status as string | undefined) });
};

export const approveCorrectionRequest = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await attendanceControl.reviewCorrectionRequest(contextFrom(request), request.params.id, true, request.body?.adminNote) });
};

export const rejectCorrectionRequest = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await attendanceControl.reviewCorrectionRequest(contextFrom(request), request.params.id, false, request.body?.adminNote) });
};

export const listLeaveRequests = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await attendanceControl.listLeaveRequests(contextFrom(request), request.query.status as string | undefined) });
};

export const approveLeaveRequest = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await attendanceControl.reviewLeaveRequest(contextFrom(request), request.params.id, true, request.body?.adminNote) });
};

export const rejectLeaveRequest = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await attendanceControl.reviewLeaveRequest(contextFrom(request), request.params.id, false, request.body?.adminNote) });
};

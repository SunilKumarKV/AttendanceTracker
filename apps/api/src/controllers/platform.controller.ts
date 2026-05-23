import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as auditService from '../services/audit.service.js';
import * as platformService from '../services/platform.service.js';

const contextFrom = (request: Request) => ({
  userId: request.auth?.userId,
  role: request.auth?.role,
  institutionId: request.auth?.institutionId,
});

export const dashboard = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await platformService.getPlatformDashboard(contextFrom(request)) });
};

export const listInstitutions = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await platformService.listInstitutions(contextFrom(request)) });
};

export const createInstitution = async (request: Request, response: Response) => {
  response.status(StatusCodes.CREATED).json({ success: true, data: await platformService.createInstitution(contextFrom(request), request.body) });
};

export const updateInstitution = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await platformService.updateInstitution(contextFrom(request), request.params.id, request.body) });
};

export const createInstitutionAdmin = async (request: Request, response: Response) => {
  response.status(StatusCodes.CREATED).json({ success: true, data: await platformService.createInstitutionAdmin(contextFrom(request), request.params.id, request.body) });
};

export const auditLogs = async (request: Request, response: Response) => {
  const limit = request.query.limit ? Number(request.query.limit) : 100;
  const institutionId = typeof request.query.institutionId === 'string' ? request.query.institutionId : undefined;
  const action = typeof request.query.action === 'string' ? request.query.action : undefined;
  response.status(StatusCodes.OK).json({ success: true, data: await auditService.listPlatformAuditLogs({ limit, institutionId, action }) });
};

export const usage = async (request: Request, response: Response) => {
  const institutionId = request.auth?.role === 'SUPER_ADMIN'
    ? request.params.id ?? request.auth?.institutionId
    : request.auth?.institutionId;
  response.status(StatusCodes.OK).json({ success: true, data: await platformService.getInstitutionUsage(institutionId ?? '') });
};

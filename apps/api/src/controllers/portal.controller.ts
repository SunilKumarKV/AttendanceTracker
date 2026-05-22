import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as portal from '../services/portal.service.js';

const contextFrom = (request: Request) => ({ userId: request.auth?.userId, institutionId: request.auth?.institutionId });

export const studentDashboard = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await portal.studentDashboard(contextFrom(request)) });
};
export const studentProfile = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await portal.studentProfile(contextFrom(request)) });
};
export const studentReport = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await portal.studentReport(contextFrom(request)) });
};
export const studentNotifications = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await portal.studentNotifications(contextFrom(request)) });
};
export const parentChildren = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await portal.parentChildren(contextFrom(request)) });
};
export const parentChildDashboard = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await portal.parentChildDashboard(contextFrom(request), request.params.studentId) });
};
export const parentChildReport = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await portal.parentChildReport(contextFrom(request), request.params.studentId) });
};
export const parentNotifications = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await portal.parentNotifications(contextFrom(request)) });
};
export const createStudentPortalAccess = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await portal.createStudentPortalAccess(contextFrom(request), request.body) });
};
export const createParentPortalAccess = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await portal.createParentPortalAccess(contextFrom(request), request.body) });
};

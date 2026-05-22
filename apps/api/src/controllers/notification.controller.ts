import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as notificationService from '../services/notification.service.js';
import * as communicationService from '../services/communication.service.js';

const contextFrom = (request: Request) => ({
  userId: request.auth?.userId,
  institutionId: request.auth?.institutionId,
});

export const list = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await notificationService.listNotifications(contextFrom(request), request.query) });
};

export const test = async (request: Request, response: Response) => {
  response.status(StatusCodes.CREATED).json({ success: true, data: await notificationService.sendTestNotification(contextFrom(request), request.body) });
};

export const settings = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await notificationService.getNotificationSettings(contextFrom(request)) });
};

export const updateSettings = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await notificationService.updateNotificationSettings(contextFrom(request), request.body) });
};

export const runLowAttendanceSweep = async (request: Request, response: Response) => {
  response.status(StatusCodes.CREATED).json({ success: true, data: await notificationService.runLowAttendanceSweep(contextFrom(request)) });
};


export const lowAttendanceStudents = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await communicationService.getLowAttendanceStudents(contextFrom(request)) });
};

export const listTemplates = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await communicationService.listTemplates(contextFrom(request)) });
};

export const createTemplate = async (request: Request, response: Response) => {
  response.status(StatusCodes.CREATED).json({ success: true, data: await communicationService.createTemplate(contextFrom(request), request.body) });
};

export const updateTemplate = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await communicationService.updateTemplate(contextFrom(request), request.params.id, request.body) });
};

export const sendStudentAlert = async (request: Request, response: Response) => {
  response.status(StatusCodes.CREATED).json({ success: true, data: await communicationService.sendStudentAlert(contextFrom(request), request.body) });
};

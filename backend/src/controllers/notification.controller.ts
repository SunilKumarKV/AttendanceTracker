import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as notificationService from '../services/notification.service.js';

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

import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as settingsService from '../services/settings.service.js';

const contextFrom = (request: Request) => ({
  userId: request.auth?.userId,
  institutionId: request.auth?.institutionId,
});

export const getSettings = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await settingsService.getSettings(contextFrom(request)) });
};

export const updateSettings = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await settingsService.updateSettings(contextFrom(request), request.body) });
};

import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as profileService from '../services/profile.service.js';

const contextFrom = (request: Request) => ({
  userId: request.auth?.userId,
  institutionId: request.auth?.institutionId,
});

export const me = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await profileService.getProfile(contextFrom(request)) });
};

export const updateMe = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await profileService.updateProfile(contextFrom(request), request.body) });
};

export const updatePassword = async (request: Request, response: Response) => {
  await profileService.updatePassword(contextFrom(request), request.body);
  response.status(StatusCodes.OK).json({ success: true });
};

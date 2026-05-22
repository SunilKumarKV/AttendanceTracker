import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as authService from '../services/auth.service.js';

export const login = async (request: Request, response: Response) => {
  const result = await authService.login(request.body.email, request.body.password);
  response.status(StatusCodes.OK).json({ success: true, data: result });
};

export const refresh = async (request: Request, response: Response) => {
  const result = await authService.refresh(request.body.refreshToken);
  response.status(StatusCodes.OK).json({ success: true, data: result });
};

export const logout = async (request: Request, response: Response) => {
  await authService.logout(request.body.refreshToken, request.auth?.userId);
  response.status(StatusCodes.OK).json({ success: true });
};

export const changePassword = async (request: Request, response: Response) => {
  await authService.changePassword(
    request.auth?.userId ?? '',
    request.body.currentPassword,
    request.body.newPassword,
  );
  response.status(StatusCodes.OK).json({ success: true });
};

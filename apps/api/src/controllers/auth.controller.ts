import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as authService from '../services/auth.service.js';
import { clearRefreshTokenCookie, getRefreshTokenFromRequest, setRefreshTokenCookie } from '../utils/cookies.js';

const requestMeta = (request: Request) => ({
  ipAddress: request.ip,
  userAgent: request.get('user-agent'),
});

export const login = async (request: Request, response: Response) => {
  const result = await authService.login(request.body.email, request.body.password, requestMeta(request), request.body.institutionCode);
  setRefreshTokenCookie(response, result.refreshToken);
  const { refreshToken: _refreshToken, ...safeResult } = result;
  response.status(StatusCodes.OK).json({ success: true, data: safeResult });
};

export const refresh = async (request: Request, response: Response) => {
  const refreshToken = getRefreshTokenFromRequest(request);
  const result = await authService.refresh(refreshToken ?? '', requestMeta(request));
  setRefreshTokenCookie(response, result.refreshToken);
  const { refreshToken: _refreshToken, ...safeResult } = result;
  response.status(StatusCodes.OK).json({ success: true, data: safeResult });
};

export const logout = async (request: Request, response: Response) => {
  await authService.logout(getRefreshTokenFromRequest(request), request.auth?.userId, requestMeta(request));
  clearRefreshTokenCookie(response);
  response.status(StatusCodes.OK).json({ success: true });
};

export const sessions = async (request: Request, response: Response) => {
  const data = await authService.listSessions(request.auth?.userId ?? '', getRefreshTokenFromRequest(request));
  response.status(StatusCodes.OK).json({ success: true, data });
};

export const revokeSession = async (request: Request, response: Response) => {
  await authService.revokeSession(request.auth?.userId ?? '', request.params.id, requestMeta(request));
  response.status(StatusCodes.OK).json({ success: true });
};

export const revokeOtherSessions = async (request: Request, response: Response) => {
  await authService.revokeOtherSessions(request.auth?.userId ?? '', getRefreshTokenFromRequest(request), requestMeta(request));
  response.status(StatusCodes.OK).json({ success: true });
};

export const forgotPassword = async (request: Request, response: Response) => {
  await authService.requestPasswordReset(request.body.email, requestMeta(request));
  response.status(StatusCodes.OK).json({ success: true, message: 'If that email exists, a password reset link has been sent.' });
};

export const resetPassword = async (request: Request, response: Response) => {
  await authService.resetPassword(request.body.token, request.body.password, requestMeta(request));
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

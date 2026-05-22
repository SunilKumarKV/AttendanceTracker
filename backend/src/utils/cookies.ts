import { CookieOptions, Request, Response } from 'express';
import { env } from '../config/env.js';

export const REFRESH_TOKEN_COOKIE = 'attendance_refresh_token';

const refreshCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: env.cookies.secure,
  sameSite: env.cookies.sameSite,
  path: '/api/auth',
  maxAge: env.refreshTokenExpiresInDays * 24 * 60 * 60 * 1000,
  ...(env.cookies.domain ? { domain: env.cookies.domain } : {}),
});

export const setRefreshTokenCookie = (response: Response, refreshToken: string) => {
  response.cookie(REFRESH_TOKEN_COOKIE, refreshToken, refreshCookieOptions());
};

export const clearRefreshTokenCookie = (response: Response) => {
  response.clearCookie(REFRESH_TOKEN_COOKIE, {
    ...refreshCookieOptions(),
    maxAge: undefined,
  });
};

export const getCookieValue = (request: Request, name: string) => {
  const cookieHeader = request.headers.cookie;

  if (!cookieHeader) {
    return undefined;
  }

  const cookies = cookieHeader.split(';').map((cookie) => cookie.trim());
  const found = cookies.find((cookie) => cookie.startsWith(`${name}=`));

  if (!found) {
    return undefined;
  }

  return decodeURIComponent(found.slice(name.length + 1));
};

export const getRefreshTokenFromRequest = (request: Request) => (
  getCookieValue(request, REFRESH_TOKEN_COOKIE)
  ?? (typeof request.body?.refreshToken === 'string' ? request.body.refreshToken : undefined)
);

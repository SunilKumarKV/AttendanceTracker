import { RequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);
const allowedOrigins = new Set([env.clientUrl, ...env.corsOrigins]);

export const verifyOrigin: RequestHandler = (request, _response, next) => {
  if (safeMethods.has(request.method)) {
    return next();
  }

  const origin = request.headers.origin;

  // Non-browser/server-to-server calls may not have Origin. They must still use
  // normal Authorization headers; browser cookie requests are Origin-checked.
  if (!origin) {
    return next();
  }

  if (!allowedOrigins.has(origin)) {
    return next(new AppError('Request origin is not allowed', StatusCodes.FORBIDDEN));
  }

  return next();
};

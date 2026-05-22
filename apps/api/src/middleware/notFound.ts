import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { AppError } from '../utils/AppError.js';

export const notFound = (request: Request, _response: Response, next: NextFunction) => {
  next(new AppError(`Route not found: ${request.method} ${request.originalUrl}`, StatusCodes.NOT_FOUND));
};

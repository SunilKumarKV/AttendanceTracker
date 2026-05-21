import { RequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';
import { ZodSchema } from 'zod';
import { AppError } from '../utils/AppError.js';

export const validateBody = (schema: ZodSchema): RequestHandler => (
  (request, _response, next) => {
    const result = schema.safeParse(request.body);

    if (!result.success) {
      return next(new AppError('Validation failed', StatusCodes.BAD_REQUEST, result.error.flatten()));
    }

    request.body = result.data;
    return next();
  }
);

import { ErrorRequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  const isOperational = error instanceof AppError;
  const statusCode = isOperational ? error.statusCode : StatusCodes.INTERNAL_SERVER_ERROR;

  if (!isOperational) {
    console.error(error);
  }

  response.status(statusCode).json({
    success: false,
    error: {
      message: isOperational ? error.message : 'Internal server error',
      ...(isOperational && error.details ? { details: error.details } : {}),
      ...(env.nodeEnv === 'development' && !isOperational ? { details: String(error) } : {}),
    },
  });
};

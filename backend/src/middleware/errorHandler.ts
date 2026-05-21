import { ErrorRequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { captureException } from '../utils/monitoring.js';

export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  const isBodyParserError = error instanceof SyntaxError && 'body' in error;
  const isPayloadTooLarge = typeof error === 'object' && error !== null && 'type' in error && error.type === 'entity.too.large';
  const isOperational = error instanceof AppError || isBodyParserError || isPayloadTooLarge;
  const statusCode = error instanceof AppError
    ? error.statusCode
    : isPayloadTooLarge
      ? StatusCodes.REQUEST_TOO_LONG
      : isBodyParserError
        ? StatusCodes.BAD_REQUEST
        : StatusCodes.INTERNAL_SERVER_ERROR;

  if (!isOperational) {
    logger.error('Unhandled request error.', {
      method: request.method,
      path: request.originalUrl,
      error: error instanceof Error ? error.message : String(error),
    });
    captureException(error, { method: request.method, path: request.originalUrl });
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

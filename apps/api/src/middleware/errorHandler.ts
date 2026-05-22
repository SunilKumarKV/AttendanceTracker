import { ErrorRequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';
import { Prisma } from '@prisma/client';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { captureException } from '../utils/monitoring.js';

export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  const isBodyParserError = error instanceof SyntaxError && 'body' in error;
  const isPayloadTooLarge = typeof error === 'object' && error !== null && 'type' in error && error.type === 'entity.too.large';
  const isUniqueConstraint = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  const isForeignKeyConstraint = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003';
  const isOperational = error instanceof AppError || isBodyParserError || isPayloadTooLarge || isUniqueConstraint || isForeignKeyConstraint;
  const statusCode = error instanceof AppError
    ? error.statusCode
    : isPayloadTooLarge
      ? StatusCodes.REQUEST_TOO_LONG
      : isBodyParserError
        ? StatusCodes.BAD_REQUEST
        : isUniqueConstraint
          ? StatusCodes.CONFLICT
          : isForeignKeyConstraint
            ? StatusCodes.BAD_REQUEST
            : StatusCodes.INTERNAL_SERVER_ERROR;
  const message = isUniqueConstraint
    ? 'A record with these unique fields already exists.'
    : isForeignKeyConstraint
      ? 'This record references invalid or related data.'
      : error.message;

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
      message: isOperational ? message : 'Internal server error',
      ...(isOperational && error.details ? { details: error.details } : {}),
      ...(env.nodeEnv === 'development' && !isOperational ? { details: String(error) } : {}),
    },
  });
};

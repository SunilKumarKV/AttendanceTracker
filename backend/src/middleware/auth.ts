import { Role } from '@prisma/client';
import { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { StatusCodes } from 'http-status-codes';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';

interface AccessTokenPayload {
  sub: string;
  email: string;
  role: Role;
  institutionId: string | null;
}

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        email: string;
        role: Role;
        institutionId: string | null;
      };
    }
  }
}

const getBearerToken = (authorization?: string) => {
  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }

  return authorization.slice('Bearer '.length).trim();
};

export const authenticate: RequestHandler = async (request, _response, next) => {
  try {
    const token = getBearerToken(request.headers.authorization);

    if (!token) {
      throw new AppError('Authentication required', StatusCodes.UNAUTHORIZED);
    }

    const payload = jwt.verify(token, env.jwtAccessSecret) as AccessTokenPayload;
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        institutionId: true,
        isActive: true,
      },
    });

    if (!user?.isActive) {
      throw new AppError('Authentication required', StatusCodes.UNAUTHORIZED);
    }

    request.auth = {
      userId: user.id,
      email: user.email,
      role: user.role,
      institutionId: user.institutionId,
    };

    next();
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }

    return next(new AppError('Invalid or expired token', StatusCodes.UNAUTHORIZED));
  }
};

export const requireRole = (...allowedRoles: Role[]): RequestHandler => (
  (request, _response, next) => {
    if (!request.auth) {
      return next(new AppError('Authentication required', StatusCodes.UNAUTHORIZED));
    }

    if (!allowedRoles.includes(request.auth.role)) {
      return next(new AppError('Insufficient permissions', StatusCodes.FORBIDDEN));
    }

    return next();
  }
);

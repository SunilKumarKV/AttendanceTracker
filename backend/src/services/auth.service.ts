import { Role, User } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import jwt, { SignOptions } from 'jsonwebtoken';
import { StatusCodes } from 'http-status-codes';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { trackServerEvent } from '../utils/analytics.js';

type PublicUser = Pick<User, 'id' | 'institutionId' | 'name' | 'email' | 'role'>;

const selectPublicUser = {
  id: true,
  institutionId: true,
  name: true,
  email: true,
  role: true,
  passwordHash: true,
  isActive: true,
} as const;

const hashToken = (token: string) => (
  crypto.createHash('sha256').update(token).digest('hex')
);

const createRefreshTokenValue = () => crypto.randomBytes(48).toString('base64url');

const getRefreshExpiry = () => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + env.refreshTokenExpiresInDays);
  return expiresAt;
};

const toPublicUser = (user: PublicUser) => ({
  id: user.id,
  institutionId: user.institutionId,
  name: user.name,
  email: user.email,
  role: user.role,
});

const signAccessToken = (user: PublicUser) => {
  const options: SignOptions = {
    expiresIn: env.jwtAccessExpiresIn as SignOptions['expiresIn'],
  };

  return jwt.sign({
    email: user.email,
    role: user.role,
    institutionId: user.institutionId,
  }, env.jwtAccessSecret, {
    ...options,
    subject: user.id,
  });
};

const persistRefreshToken = async (userId: string) => {
  const refreshToken = createRefreshTokenValue();

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(refreshToken),
      expiresAt: getRefreshExpiry(),
    },
  });

  return refreshToken;
};

export const login = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({
    where: { email },
    select: selectPublicUser,
  });

  if (!user?.isActive) {
    throw new AppError('Invalid email or password', StatusCodes.UNAUTHORIZED);
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    throw new AppError('Invalid email or password', StatusCodes.UNAUTHORIZED);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  trackServerEvent('auth.login_succeeded', { userId: user.id, role: user.role });

  const publicUser = toPublicUser(user);

  return {
    user: publicUser,
    accessToken: signAccessToken(publicUser),
    refreshToken: await persistRefreshToken(user.id),
  };
};

export const refresh = async (refreshToken: string) => {
  const tokenHash = hashToken(refreshToken);
  const storedToken = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!storedToken || storedToken.revokedAt || storedToken.expiresAt <= new Date() || !storedToken.user.isActive) {
    throw new AppError('Invalid refresh token', StatusCodes.UNAUTHORIZED);
  }

  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: { revokedAt: new Date() },
  });

  const publicUser = toPublicUser(storedToken.user);

  return {
    user: publicUser,
    accessToken: signAccessToken(publicUser),
    refreshToken: await persistRefreshToken(storedToken.userId),
  };
};

export const logout = async (refreshToken?: string, userId?: string) => {
  if (refreshToken) {
    await prisma.refreshToken.updateMany({
      where: {
        tokenHash: hashToken(refreshToken),
        ...(userId ? { userId } : {}),
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
    return;
  }

  if (userId) {
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
};

export const changePassword = async (userId: string, currentPassword: string, newPassword: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, passwordHash: true },
  });

  if (!user) {
    throw new AppError('User not found', StatusCodes.NOT_FOUND);
  }

  const passwordMatches = await bcrypt.compare(currentPassword, user.passwordHash);

  if (!passwordMatches) {
    throw new AppError('Current password is incorrect', StatusCodes.BAD_REQUEST);
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(newPassword, 12) },
    }),
    prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
};

export const canAccessRole = (role: Role, allowedRoles: Role[]) => allowedRoles.includes(role);

import { Role, User } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import jwt, { SignOptions } from 'jsonwebtoken';
import { StatusCodes } from 'http-status-codes';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { trackServerEvent } from '../utils/analytics.js';
import { sendPasswordResetEmail } from './email.service.js';
import { writeAuditLog } from './audit.service.js';

type PublicUser = Pick<User, 'id' | 'institutionId' | 'name' | 'email' | 'role'>;
interface RequestMeta { ipAddress?: string; userAgent?: string }
const createPasswordResetTokenValue = () => crypto.randomBytes(48).toString('base64url');

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

export const login = async (email: string, password: string, meta: RequestMeta = {}, institutionCode?: string) => {
  const normalizedInstitutionCode = institutionCode?.trim().toUpperCase();
  const user = await prisma.user.findUnique({
    where: { email },
    select: { ...selectPublicUser, institution: { select: { code: true, isActive: true, subscriptionStatus: true } } },
  });

  const failLogin = async (): Promise<never> => {
    await prisma.loginHistory.create({
      data: {
        userId: user?.id,
        institutionId: user?.institutionId,
        email,
        success: false,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
    }).catch(() => undefined);
    await writeAuditLog({
      actorId: user?.id,
      institutionId: user?.institutionId,
      action: 'LOGIN_FAILED',
      entityType: 'Auth',
      metadata: { email },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    }).catch(() => undefined);
    throw new AppError('Invalid email or password', StatusCodes.UNAUTHORIZED);
  };

  if (!user || !user.isActive) return await failLogin();
  if (normalizedInstitutionCode && user.role !== Role.SUPER_ADMIN && user.institution?.code !== normalizedInstitutionCode) return await failLogin();
  if (user.role !== Role.SUPER_ADMIN && (!user.institution?.isActive || ['CANCELLED', 'EXPIRED'].includes(user.institution.subscriptionStatus))) {
    throw new AppError('Institution subscription is not active', StatusCodes.FORBIDDEN);
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) return await failLogin();

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    }),
    prisma.loginHistory.create({
      data: {
        userId: user.id,
        institutionId: user.institutionId,
        email,
        success: true,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
    }),
  ]);
  await writeAuditLog({
    actorId: user.id,
    institutionId: user.institutionId,
    action: 'LOGIN_SUCCESS',
    entityType: 'Auth',
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  }).catch(() => undefined);
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

export const logout = async (refreshToken?: string, userId?: string, meta: RequestMeta = {}) => {
  if (refreshToken) {
    await prisma.refreshToken.updateMany({
      where: {
        tokenHash: hashToken(refreshToken),
        ...(userId ? { userId } : {}),
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { institutionId: true } });
      await writeAuditLog({ actorId: userId, institutionId: user?.institutionId, action: 'LOGOUT', entityType: 'Auth', ipAddress: meta.ipAddress, userAgent: meta.userAgent }).catch(() => undefined);
    }
    return;
  }

  if (userId) {
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
};


export const requestPasswordReset = async (email: string, meta: RequestMeta = {}) => {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, institutionId: true, email: true, isActive: true },
  });

  if (!user?.isActive) {
    return { emailSent: false };
  }

  const token = createPasswordResetTokenValue();
  const expiresAt = new Date(Date.now() + env.passwordResetTokenExpiresMinutes * 60 * 1000);

  await prisma.$transaction([
    prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt,
      },
    }),
  ]);

  const resetUrl = `${env.passwordResetUrl}?token=${encodeURIComponent(token)}`;
  const emailSent = await sendPasswordResetEmail(user.email, resetUrl);
  await writeAuditLog({
    actorId: user.id,
    institutionId: user.institutionId,
    action: 'PASSWORD_RESET_REQUESTED',
    entityType: 'User',
    entityId: user.id,
    metadata: { emailSent },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  }).catch(() => undefined);
  return { emailSent };
};

export const resetPassword = async (token: string, newPassword: string, meta: RequestMeta = {}) => {
  const tokenHash = hashToken(token);
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: { select: { id: true, institutionId: true, isActive: true } } },
  });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt <= new Date() || !resetToken.user.isActive) {
    throw new AppError('Reset link is invalid or expired', StatusCodes.BAD_REQUEST);
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash: await bcrypt.hash(newPassword, 12) },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
    prisma.refreshToken.updateMany({
      where: { userId: resetToken.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  await writeAuditLog({
    actorId: resetToken.userId,
    institutionId: resetToken.user.institutionId,
    action: 'PASSWORD_RESET_COMPLETED',
    entityType: 'User',
    entityId: resetToken.userId,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  }).catch(() => undefined);
};

export const changePassword = async (userId: string, currentPassword: string, newPassword: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, institutionId: true, passwordHash: true },
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
  await writeAuditLog({ actorId: user.id, institutionId: user.institutionId, action: 'PASSWORD_CHANGE', entityType: 'User', entityId: user.id }).catch(() => undefined);
};

export const canAccessRole = (role: Role, allowedRoles: Role[]) => allowedRoles.includes(role);

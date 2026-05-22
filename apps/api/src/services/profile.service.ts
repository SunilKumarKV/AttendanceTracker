import bcrypt from 'bcryptjs';
import { StatusCodes } from 'http-status-codes';
import { Prisma, Role } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { uploadProvider } from './upload.service.js';
import { toSettingsObject } from './settings.service.js';
import { profilePasswordSchema, profileUpdateSchema } from '../validators/profile.validator.js';
import { writeAuditLog } from './audit.service.js';

interface ProfileContext {
  userId?: string;
  institutionId?: string | null;
}

const requireUserId = (userId?: string) => {
  if (!userId) throw new AppError('Authentication required', StatusCodes.UNAUTHORIZED);
  return userId;
};

const getUserProfileSettings = async (institutionId: string | null | undefined, userId: string) => {
  if (!institutionId) return {};
  const appSettings = await prisma.appSettings.upsert({
    where: { institutionId },
    update: {},
    create: { institutionId },
  });
  const settings = toSettingsObject(appSettings.settings);
  const profiles = settings.userProfiles && typeof settings.userProfiles === 'object' && !Array.isArray(settings.userProfiles)
    ? settings.userProfiles as Record<string, unknown>
    : {};
  const profile = profiles[userId];
  return profile && typeof profile === 'object' && !Array.isArray(profile) ? profile as Record<string, unknown> : {};
};

const saveUserProfileSettings = async (institutionId: string | null | undefined, userId: string, data: Record<string, unknown>) => {
  if (!institutionId) return;
  const appSettings = await prisma.appSettings.upsert({
    where: { institutionId },
    update: {},
    create: { institutionId },
  });
  const settings = toSettingsObject(appSettings.settings);
  const profiles = settings.userProfiles && typeof settings.userProfiles === 'object' && !Array.isArray(settings.userProfiles)
    ? settings.userProfiles as Record<string, unknown>
    : {};
  const nextSettings = {
    ...settings,
    userProfiles: {
      ...profiles,
      [userId]: {
        ...(profiles[userId] && typeof profiles[userId] === 'object' ? profiles[userId] as Record<string, unknown> : {}),
        ...data,
      },
    },
  } as Prisma.InputJsonObject;

  await prisma.appSettings.update({
    where: { institutionId },
    data: {
      settings: nextSettings,
    },
  });
};

const toProfileDto = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      institution: true,
      professorProfile: true,
    },
  });
  if (!user) throw new AppError('Profile not found', StatusCodes.NOT_FOUND);
  const storedProfile = await getUserProfileSettings(user.institutionId, user.id);

  return {
    id: user.id,
    institutionId: user.institutionId,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.professorProfile?.phone ?? String(storedProfile.phone ?? ''),
    college: user.institution?.name ?? '',
    department: user.professorProfile?.department ?? String(storedProfile.department ?? ''),
    employeeId: user.professorProfile?.employeeCode ?? String(storedProfile.employeeId ?? ''),
    avatar: String(storedProfile.avatar ?? ''),
    preferences: storedProfile.preferences && typeof storedProfile.preferences === 'object' ? storedProfile.preferences : {},
  };
};

export const getProfile = async (context: ProfileContext) => (
  toProfileDto(requireUserId(context.userId))
);

export const updateProfile = async (context: ProfileContext, rawData: unknown) => {
  const userId = requireUserId(context.userId);
  const data = profileUpdateSchema.parse(rawData);
  const existing = await prisma.user.findUnique({ where: { id: userId }, include: { professorProfile: true } });
  if (!existing) throw new AppError('Profile not found', StatusCodes.NOT_FOUND);

  if (data.email && data.email !== existing.email) {
    const duplicate = await prisma.user.findUnique({ where: { email: data.email } });
    if (duplicate) throw new AppError('Email is already in use', StatusCodes.CONFLICT);
  }

  let avatar: string | undefined;
  if (data.avatarDataUrl) {
    const uploaded = await uploadProvider.uploadAvatar(userId, data.avatarDataUrl);
    avatar = uploaded.url;
  } else if (data.avatarDataUrl === null) {
    avatar = '';
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      name: data.name,
      email: data.email,
    },
  });

  if (existing.role === Role.PROFESSOR) {
    await prisma.professorProfile.upsert({
      where: { userId },
      create: {
        userId,
        institutionId: existing.institutionId ?? context.institutionId ?? '',
        employeeCode: `EMP-${Date.now()}`,
        phone: data.phone,
        department: data.department,
      },
      update: {
        phone: data.phone,
        department: data.department,
      },
    });
  }

  await saveUserProfileSettings(existing.institutionId, userId, {
    ...(data.phone !== undefined ? { phone: data.phone } : {}),
    ...(data.department !== undefined ? { department: data.department } : {}),
    ...(avatar !== undefined ? { avatar } : {}),
    ...(data.preferences !== undefined ? { preferences: data.preferences } : {}),
  });

  await writeAuditLog({ actorId: userId, institutionId: existing.institutionId, action: 'UPDATE', entityType: 'UserProfile', entityId: userId }).catch(() => undefined);
  return toProfileDto(userId);
};

export const updatePassword = async (context: ProfileContext, rawData: unknown) => {
  const userId = requireUserId(context.userId);
  const data = profilePasswordSchema.parse(rawData);
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, institutionId: true, passwordHash: true } });
  if (!user) throw new AppError('Profile not found', StatusCodes.NOT_FOUND);
  const passwordMatches = await bcrypt.compare(data.currentPassword, user.passwordHash);
  if (!passwordMatches) throw new AppError('Current password is incorrect', StatusCodes.BAD_REQUEST);
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(data.newPassword, 12) } }),
    prisma.refreshToken.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);
  await writeAuditLog({ actorId: user.id, institutionId: user.institutionId, action: 'PASSWORD_CHANGE', entityType: 'User', entityId: user.id }).catch(() => undefined);
};

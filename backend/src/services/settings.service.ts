import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { requireInstitutionId } from './adminContext.service.js';
import { appSettingsSchema } from '../validators/settings.validator.js';

interface SettingsContext {
  userId?: string;
  institutionId?: string | null;
}

export const toSettingsObject = (settings: Prisma.JsonValue | null | undefined) => {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return {};
  return settings as Record<string, unknown>;
};

const defaultSettings = {
  academicYear: '2025-26',
  principalName: '',
  theme: 'light',
};

export const getSettings = async (context: SettingsContext) => {
  const institutionId = requireInstitutionId(context.institutionId);
  const [institution, appSettings] = await Promise.all([
    prisma.institution.findUnique({ where: { id: institutionId } }),
    prisma.appSettings.upsert({
      where: { institutionId },
      update: {},
      create: { institutionId, settings: defaultSettings },
    }),
  ]);
  const values = { ...defaultSettings, ...toSettingsObject(appSettings.settings) };

  return {
    institution: {
      id: institution?.id,
      name: institution?.name ?? '',
      code: institution?.code ?? '',
      email: institution?.email ?? '',
      phone: institution?.phone ?? '',
      address: institution?.address ?? '',
    },
    academicYear: String(values.academicYear ?? defaultSettings.academicYear),
    principalName: String(values.principalName ?? ''),
    theme: values.theme === 'dark' ? 'dark' : 'light',
    timezone: appSettings.timezone,
    minimumAttendancePct: appSettings.minimumAttendancePct,
    notificationEnabled: appSettings.notificationEnabled,
  };
};

export const updateSettings = async (context: SettingsContext, rawData: unknown) => {
  const institutionId = requireInstitutionId(context.institutionId);
  const data = appSettingsSchema.parse(rawData);
  const current = await prisma.appSettings.upsert({
    where: { institutionId },
    update: {},
    create: { institutionId, settings: defaultSettings },
  });
  const currentSettings = toSettingsObject(current.settings);
  const nextSettings = {
    ...currentSettings,
    ...(data.academicYear !== undefined ? { academicYear: data.academicYear } : {}),
    ...(data.principalName !== undefined ? { principalName: data.principalName } : {}),
    ...(data.theme !== undefined ? { theme: data.theme } : {}),
  };

  await Promise.all([
    data.institution ? prisma.institution.update({
      where: { id: institutionId },
      data: {
        name: data.institution.name,
        email: data.institution.email || null,
        phone: data.institution.phone,
        address: data.institution.address,
      },
    }) : Promise.resolve(),
    prisma.appSettings.update({
      where: { institutionId },
      data: {
        timezone: data.timezone,
        settings: nextSettings,
      },
    }),
  ]);

  return getSettings(context);
};

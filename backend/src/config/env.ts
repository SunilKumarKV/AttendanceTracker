import dotenv from 'dotenv';

dotenv.config();

const toNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const env = {
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:3000',
  databaseUrl: process.env.DATABASE_URL ?? '',
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? 'development-access-secret',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? 'development-refresh-secret',
  refreshTokenExpiresInDays: toNumber(process.env.REFRESH_TOKEN_EXPIRES_IN_DAYS, 7),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: toNumber(process.env.PORT, 5000),
  smtp: {
    host: process.env.SMTP_HOST ?? '',
    port: toNumber(process.env.SMTP_PORT, 587),
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
  },
  supportEmail: process.env.SUPPORT_EMAIL ?? 'support@attendancetracker.local',
};

import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });

const toNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const nodeEnv = process.env.NODE_ENV ?? 'development';
const isProduction = nodeEnv === 'production';
const emptyToUndefined = (value: unknown) => (value === '' ? undefined : value);
const toBoolean = (value: unknown) => {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return value;
  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return value;
};

const envSchema = z.object({
  CLIENT_URL: z.preprocess(emptyToUndefined, z.string().url().default('http://localhost:3000')),
  CORS_ORIGINS: z.preprocess(emptyToUndefined, z.string().optional()),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_ACCESS_EXPIRES_IN: z.preprocess(emptyToUndefined, z.string().default('15m')),
  JWT_ACCESS_SECRET: z.string().min(isProduction ? 32 : 1, 'JWT_ACCESS_SECRET must be at least 32 characters in production'),
  JWT_REFRESH_SECRET: z.string().min(isProduction ? 32 : 1, 'JWT_REFRESH_SECRET must be at least 32 characters in production'),
  LOG_LEVEL: z.preprocess(emptyToUndefined, z.enum(['debug', 'info', 'warn', 'error']).default(isProduction ? 'info' : 'debug')),
  NODE_ENV: z.preprocess(emptyToUndefined, z.enum(['development', 'test', 'production']).default('development')),
  PORT: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().default(5000)),
  REFRESH_TOKEN_EXPIRES_IN_DAYS: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().default(7)),
  SENTRY_DSN: z.preprocess(emptyToUndefined, z.string().optional().default('')),
  ANALYTICS_WRITE_KEY: z.preprocess(emptyToUndefined, z.string().optional().default('')),
  ENABLE_SCHEDULER: z.preprocess((value) => toBoolean(emptyToUndefined(value)), z.boolean().default(false)),
  SMTP_HOST: z.preprocess(emptyToUndefined, z.string().optional().default('')),
  SMTP_PORT: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().default(587)),
  SMTP_USER: z.preprocess(emptyToUndefined, z.string().optional().default('')),
  SMTP_PASS: z.preprocess(emptyToUndefined, z.string().optional().default('')),
  SUPPORT_EMAIL: z.preprocess(emptyToUndefined, z.string().email().default('support@attendancetracker.com')),
  SMTP_FROM: z.preprocess(emptyToUndefined, z.string().email().optional()),
  PASSWORD_RESET_URL: z.preprocess(emptyToUndefined, z.string().url().default('http://localhost:3000/reset-password')),
  PASSWORD_RESET_TOKEN_EXPIRES_MINUTES: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().default(30)),
  TWILIO_ACCOUNT_SID: z.preprocess(emptyToUndefined, z.string().optional().default('')),
  TWILIO_AUTH_TOKEN: z.preprocess(emptyToUndefined, z.string().optional().default('')),
  TWILIO_FROM_NUMBER: z.preprocess(emptyToUndefined, z.string().optional().default('')),
  TWILIO_WHATSAPP_FROM: z.preprocess(emptyToUndefined, z.string().optional().default('')),
  WHATSAPP_CLOUD_TOKEN: z.preprocess(emptyToUndefined, z.string().optional().default('')),
  WHATSAPP_PHONE_NUMBER_ID: z.preprocess(emptyToUndefined, z.string().optional().default('')),
  WHATSAPP_TEMPLATE_NAME: z.preprocess(emptyToUndefined, z.string().optional().default('')),
  WHATSAPP_TEMPLATE_LANG: z.preprocess(emptyToUndefined, z.string().optional().default('en')),
  COOKIE_DOMAIN: z.preprocess(emptyToUndefined, z.string().optional().default('')),
  COOKIE_SAMESITE: z.preprocess(emptyToUndefined, z.enum(['lax', 'strict', 'none']).default(isProduction ? 'none' : 'lax')),
  COOKIE_SECURE: z.preprocess((value) => toBoolean(emptyToUndefined(value)), z.boolean().default(isProduction)),
  RAZORPAY_KEY_ID: z.preprocess(emptyToUndefined, z.string().optional().default('')),
RAZORPAY_KEY_SECRET: z.preprocess(emptyToUndefined, z.string().optional().default('')),
RAZORPAY_WEBHOOK_SECRET: z.preprocess(emptyToUndefined, z.string().optional().default('')),
});

const parsed = envSchema.safeParse({
  ...process.env,
  NODE_ENV: nodeEnv,
  DATABASE_URL: process.env.DATABASE_URL ?? (isProduction ? '' : 'postgresql://localhost:5432/attendancepro?schema=public'),
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET ?? (isProduction ? '' : 'development-access-secret'),
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ?? (isProduction ? '' : 'development-refresh-secret'),
});

if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
  throw new Error(`Invalid backend environment: ${issues}`);
}

const values = parsed.data;

export const env = {
  analyticsWriteKey: values.ANALYTICS_WRITE_KEY,
  clientUrl: values.CLIENT_URL,
  corsOrigins: values.CORS_ORIGINS ? values.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean) : [],
  databaseUrl: values.DATABASE_URL,
  isProduction,
  jwtAccessExpiresIn: values.JWT_ACCESS_EXPIRES_IN,
  jwtAccessSecret: values.JWT_ACCESS_SECRET,
  jwtRefreshSecret: values.JWT_REFRESH_SECRET,
  logLevel: values.LOG_LEVEL,
  nodeEnv: values.NODE_ENV,
  port: toNumber(String(values.PORT), 5000),
  refreshTokenExpiresInDays: values.REFRESH_TOKEN_EXPIRES_IN_DAYS,
  schedulerEnabled: values.ENABLE_SCHEDULER,
  sentryDsn: values.SENTRY_DSN,
  smtp: {
    host: values.SMTP_HOST,
    port: values.SMTP_PORT,
    user: values.SMTP_USER,
    pass: values.SMTP_PASS,
    from: values.SMTP_FROM || values.SUPPORT_EMAIL,
  },
  passwordResetUrl: values.PASSWORD_RESET_URL,
  passwordResetTokenExpiresMinutes: values.PASSWORD_RESET_TOKEN_EXPIRES_MINUTES,
  supportEmail: values.SUPPORT_EMAIL,
  twilio: {
    accountSid: values.TWILIO_ACCOUNT_SID,
    authToken: values.TWILIO_AUTH_TOKEN,
    fromNumber: values.TWILIO_FROM_NUMBER,
    whatsappFrom: values.TWILIO_WHATSAPP_FROM,
  },
  cookies: {
    domain: values.COOKIE_DOMAIN,
    sameSite: values.COOKIE_SAMESITE,
    secure: values.COOKIE_SECURE,
  },
  whatsappCloud: {
    token: values.WHATSAPP_CLOUD_TOKEN,
    phoneNumberId: values.WHATSAPP_PHONE_NUMBER_ID,
    templateName: values.WHATSAPP_TEMPLATE_NAME,
    templateLang: values.WHATSAPP_TEMPLATE_LANG,
  },
  razorpay: {
  keyId: values.RAZORPAY_KEY_ID,
  keySecret: values.RAZORPAY_KEY_SECRET,
  webhookSecret: values.RAZORPAY_WEBHOOK_SECRET,
},
};

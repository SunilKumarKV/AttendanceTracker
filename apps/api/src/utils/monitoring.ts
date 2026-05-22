import * as Sentry from '@sentry/node';
import { env } from '../config/env.js';
import { logger } from './logger.js';

let initialized = false;

export const initMonitoring = () => {
  if (!env.sentryDsn) {
    logger.info('Sentry disabled; SENTRY_DSN is not configured.');
    return;
  }

  Sentry.init({
    dsn: env.sentryDsn,
    environment: env.nodeEnv,
    tracesSampleRate: env.isProduction ? 0.1 : 1,
  });
  initialized = true;
  logger.info('Sentry initialized.');
};

export const captureException = (error: unknown, context?: Record<string, unknown>) => {
  if (!initialized) return;
  Sentry.withScope((scope) => {
    if (context) {
      Object.entries(context).forEach(([key, value]) => scope.setExtra(key, value));
    }
    Sentry.captureException(error);
  });
};

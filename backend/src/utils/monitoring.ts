import { env } from '../config/env.js';
import { logger } from './logger.js';

export const initMonitoring = () => {
  if (!env.sentryDsn) {
    logger.info('Sentry disabled; SENTRY_DSN is not configured.');
    return;
  }

  logger.info('Sentry placeholder initialized. Install @sentry/node before enabling event capture.', {
    configured: true,
  });
};

export const captureException = (error: unknown, context?: Record<string, unknown>) => {
  if (!env.sentryDsn) return;
  logger.error('Sentry placeholder captured exception.', {
    error: error instanceof Error ? error.message : String(error),
    ...context,
  });
};

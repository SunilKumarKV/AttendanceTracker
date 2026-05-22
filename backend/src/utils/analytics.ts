import { env } from '../config/env.js';
import { logger } from './logger.js';

export const trackServerEvent = (event: string, properties: Record<string, unknown> = {}) => {
  if (!env.analyticsWriteKey) return;
  logger.info('Analytics event queued.', { event, properties });
};

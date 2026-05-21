import { app } from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/prisma.js';
import { startNotificationScheduler, stopNotificationScheduler } from './jobs/notificationScheduler.js';
import { logger } from './utils/logger.js';
import { initMonitoring } from './utils/monitoring.js';

initMonitoring();
startNotificationScheduler();

const server = app.listen(env.port, () => {
  logger.info('API server listening.', { port: env.port, nodeEnv: env.nodeEnv });
});

server.on('error', (error) => {
  logger.error('Failed to start API server.', { error: error.message });
  process.exit(1);
});

const shutdown = async (signal: string) => {
  logger.info('Shutdown signal received.', { signal });

  server.close(async () => {
    stopNotificationScheduler();
    await prisma.$disconnect();
    process.exit(0);
  });
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

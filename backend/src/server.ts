import { app } from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/prisma.js';

const server = app.listen(env.port, () => {
  console.log(`API server listening on port ${env.port}`);
});

server.on('error', (error) => {
  console.error('Failed to start API server:', error);
  process.exit(1);
});

const shutdown = async (signal: string) => {
  console.log(`${signal} received. Shutting down API server.`);

  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

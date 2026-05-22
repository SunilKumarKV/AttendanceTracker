import { prisma } from '../config/prisma.js';
import { runNotificationJobsOnce } from './notificationScheduler.js';

runNotificationJobsOnce()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

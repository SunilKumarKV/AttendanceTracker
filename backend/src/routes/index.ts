import { Router } from 'express';
import { adminRouter } from './admin.routes.js';
import { authRouter } from './auth.routes.js';
import { healthRouter } from './health.routes.js';
import { notificationRouter } from './notification.routes.js';
import { professorRouter } from './professor.routes.js';
import { reportRouter } from './report.routes.js';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use(healthRouter);
apiRouter.use(professorRouter);
apiRouter.use(reportRouter);
apiRouter.use(notificationRouter);
apiRouter.use(adminRouter);

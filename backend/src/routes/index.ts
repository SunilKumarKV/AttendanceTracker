import { Router, type Router as ExpressRouter } from 'express';
import { adminRouter } from './admin.routes.js';
import { authRouter } from './auth.routes.js';
import { healthRouter } from './health.routes.js';
import { notificationRouter } from './notification.routes.js';
import { professorRouter } from './professor.routes.js';
import { profileRouter } from './profile.routes.js';
import { reportRouter } from './report.routes.js';
import { settingsRouter } from './settings.routes.js';

export const apiRouter: ExpressRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use(healthRouter);
apiRouter.use(profileRouter);
apiRouter.use(professorRouter);
apiRouter.use(reportRouter);
apiRouter.use(notificationRouter);
apiRouter.use(settingsRouter);
apiRouter.use(adminRouter);

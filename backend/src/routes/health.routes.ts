import { Router, type Router as ExpressRouter } from 'express';
import { getHealth } from '../controllers/health.controller.js';

export const healthRouter: ExpressRouter = Router();

healthRouter.get('/health', getHealth);

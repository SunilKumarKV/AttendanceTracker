import { Router, type Router as ExpressRouter } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimit.js';
import { validateBody } from '../middleware/validateRequest.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  logoutSchema,
  refreshSchema,
  resetPasswordSchema,
} from '../validators/auth.validator.js';

export const authRouter: ExpressRouter = Router();

authRouter.use(authRateLimiter);

authRouter.post('/login', validateBody(loginSchema), asyncHandler(authController.login));
authRouter.post('/refresh', validateBody(refreshSchema), asyncHandler(authController.refresh));
authRouter.post('/forgot-password', validateBody(forgotPasswordSchema), asyncHandler(authController.forgotPassword));
authRouter.post('/reset-password', validateBody(resetPasswordSchema), asyncHandler(authController.resetPassword));
authRouter.post('/logout', authenticate, validateBody(logoutSchema), asyncHandler(authController.logout));
authRouter.post('/change-password', authenticate, validateBody(changePasswordSchema), asyncHandler(authController.changePassword));
authRouter.get('/sessions', authenticate, asyncHandler(authController.sessions));
authRouter.delete('/sessions/:id', authenticate, asyncHandler(authController.revokeSession));
authRouter.delete('/sessions', authenticate, asyncHandler(authController.revokeOtherSessions));

import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { corsOptions } from './config/cors.js';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import { apiRateLimiter } from './middleware/rateLimit.js';
import { requestLogger } from './middleware/requestLogger.js';
import { apiRouter } from './routes/index.js';

export const app = express();

app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      baseUri: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: env.isProduction ? { maxAge: 15552000, includeSubDomains: true, preload: true } : false,
  referrerPolicy: { policy: 'no-referrer' },
}));
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

app.use('/api', apiRateLimiter, apiRouter);

app.use(notFound);
app.use(errorHandler);

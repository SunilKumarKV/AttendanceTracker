import rateLimit from 'express-rate-limit';

const rateLimitResponse = (message: string) => ({
  success: false,
  error: { message },
});

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitResponse('Too many requests. Please slow down and try again later.'),
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitResponse('Too many authentication attempts. Please try again later.'),
});

export const writeRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (request) => request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS',
  message: rateLimitResponse('Too many write requests. Please wait a moment and try again.'),
});

export const reportExportRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitResponse('Too many report export requests. Please wait a moment and try again.'),
});

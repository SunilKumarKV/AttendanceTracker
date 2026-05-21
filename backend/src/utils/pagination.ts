import { z } from 'zod';
import { StatusCodes } from 'http-status-codes';
import { AppError } from './AppError.js';

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
});

export const getPagination = (query: unknown) => {
  const result = paginationQuerySchema.safeParse(query);
  if (!result.success) {
    throw new AppError('Invalid pagination parameters', StatusCodes.BAD_REQUEST, result.error.flatten());
  }
  const parsed = result.data;
  const skip = (parsed.page - 1) * parsed.pageSize;

  return {
    ...parsed,
    skip,
    take: parsed.pageSize,
  };
};

export const toPaginatedResponse = <T>(items: T[], total: number, page: number, pageSize: number) => ({
  items,
  pagination: {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  },
});

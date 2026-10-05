import { z } from 'zod';

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const ApiErrorSchema = z.object({
  statusCode: z.number(),
  errorId: z.string(),
  message: z.string().or(z.array(z.string())),
  timestamp: z.string(),
  path: z.string(),
});

export type Pagination = z.infer<typeof PaginationSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;

import { z } from 'zod';

export const reportQuerySchema = z.object({
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  classId: z.string().optional(),
  courseId: z.string().optional(),
  sectionId: z.string().optional(),
  subjectId: z.string().optional(),
  studentId: z.string().optional(),
  threshold: z.coerce.number().min(0).max(100).optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

export type ReportQuery = z.infer<typeof reportQuerySchema>;

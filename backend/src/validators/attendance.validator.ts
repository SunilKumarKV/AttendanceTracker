import { z } from 'zod';

export const attendanceStatusSchema = z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']);

export const attendanceRecordInputSchema = z.object({
  studentId: z.string().trim().min(1),
  status: attendanceStatusSchema,
  remarks: z.string().trim().max(500).optional().nullable(),
});

export const createAttendanceSessionSchema = z.object({
  courseId: z.string().trim().min(1),
  subjectId: z.string().trim().min(1),
  semesterId: z.string().trim().optional().nullable(),
  sectionId: z.string().trim().optional().nullable(),
  sessionDate: z.string().trim().min(1),
  period: z.string().trim().min(1).max(80).default('Session 1'),
  topic: z.string().trim().max(255).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
  records: z.array(attendanceRecordInputSchema).min(1),
  adminOverride: z.boolean().optional(),
});

export const updateAttendanceSessionSchema = z.object({
  topic: z.string().trim().max(255).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
  records: z.array(attendanceRecordInputSchema).optional(),
});


export const correctionRequestSchema = z.object({
  sessionId: z.string().trim().min(1),
  attendanceRecordId: z.string().trim().optional().nullable(),
  studentId: z.string().trim().optional().nullable(),
  requestedStatus: attendanceStatusSchema.optional().nullable(),
  reason: z.string().trim().min(3).max(1000),
});

export const leaveRequestSchema = z.object({
  studentId: z.string().trim().min(1),
  fromDate: z.string().trim().min(1),
  toDate: z.string().trim().min(1),
  reason: z.string().trim().min(3).max(1000),
});

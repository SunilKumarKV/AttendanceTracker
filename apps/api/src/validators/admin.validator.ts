import { z } from 'zod';

const optionalText = z.string().trim().optional().nullable();

export const professorSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email().toLowerCase(),
  employeeId: z.string().trim().min(1),
  subject: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  department: z.string().trim().optional(),
  designation: z.string().trim().optional(),
  password: z.string().min(8).optional(),
  isActive: z.boolean().optional(),
});

export const professorUpdateSchema = professorSchema.partial().extend({
  employeeId: z.string().trim().min(1).optional(),
});

export const studentSchema = z.object({
  name: z.string().trim().min(1),
  rollNo: z.string().trim().min(1),
  phone: z.string().trim().optional(),
  parentName: z.string().trim().optional(),
  parentEmail: z.string().trim().email().optional().or(z.literal('')),
  parentPhone: z.string().trim().optional(),
  subject: z.string().trim().optional(),
  email: z.string().trim().email().optional().or(z.literal('')),
  courseId: z.string().optional(),
  semesterId: z.string().optional(),
  sectionId: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const studentUpdateSchema = studentSchema.partial().omit({ rollNo: true });

export const courseSchema = z.object({
  name: z.string().trim().min(1),
  code: z.string().trim().min(1),
  description: optionalText,
  isActive: z.boolean().optional(),
});

export const courseUpdateSchema = courseSchema.partial();

export const semesterSchema = z.object({
  courseId: z.string().trim().min(1),
  name: z.string().trim().min(1),
  number: z.number().int().min(1),
  isActive: z.boolean().optional(),
});

export const semesterUpdateSchema = semesterSchema.partial();

export const sectionSchema = z.object({
  courseId: z.string().trim().min(1),
  semesterId: z.string().trim().optional().nullable(),
  name: z.string().trim().min(1),
  code: z.string().trim().optional().nullable(),
  capacity: z.number().int().positive().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const sectionUpdateSchema = sectionSchema.partial();

export const subjectSchema = z.object({
  courseId: z.string().trim().min(1),
  semesterId: z.string().trim().optional().nullable(),
  name: z.string().trim().min(1),
  code: z.string().trim().min(1),
  credits: z.number().int().min(0).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const subjectUpdateSchema = subjectSchema.partial();

export const assignmentSchema = z.object({
  professorId: z.string().trim().optional(),
  teacherId: z.string().trim().optional(),
  professorProfileId: z.string().trim().optional().nullable(),
  courseId: z.string().trim().min(1),
  subjectId: z.string().trim().min(1),
  semesterId: z.string().trim().optional().nullable(),
  sectionId: z.string().trim().optional().nullable(),
  isActive: z.boolean().optional(),
}).transform((data) => ({ ...data, professorId: data.professorId ?? data.teacherId }));

export const assignmentUpdateSchema = assignmentSchema.partial();

export const holidaySchema = z.object({
  date: z.string().trim().min(1),
  name: z.string().trim().min(1).max(160),
  academicYear: z.string().trim().optional(),
  description: z.string().trim().max(500).optional().nullable(),
});

export const holidayUpdateSchema = holidaySchema.partial();

export const attendancePolicySchema = z.object({
  lockAfterHours: z.number().int().min(0).max(8760).optional(),
  workingDays: z.array(z.number().int().min(0).max(6)).min(1).max(7).optional(),
  adminOverrideEnabled: z.boolean().optional(),
});

export const reviewRequestSchema = z.object({
  adminNote: z.string().trim().max(1000).optional().nullable(),
});

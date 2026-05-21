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
  parentPhone: z.string().trim().optional(),
  subject: z.string().trim().optional(),
  email: z.string().trim().email().optional().or(z.literal('')),
  courseId: z.string().optional(),
  sectionId: z.string().optional(),
});

export const studentUpdateSchema = studentSchema.partial().omit({ rollNo: true });

export const courseSchema = z.object({
  name: z.string().trim().min(1),
  code: z.string().trim().min(1),
  description: optionalText,
});

export const courseUpdateSchema = courseSchema.partial();

export const semesterSchema = z.object({
  courseId: z.string().trim().min(1),
  name: z.string().trim().min(1),
  number: z.number().int().min(1),
});

export const semesterUpdateSchema = semesterSchema.partial();

export const sectionSchema = z.object({
  courseId: z.string().trim().min(1),
  semesterId: z.string().trim().optional().nullable(),
  name: z.string().trim().min(1),
});

export const sectionUpdateSchema = sectionSchema.partial();

export const subjectSchema = z.object({
  courseId: z.string().trim().min(1),
  semesterId: z.string().trim().optional().nullable(),
  name: z.string().trim().min(1),
  code: z.string().trim().min(1),
  credits: z.number().int().min(0).optional().nullable(),
});

export const subjectUpdateSchema = subjectSchema.partial();

export const assignmentSchema = z.object({
  professorId: z.string().trim().min(1),
  professorProfileId: z.string().trim().optional().nullable(),
  courseId: z.string().trim().min(1),
  subjectId: z.string().trim().min(1),
  semesterId: z.string().trim().optional().nullable(),
  sectionId: z.string().trim().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const assignmentUpdateSchema = assignmentSchema.partial();

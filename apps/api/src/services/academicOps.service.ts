import { Role } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';

interface Context { userId?: string; institutionId?: string | null; role?: Role }
const institution = (ctx: Context) => {
  if (!ctx.institutionId) throw new AppError('Institution context is required', StatusCodes.BAD_REQUEST);
  return ctx.institutionId;
};
const user = (ctx: Context) => {
  if (!ctx.userId) throw new AppError('Authentication required', StatusCodes.UNAUTHORIZED);
  return ctx.userId;
};
const clean = (value: unknown) => String(value ?? '').trim();
const nullable = (value: unknown) => clean(value) || null;
const intValue = (value: unknown, field: string) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) throw new AppError(`${field} must be an integer`, StatusCodes.BAD_REQUEST);
  return parsed;
};
const dateValue = (value: unknown, field: string) => {
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) throw new AppError(`${field} must be a valid date`, StatusCodes.BAD_REQUEST);
  return date;
};

const ensureCourse = async (institutionId: string, courseId: string) => {
  const course = await prisma.course.findFirst({ where: { id: courseId, institutionId, isActive: true } });
  if (!course) throw new AppError('Class not found', StatusCodes.NOT_FOUND);
  return course;
};
const ensureSection = async (institutionId: string, courseId: string, sectionId?: string | null) => {
  if (!sectionId) return null;
  const section = await prisma.section.findFirst({ where: { id: sectionId, institutionId, courseId, isActive: true } });
  if (!section) throw new AppError('Section not found for selected class', StatusCodes.NOT_FOUND);
  return section;
};
const ensureSubject = async (institutionId: string, courseId: string, subjectId: string) => {
  const subject = await prisma.subject.findFirst({ where: { id: subjectId, institutionId, courseId, isActive: true } });
  if (!subject) throw new AppError('Subject not found for selected class', StatusCodes.NOT_FOUND);
  return subject;
};
const ensureTeacher = async (institutionId: string, teacherId: string) => {
  const teacher = await prisma.user.findFirst({ where: { id: teacherId, institutionId, role: { in: [Role.TEACHER, Role.PROFESSOR] }, isActive: true } });
  if (!teacher) throw new AppError('Teacher not found', StatusCodes.NOT_FOUND);
  return teacher;
};

export const listOptions = async (ctx: Context) => {
  const institutionId = institution(ctx);
  const [courses, subjects, sections, teachers, staff] = await Promise.all([
    prisma.course.findMany({ where: { institutionId, isActive: true }, orderBy: { name: 'asc' } }),
    prisma.subject.findMany({ where: { institutionId, isActive: true }, orderBy: { name: 'asc' } }),
    prisma.section.findMany({ where: { institutionId, isActive: true }, orderBy: { name: 'asc' } }),
    prisma.user.findMany({ where: { institutionId, role: { in: [Role.TEACHER, Role.PROFESSOR] }, isActive: true }, select: { id: true, name: true, email: true, role: true }, orderBy: { name: 'asc' } }),
    prisma.staffProfile.findMany({ where: { institutionId, isActive: true }, include: { user: { select: { name: true, email: true } } }, orderBy: { employeeCode: 'asc' } }),
  ]);
  return { courses, subjects, sections, teachers, staff };
};

export const listExamTimetables = async (ctx: Context) => {
  const institutionId = institution(ctx);
  return prisma.examTimetable.findMany({ where: { institutionId }, include: { course: true, section: true, subject: true, invigilator: { select: { id: true, name: true, email: true } } }, orderBy: [{ examDate: 'asc' }, { startTime: 'asc' }] });
};
export const createExamTimetable = async (ctx: Context, body: Record<string, unknown>) => {
  const institutionId = institution(ctx);
  const courseId = clean(body.courseId); const sectionId = nullable(body.sectionId); const subjectId = clean(body.subjectId);
  await ensureCourse(institutionId, courseId); await ensureSection(institutionId, courseId, sectionId); await ensureSubject(institutionId, courseId, subjectId);
  const invigilatorId = nullable(body.invigilatorId); if (invigilatorId) await ensureTeacher(institutionId, invigilatorId);
  return prisma.examTimetable.create({ data: { institutionId, courseId, sectionId, subjectId, invigilatorId, examTitle: clean(body.examTitle) || 'Exam', examDate: dateValue(body.examDate, 'examDate'), startTime: clean(body.startTime), endTime: clean(body.endTime), room: nullable(body.room), academicYear: nullable(body.academicYear) }, include: { course: true, section: true, subject: true, invigilator: { select: { id: true, name: true, email: true } } } });
};
export const updateExamTimetable = async (ctx: Context, id: string, body: Record<string, unknown>) => {
  const institutionId = institution(ctx);
  const current = await prisma.examTimetable.findFirst({ where: { id, institutionId } });
  if (!current) throw new AppError('Exam timetable not found', StatusCodes.NOT_FOUND);
  const courseId = clean(body.courseId) || current.courseId; const sectionId = body.sectionId === undefined ? current.sectionId : nullable(body.sectionId); const subjectId = clean(body.subjectId) || current.subjectId;
  await ensureCourse(institutionId, courseId); await ensureSection(institutionId, courseId, sectionId); await ensureSubject(institutionId, courseId, subjectId);
  const invigilatorId = body.invigilatorId === undefined ? current.invigilatorId : nullable(body.invigilatorId); if (invigilatorId) await ensureTeacher(institutionId, invigilatorId);
  return prisma.examTimetable.update({ where: { id }, data: { courseId, sectionId, subjectId, invigilatorId, examTitle: body.examTitle === undefined ? current.examTitle : clean(body.examTitle), examDate: body.examDate === undefined ? current.examDate : dateValue(body.examDate, 'examDate'), startTime: body.startTime === undefined ? current.startTime : clean(body.startTime), endTime: body.endTime === undefined ? current.endTime : clean(body.endTime), room: body.room === undefined ? current.room : nullable(body.room), academicYear: body.academicYear === undefined ? current.academicYear : nullable(body.academicYear) } });
};
export const deleteExamTimetable = async (ctx: Context, id: string) => prisma.examTimetable.deleteMany({ where: { id, institutionId: institution(ctx) } });

export const listClassTimetables = async (ctx: Context) => prisma.classTimetable.findMany({ where: { institutionId: institution(ctx), isActive: true }, include: { course: true, section: true, subject: true, teacher: { select: { id: true, name: true, email: true } } }, orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] });
export const createClassTimetable = async (ctx: Context, body: Record<string, unknown>) => {
  const institutionId = institution(ctx);
  const courseId = clean(body.courseId); const sectionId = nullable(body.sectionId); const subjectId = clean(body.subjectId); const teacherId = clean(body.teacherId); const dayOfWeek = intValue(body.dayOfWeek, 'dayOfWeek'); const period = clean(body.period);
  await ensureCourse(institutionId, courseId); await ensureSection(institutionId, courseId, sectionId); await ensureSubject(institutionId, courseId, subjectId); await ensureTeacher(institutionId, teacherId);
  const existing = await prisma.classTimetable.findFirst({ where: { institutionId, teacherId, dayOfWeek, period, isActive: true } });
  if (existing) throw new AppError('Teacher already has a class during this period', StatusCodes.CONFLICT);
  return prisma.classTimetable.create({ data: { institutionId, courseId, sectionId, subjectId, teacherId, dayOfWeek, period, startTime: clean(body.startTime), endTime: clean(body.endTime), room: nullable(body.room) }, include: { course: true, section: true, subject: true, teacher: { select: { id: true, name: true, email: true } } } });
};
export const updateClassTimetable = async (ctx: Context, id: string, body: Record<string, unknown>) => {
  const institutionId = institution(ctx); const current = await prisma.classTimetable.findFirst({ where: { id, institutionId } });
  if (!current) throw new AppError('Class timetable not found', StatusCodes.NOT_FOUND);
  const data = { ...current, courseId: clean(body.courseId) || current.courseId, sectionId: body.sectionId === undefined ? current.sectionId : nullable(body.sectionId), subjectId: clean(body.subjectId) || current.subjectId, teacherId: clean(body.teacherId) || current.teacherId, dayOfWeek: body.dayOfWeek === undefined ? current.dayOfWeek : intValue(body.dayOfWeek, 'dayOfWeek'), period: body.period === undefined ? current.period : clean(body.period) };
  await ensureCourse(institutionId, data.courseId); await ensureSection(institutionId, data.courseId, data.sectionId); await ensureSubject(institutionId, data.courseId, data.subjectId); await ensureTeacher(institutionId, data.teacherId);
  const existing = await prisma.classTimetable.findFirst({ where: { institutionId, teacherId: data.teacherId, dayOfWeek: data.dayOfWeek, period: data.period, isActive: true, NOT: { id } } });
  if (existing) throw new AppError('Teacher already has a class during this period', StatusCodes.CONFLICT);
  return prisma.classTimetable.update({ where: { id }, data: { courseId: data.courseId, sectionId: data.sectionId, subjectId: data.subjectId, teacherId: data.teacherId, dayOfWeek: data.dayOfWeek, period: data.period, startTime: body.startTime === undefined ? current.startTime : clean(body.startTime), endTime: body.endTime === undefined ? current.endTime : clean(body.endTime), room: body.room === undefined ? current.room : nullable(body.room), isActive: body.isActive === undefined ? current.isActive : Boolean(body.isActive) } });
};
export const deleteClassTimetable = async (ctx: Context, id: string) => prisma.classTimetable.updateMany({ where: { id, institutionId: institution(ctx) }, data: { isActive: false } });

export const listNotices = async (ctx: Context) => prisma.notice.findMany({ where: { institutionId: institution(ctx), isActive: true }, orderBy: { createdAt: 'desc' } });
export const createNotice = async (ctx: Context, body: Record<string, unknown>) => prisma.notice.create({ data: { institutionId: institution(ctx), title: clean(body.title), message: clean(body.message), targetRole: nullable(body.targetRole), courseId: nullable(body.courseId), sectionId: nullable(body.sectionId), expiresAt: body.expiresAt ? dateValue(body.expiresAt, 'expiresAt') : null, publishedById: user(ctx) } });
export const updateNotice = async (ctx: Context, id: string, body: Record<string, unknown>) => prisma.notice.update({ where: { id }, data: { title: body.title === undefined ? undefined : clean(body.title), message: body.message === undefined ? undefined : clean(body.message), targetRole: body.targetRole === undefined ? undefined : nullable(body.targetRole), courseId: body.courseId === undefined ? undefined : nullable(body.courseId), sectionId: body.sectionId === undefined ? undefined : nullable(body.sectionId), expiresAt: body.expiresAt === undefined ? undefined : (body.expiresAt ? dateValue(body.expiresAt, 'expiresAt') : null) } });
export const deleteNotice = async (ctx: Context, id: string) => prisma.notice.updateMany({ where: { id, institutionId: institution(ctx) }, data: { isActive: false } });

export const listResources = async (ctx: Context) => prisma.academicResource.findMany({ where: { institutionId: institution(ctx), isActive: true }, include: { course: true, section: true, subject: true, uploadedBy: { select: { name: true, email: true } } }, orderBy: { createdAt: 'desc' } });
export const createResource = async (ctx: Context, body: Record<string, unknown>) => {
  const institutionId = institution(ctx); const courseId = clean(body.courseId); const subjectId = clean(body.subjectId); const sectionId = nullable(body.sectionId);
  await ensureCourse(institutionId, courseId); await ensureSection(institutionId, courseId, sectionId); await ensureSubject(institutionId, courseId, subjectId);
  if (![Role.ADMIN, Role.SUPER_ADMIN, Role.HOD].includes(ctx.role as Role)) {
    const assigned = await prisma.professorSubjectAssignment.findFirst({ where: { professorId: user(ctx), courseId, subjectId, sectionId: sectionId ?? undefined, isActive: true } });
    if (!assigned) throw new AppError('Teachers can upload resources only for assigned class/subject', StatusCodes.FORBIDDEN);
  }
  const resourceUrl = clean(body.resourceUrl); if (!/^https?:\/\//i.test(resourceUrl)) throw new AppError('Resource URL must be a valid HTTP/HTTPS link', StatusCodes.BAD_REQUEST);
  return prisma.academicResource.create({ data: { institutionId, courseId, sectionId, subjectId, uploadedById: user(ctx), title: clean(body.title), description: nullable(body.description), resourceType: clean(body.resourceType) || 'PDF', resourceUrl } });
};
export const deleteResource = async (ctx: Context, id: string) => prisma.academicResource.updateMany({ where: { id, institutionId: institution(ctx) }, data: { isActive: false } });

export const listLabs = async (ctx: Context) => prisma.lab.findMany({ where: { institutionId: institution(ctx), isActive: true }, include: { inCharge: { include: { user: { select: { name: true, email: true } } } }, timetables: true }, orderBy: { name: 'asc' } });
export const createLab = async (ctx: Context, body: Record<string, unknown>) => {
  const institutionId = institution(ctx); const inChargeId = nullable(body.inChargeId);
  if (inChargeId) {
    const staff = await prisma.staffProfile.findFirst({ where: { id: inChargeId, institutionId, isActive: true } });
    if (!staff) throw new AppError('Lab in-charge staff member not found', StatusCodes.NOT_FOUND);
  }
  return prisma.lab.create({ data: { institutionId, name: clean(body.name), code: clean(body.code), location: nullable(body.location), capacity: body.capacity ? intValue(body.capacity, 'capacity') : null, inChargeId } });
};
export const updateLab = async (ctx: Context, id: string, body: Record<string, unknown>) => prisma.lab.update({ where: { id }, data: { name: body.name === undefined ? undefined : clean(body.name), code: body.code === undefined ? undefined : clean(body.code), location: body.location === undefined ? undefined : nullable(body.location), capacity: body.capacity === undefined ? undefined : (body.capacity ? intValue(body.capacity, 'capacity') : null), inChargeId: body.inChargeId === undefined ? undefined : nullable(body.inChargeId) } });
export const deleteLab = async (ctx: Context, id: string) => prisma.lab.updateMany({ where: { id, institutionId: institution(ctx) }, data: { isActive: false } });

export const listLabTimetables = async (ctx: Context) => prisma.labTimetable.findMany({ where: { institutionId: institution(ctx) }, include: { lab: true, course: true, section: true, subject: true }, orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] });
export const createLabTimetable = async (ctx: Context, body: Record<string, unknown>) => {
  const institutionId = institution(ctx); const labId = clean(body.labId); const courseId = clean(body.courseId); const sectionId = nullable(body.sectionId); const subjectId = nullable(body.subjectId);
  const lab = await prisma.lab.findFirst({ where: { id: labId, institutionId, isActive: true } }); if (!lab) throw new AppError('Lab not found', StatusCodes.NOT_FOUND);
  await ensureCourse(institutionId, courseId); await ensureSection(institutionId, courseId, sectionId); if (subjectId) await ensureSubject(institutionId, courseId, subjectId);
  return prisma.labTimetable.create({ data: { institutionId, labId, courseId, sectionId, subjectId, dayOfWeek: intValue(body.dayOfWeek, 'dayOfWeek'), startTime: clean(body.startTime), endTime: clean(body.endTime) } });
};
export const deleteLabTimetable = async (ctx: Context, id: string) => prisma.labTimetable.deleteMany({ where: { id, institutionId: institution(ctx) } });

export const portalAcademicFeed = async (ctx: Context) => {
  const institutionId = institution(ctx);
  const today = new Date();
  let courseIds: string[] = [];
  let sectionIds: string[] = [];
  if (ctx.role === Role.STUDENT) {
    const student = await prisma.student.findFirst({ where: { portalUserId: user(ctx), institutionId }, select: { courseId: true, sectionId: true } });
    if (student) { courseIds = [student.courseId]; sectionIds = [student.sectionId]; }
  }
  if (ctx.role === Role.PARENT) {
    const parent = await prisma.parentProfile.findFirst({ where: { userId: user(ctx), institutionId }, include: { children: { include: { student: { select: { courseId: true, sectionId: true } } } } } });
    courseIds = [...new Set(parent?.children.map((child) => child.student.courseId) ?? [])];
    sectionIds = [...new Set(parent?.children.map((child) => child.student.sectionId) ?? [])];
    if (!courseIds.length) return { exams: [], timetable: [], notices: [], resources: [] };
  }
  const teacherScoped = ctx.role === Role.TEACHER || ctx.role === Role.PROFESSOR;
  const scoped = courseIds.length ? { courseId: { in: courseIds } } : {};
  const sectionScoped = sectionIds.length ? { OR: [{ sectionId: { in: sectionIds } }, { sectionId: null }] } : {};
  return {
    exams: await prisma.examTimetable.findMany({ where: { institutionId, examDate: { gte: today }, ...scoped, ...sectionScoped, ...(teacherScoped ? { invigilatorId: user(ctx) } : {}) }, include: { subject: true, course: true, section: true }, orderBy: { examDate: 'asc' }, take: 20 }),
    timetable: await prisma.classTimetable.findMany({ where: { institutionId, isActive: true, ...scoped, ...sectionScoped, ...(teacherScoped ? { teacherId: user(ctx) } : {}) }, include: { subject: true, course: true, section: true, teacher: { select: { name: true } } }, orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] }),
    notices: await prisma.notice.findMany({ where: { institutionId, isActive: true, OR: [{ targetRole: null }, { targetRole: ctx.role }, ...(courseIds.length ? [{ courseId: { in: courseIds } }] : []), ...(sectionIds.length ? [{ sectionId: { in: sectionIds } }] : [])], AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gte: today } }] }] }, orderBy: { createdAt: 'desc' }, take: 20 }),
    resources: await prisma.academicResource.findMany({ where: { institutionId, isActive: true, ...scoped, ...sectionScoped, ...(teacherScoped ? { uploadedById: user(ctx) } : {}) }, include: { subject: true, course: true, section: true }, orderBy: { createdAt: 'desc' }, take: 20 }),
  };
};

export const dashboardSummary = async (ctx: Context) => {
  const institutionId = institution(ctx); const today = new Date(); const dayOfWeek = today.getDay();
  const [upcomingExams, todayTimetable, latestNotices, sharedResourcesCount] = await Promise.all([
    prisma.examTimetable.count({ where: { institutionId, examDate: { gte: today } } }),
    prisma.classTimetable.count({ where: { institutionId, dayOfWeek, isActive: true } }),
    prisma.notice.count({ where: { institutionId, isActive: true, OR: [{ expiresAt: null }, { expiresAt: { gte: today } }] } }),
    prisma.academicResource.count({ where: { institutionId, isActive: true } }),
  ]);
  return { upcomingExams, todayTimetable, latestNotices, sharedResourcesCount };
};

import { Prisma, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { StatusCodes } from 'http-status-codes';
import { randomBytes } from 'node:crypto';
import { prisma } from '../config/prisma.js';
import { requireInstitutionId, ensureDefaultAcademicScope, ensureSubject } from './adminContext.service.js';
import { writeAuditLog } from './audit.service.js';
import { AppError } from '../utils/AppError.js';
import { getPagination, toPaginatedResponse } from '../utils/pagination.js';

interface AdminContext {
  userId?: string;
  institutionId?: string | null;
}

const createTemporaryPassword = () => randomBytes(18).toString('base64url');

const professorSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  professorProfile: true,
} as const;

const toProfessorDto = (user: Prisma.UserGetPayload<{ select: typeof professorSelect }>) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.isActive ? 'Active' : 'Inactive',
  employeeId: user.professorProfile?.employeeCode ?? '',
  subject: '',
  department: user.professorProfile?.department ?? '',
  phone: user.professorProfile?.phone ?? '',
});

const toStudentDto = (student: Prisma.StudentGetPayload<{ include: { course: true; section: true } }>) => ({
  id: student.id,
  name: student.name,
  rollNo: student.rollNumber,
  phone: student.phone ?? '',
  parentPhone: student.parentPhone ?? '',
  subject: student.course.name,
  attendancePercentage: 0,
  courseId: student.courseId,
  sectionId: student.sectionId,
  section: student.section.name,
});

export const getDashboard = async (context: AdminContext) => {
  const institutionId = requireInstitutionId(context.institutionId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [totalStudents, presentToday, absentToday, students, recentSessions] = await Promise.all([
    prisma.student.count({ where: { institutionId, isActive: true } }),
    prisma.attendanceRecord.count({
      where: { status: 'PRESENT', session: { institutionId, sessionDate: { gte: today, lt: tomorrow } } },
    }),
    prisma.attendanceRecord.count({
      where: { status: 'ABSENT', session: { institutionId, sessionDate: { gte: today, lt: tomorrow } } },
    }),
    prisma.student.findMany({
      where: { institutionId, isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.attendanceSession.findMany({
      where: { institutionId },
      include: { subject: true, professor: true, records: true },
      orderBy: { sessionDate: 'desc' },
      take: 5,
    }),
  ]);

  return {
    totalStudents,
    presentToday,
    absentToday,
    below75Count: 0,
    chartData: students.map((student) => ({ name: student.name, percentage: 0 })),
    atRiskStudents: [],
    recentActivity: recentSessions.map((session) => ({
      date: session.sessionDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      subject: session.subject.name,
      professor: session.professor.name,
      present: session.records.filter((record) => record.status === 'PRESENT').length,
      absent: session.records.filter((record) => record.status === 'ABSENT').length,
    })),
  };
};

export const listProfessors = async (context: AdminContext, query: unknown) => {
  const institutionId = requireInstitutionId(context.institutionId);
  const { page, pageSize, search, skip, take } = getPagination(query);
  const where: Prisma.UserWhereInput = {
    institutionId,
    role: Role.PROFESSOR,
    ...(search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { professorProfile: { employeeCode: { contains: search, mode: 'insensitive' } } },
      ],
    } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.user.findMany({ where, select: professorSelect, skip, take, orderBy: { createdAt: 'desc' } }),
    prisma.user.count({ where }),
  ]);
  return toPaginatedResponse(items.map(toProfessorDto), total, page, pageSize);
};

export const createProfessor = async (context: AdminContext, data: any) => {
  const institutionId = requireInstitutionId(context.institutionId);
  const passwordHash = await bcrypt.hash(data.password ?? createTemporaryPassword(), 12);
  const professor = await prisma.user.create({
    data: {
      institutionId,
      name: data.name,
      email: data.email,
      passwordHash,
      role: Role.PROFESSOR,
      isActive: data.isActive ?? true,
      professorProfile: {
        create: {
          institutionId,
          employeeCode: data.employeeId,
          department: data.department,
          designation: data.designation ?? 'Professor',
          phone: data.phone,
        },
      },
    },
    select: professorSelect,
  });
  await writeAuditLog({ actorId: context.userId, institutionId, action: 'CREATE', entityType: 'Professor', entityId: professor.id, metadata: data });
  return toProfessorDto(professor);
};

export const updateProfessor = async (context: AdminContext, id: string, data: any) => {
  const institutionId = requireInstitutionId(context.institutionId);
  const professor = await prisma.user.update({
    where: { id },
    data: {
      name: data.name,
      email: data.email,
      isActive: data.isActive,
      professorProfile: {
        upsert: {
          create: {
            institutionId,
            employeeCode: data.employeeId ?? `EMP-${Date.now()}`,
            department: data.department,
            designation: data.designation ?? 'Professor',
            phone: data.phone,
          },
          update: {
            employeeCode: data.employeeId,
            department: data.department,
            designation: data.designation,
            phone: data.phone,
          },
        },
      },
    },
    select: professorSelect,
  });
  await writeAuditLog({ actorId: context.userId, institutionId, action: 'UPDATE', entityType: 'Professor', entityId: id, metadata: data });
  return toProfessorDto(professor);
};

export const deleteProfessor = async (context: AdminContext, id: string) => {
  const institutionId = requireInstitutionId(context.institutionId);
  await prisma.user.update({ where: { id }, data: { isActive: false } });
  await writeAuditLog({ actorId: context.userId, institutionId, action: 'DELETE', entityType: 'Professor', entityId: id });
};

export const listStudents = async (context: AdminContext, query: unknown) => {
  const institutionId = requireInstitutionId(context.institutionId);
  const { page, pageSize, search, skip, take } = getPagination(query);
  const where: Prisma.StudentWhereInput = {
    institutionId,
    isActive: true,
    ...(search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { rollNumber: { contains: search, mode: 'insensitive' } },
      ],
    } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.student.findMany({ where, include: { course: true, section: true }, skip, take, orderBy: { createdAt: 'desc' } }),
    prisma.student.count({ where }),
  ]);
  return toPaginatedResponse(items.map(toStudentDto), total, page, pageSize);
};

export const createStudent = async (context: AdminContext, data: any) => {
  const institutionId = requireInstitutionId(context.institutionId);
  const scope = await ensureDefaultAcademicScope(institutionId);
  if (data.subject) await ensureSubject(institutionId, scope.course.id, scope.semester.id, data.subject);
  const exists = await prisma.student.findUnique({
    where: { institutionId_courseId_sectionId_rollNumber: { institutionId, courseId: data.courseId ?? scope.course.id, sectionId: data.sectionId ?? scope.section.id, rollNumber: data.rollNo } },
  });
  if (exists) throw new AppError('Roll number already exists for this class and section', StatusCodes.CONFLICT);
  const student = await prisma.student.create({
    data: {
      institutionId,
      courseId: data.courseId ?? scope.course.id,
      sectionId: data.sectionId ?? scope.section.id,
      name: data.name,
      rollNumber: data.rollNo,
      email: data.email || null,
      phone: data.phone,
      parentPhone: data.parentPhone,
    },
    include: { course: true, section: true },
  });
  await writeAuditLog({ actorId: context.userId, institutionId, action: 'CREATE', entityType: 'Student', entityId: student.id, metadata: data });
  return toStudentDto(student);
};

export const updateStudent = async (context: AdminContext, id: string, data: any) => {
  const institutionId = requireInstitutionId(context.institutionId);
  const student = await prisma.student.update({
    where: { id },
    data: {
      name: data.name,
      email: data.email || undefined,
      phone: data.phone,
      parentPhone: data.parentPhone,
      courseId: data.courseId,
      sectionId: data.sectionId,
    },
    include: { course: true, section: true },
  });
  await writeAuditLog({ actorId: context.userId, institutionId, action: 'UPDATE', entityType: 'Student', entityId: id, metadata: data });
  return toStudentDto(student);
};

export const deleteStudent = async (context: AdminContext, id: string) => {
  const institutionId = requireInstitutionId(context.institutionId);
  await prisma.student.update({ where: { id }, data: { isActive: false } });
  await writeAuditLog({ actorId: context.userId, institutionId, action: 'DELETE', entityType: 'Student', entityId: id });
};

type ModelName = 'course' | 'semester' | 'section' | 'subject' | 'professorSubjectAssignment';

const modelMap = {
  course: prisma.course,
  semester: prisma.semester,
  section: prisma.section,
  subject: prisma.subject,
  professorSubjectAssignment: prisma.professorSubjectAssignment,
} as const;

export const listModel = async (context: AdminContext, modelName: ModelName, query: unknown) => {
  const institutionId = requireInstitutionId(context.institutionId);
  const { page, pageSize, search, skip, take } = getPagination(query);
  const model = modelMap[modelName] as any;
  const params = query as Record<string, string | undefined>;
  const where = (() => {
    if (modelName === 'professorSubjectAssignment') {
      return {
        course: { institutionId },
        ...(params.professorId ? { professorId: params.professorId } : {}),
        ...(params.courseId ? { courseId: params.courseId } : {}),
        ...(params.subjectId ? { subjectId: params.subjectId } : {}),
        ...(params.semesterId ? { semesterId: params.semesterId } : {}),
        ...(params.sectionId ? { sectionId: params.sectionId } : {}),
      };
    }
    if (modelName === 'subject') {
      return {
        institutionId,
        ...(params.courseId ? { courseId: params.courseId } : {}),
        ...(params.semesterId ? { semesterId: params.semesterId } : {}),
        ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { code: { contains: search, mode: 'insensitive' } }] } : {}),
      };
    }
    if (modelName === 'semester' || modelName === 'section') {
      return {
        institutionId,
        ...(params.courseId ? { courseId: params.courseId } : {}),
        ...(params.semesterId ? { semesterId: params.semesterId } : {}),
        ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
      };
    }
    return {
      institutionId,
      ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { code: { contains: search, mode: 'insensitive' } }] } : {}),
    };
  })();
  const include = modelName === 'professorSubjectAssignment'
    ? { professor: { select: { id: true, name: true, email: true } }, course: true, subject: true, semester: true, section: true }
    : modelName === 'subject'
      ? { course: true, semester: true }
      : modelName === 'semester'
        ? { course: true }
        : modelName === 'section'
          ? { course: true, semester: true }
          : undefined;
  const [items, total] = await Promise.all([
    model.findMany({ where, ...(include ? { include } : {}), skip, take, orderBy: { createdAt: 'desc' } }),
    model.count({ where }),
  ]);
  return toPaginatedResponse(items, total, page, pageSize);
};

export const createModel = async (context: AdminContext, modelName: ModelName, data: any) => {
  const institutionId = requireInstitutionId(context.institutionId);
  const model = modelMap[modelName] as any;
  const item = await model.create({ data: modelName === 'professorSubjectAssignment' ? data : { ...data, institutionId } });
  await writeAuditLog({ actorId: context.userId, institutionId, action: 'CREATE', entityType: modelName, entityId: item.id, metadata: data });
  return item;
};

export const updateModel = async (context: AdminContext, modelName: ModelName, id: string, data: any) => {
  const institutionId = requireInstitutionId(context.institutionId);
  const model = modelMap[modelName] as any;
  const item = await model.update({ where: { id }, data });
  await writeAuditLog({ actorId: context.userId, institutionId, action: 'UPDATE', entityType: modelName, entityId: id, metadata: data });
  return item;
};

export const deleteModel = async (context: AdminContext, modelName: ModelName, id: string) => {
  const institutionId = requireInstitutionId(context.institutionId);
  const model = modelMap[modelName] as any;
  await model.delete({ where: { id } });
  await writeAuditLog({ actorId: context.userId, institutionId, action: 'DELETE', entityType: modelName, entityId: id });
};

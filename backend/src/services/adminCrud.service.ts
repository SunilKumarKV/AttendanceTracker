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
  _count: { select: { professorAssignments: true } },
} as const;

const teacherRoles = [Role.TEACHER, Role.PROFESSOR];

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
  assignedCount: user._count.professorAssignments,
});

const toStudentDto = (student: Prisma.StudentGetPayload<{ include: { course: true; section: { include: { semester: true } } } }>) => ({
  id: student.id,
  name: student.name,
  rollNo: student.rollNumber,
  email: student.email ?? '',
  phone: student.phone ?? '',
  parentPhone: student.parentPhone ?? '',
  subject: student.course.name,
  attendancePercentage: 0,
  courseId: student.courseId,
  sectionId: student.sectionId,
  semesterId: student.section.semesterId ?? undefined,
  section: student.section.name,
  isActive: student.isActive,
});

export const getDashboard = async (context: AdminContext) => {
  const institutionId = requireInstitutionId(context.institutionId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [totalStudents, presentToday, absentToday, students, recentSessions, setupCounts, institution] = await Promise.all([
    prisma.student.count({ where: { institutionId, isActive: true } }),
    prisma.attendanceRecord.count({
      where: { status: 'PRESENT', session: { institutionId, sessionDate: { gte: today, lt: tomorrow } } },
    }),
    prisma.attendanceRecord.count({
      where: { status: 'ABSENT', session: { institutionId, sessionDate: { gte: today, lt: tomorrow } } },
    }),
    prisma.student.findMany({
      where: { institutionId, isActive: true },
      include: { attendanceRecords: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.attendanceSession.findMany({
      where: { institutionId },
      include: { subject: true, professor: true, records: true },
      orderBy: { sessionDate: 'desc' },
      take: 5,
    }),
    Promise.all([
      prisma.course.count({ where: { institutionId, isActive: true } }),
      prisma.semester.count({ where: { institutionId, isActive: true } }),
      prisma.section.count({ where: { institutionId, isActive: true } }),
      prisma.subject.count({ where: { institutionId, isActive: true } }),
      prisma.user.count({ where: { institutionId, role: { in: teacherRoles }, isActive: true } }),
      prisma.student.count({ where: { institutionId, isActive: true } }),
      prisma.professorSubjectAssignment.count({ where: { course: { institutionId }, isActive: true } }),
    ]),
    prisma.institution.findUnique({ where: { id: institutionId } }),
  ]);

  const studentChartData = students.map((student) => {
    const total = student.attendanceRecords.length;
    const present = student.attendanceRecords.filter((record) => record.status === 'PRESENT').length;
    const percentage = total === 0 ? 0 : Number(((present / total) * 100).toFixed(1));
    return {
      id: student.id,
      name: student.name,
      rollNo: student.rollNumber,
      phone: student.phone ?? '',
      attendancePercentage: percentage,
      percentage,
      total,
    };
  });
  const atRiskStudents = studentChartData.filter((student) => student.total > 0 && student.percentage < 75);

  return {
    totalStudents,
    presentToday,
    absentToday,
    below75Count: atRiskStudents.length,
    chartData: studentChartData.map((student) => ({ name: student.name, percentage: student.percentage })),
    atRiskStudents,
    recentActivity: recentSessions.map((session) => ({
      date: session.sessionDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      subject: session.subject.name,
      professor: session.professor.name,
      present: session.records.filter((record) => record.status === 'PRESENT').length,
      absent: session.records.filter((record) => record.status === 'ABSENT').length,
    })),
    setupChecklist: {
      institutionProfileCompleted: Boolean(institution?.name),
      classes: setupCounts[0],
      semesters: setupCounts[1],
      sections: setupCounts[2],
      subjects: setupCounts[3],
      professors: setupCounts[4],
      students: setupCounts[5],
      assignments: setupCounts[6],
    },
  };
};

export const listProfessors = async (context: AdminContext, query: unknown) => {
  const institutionId = requireInstitutionId(context.institutionId);
  const { page, pageSize, search, skip, take } = getPagination(query);
  const where: Prisma.UserWhereInput = {
    institutionId,
    role: { in: teacherRoles },
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
      role: Role.TEACHER,
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
    prisma.student.findMany({ where, include: { course: true, section: { include: { semester: true } } }, skip, take, orderBy: { createdAt: 'desc' } }),
    prisma.student.count({ where }),
  ]);
  return toPaginatedResponse(items.map(toStudentDto), total, page, pageSize);
};

export const createStudent = async (context: AdminContext, data: any) => {
  const institutionId = requireInstitutionId(context.institutionId);
  const scope = await ensureDefaultAcademicScope(institutionId);
  if (data.sectionId && data.courseId) {
    const section = await prisma.section.findFirst({ where: { id: data.sectionId, courseId: data.courseId, ...(data.semesterId ? { semesterId: data.semesterId } : {}) } });
    if (!section) throw new AppError('Section does not belong to the selected class and semester', StatusCodes.BAD_REQUEST);
  }
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
      isActive: data.isActive ?? true,
    },
    include: { course: true, section: { include: { semester: true } } },
  });
  await writeAuditLog({ actorId: context.userId, institutionId, action: 'CREATE', entityType: 'Student', entityId: student.id, metadata: data });
  return toStudentDto(student);
};

export const updateStudent = async (context: AdminContext, id: string, data: any) => {
  const institutionId = requireInstitutionId(context.institutionId);
  if (data.sectionId && data.courseId) {
    const section = await prisma.section.findFirst({ where: { id: data.sectionId, courseId: data.courseId, ...(data.semesterId ? { semesterId: data.semesterId } : {}) } });
    if (!section) throw new AppError('Section does not belong to the selected class and semester', StatusCodes.BAD_REQUEST);
  }
  const student = await prisma.student.update({
    where: { id },
    data: {
      name: data.name,
      email: data.email || undefined,
      phone: data.phone,
      parentPhone: data.parentPhone,
      courseId: data.courseId,
      sectionId: data.sectionId,
      isActive: data.isActive,
    },
    include: { course: true, section: { include: { semester: true } } },
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
        ...(search ? { OR: [
          { professor: { name: { contains: search, mode: 'insensitive' } } },
          { subject: { name: { contains: search, mode: 'insensitive' } } },
          { course: { name: { contains: search, mode: 'insensitive' } } },
        ] } : {}),
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
        : modelName === 'course'
          ? { _count: { select: { semesters: true, sections: true, subjects: true, students: true, professorAssignments: true } } }
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
  await validateModelRelations(institutionId, modelName, data);
  const item = await model.create({ data: modelName === 'professorSubjectAssignment' ? data : { ...data, institutionId } });
  await writeAuditLog({ actorId: context.userId, institutionId, action: 'CREATE', entityType: modelName, entityId: item.id, metadata: data });
  return item;
};

export const updateModel = async (context: AdminContext, modelName: ModelName, id: string, data: any) => {
  const institutionId = requireInstitutionId(context.institutionId);
  const model = modelMap[modelName] as any;
  await validateModelRelations(institutionId, modelName, data, id);
  const item = await model.update({ where: { id }, data });
  await writeAuditLog({ actorId: context.userId, institutionId, action: 'UPDATE', entityType: modelName, entityId: id, metadata: data });
  return item;
};

export const deleteModel = async (context: AdminContext, modelName: ModelName, id: string) => {
  const institutionId = requireInstitutionId(context.institutionId);
  const model = modelMap[modelName] as any;
  if (['course', 'semester', 'section', 'subject', 'professorSubjectAssignment'].includes(modelName)) {
    await model.update({ where: { id }, data: { isActive: false } });
  } else {
    await model.delete({ where: { id } });
  }
  await writeAuditLog({ actorId: context.userId, institutionId, action: 'DELETE', entityType: modelName, entityId: id });
};

const validateModelRelations = async (institutionId: string, modelName: ModelName, data: any, id?: string) => {
  if (modelName === 'semester') {
    const duplicate = await prisma.semester.findFirst({ where: { courseId: data.courseId, number: data.number, ...(id ? { NOT: { id } } : {}) } });
    if (duplicate) throw new AppError('Semester number already exists inside this class', StatusCodes.CONFLICT);
  }
  if (modelName === 'section') {
    if (data.semesterId) {
      const semester = await prisma.semester.findFirst({ where: { id: data.semesterId, courseId: data.courseId, institutionId } });
      if (!semester) throw new AppError('Semester does not belong to the selected class', StatusCodes.BAD_REQUEST);
    }
    const duplicate = await prisma.section.findFirst({ where: { courseId: data.courseId, semesterId: data.semesterId ?? null, OR: [{ name: data.name }, ...(data.code ? [{ code: data.code }] : [])], ...(id ? { NOT: { id } } : {}) } });
    if (duplicate) throw new AppError('Section name or code already exists inside this class and semester', StatusCodes.CONFLICT);
  }
  if (modelName === 'subject') {
    if (data.semesterId) {
      const semester = await prisma.semester.findFirst({ where: { id: data.semesterId, courseId: data.courseId, institutionId } });
      if (!semester) throw new AppError('Semester does not belong to the selected class', StatusCodes.BAD_REQUEST);
    }
    const duplicate = await prisma.subject.findFirst({ where: { institutionId, courseId: data.courseId, code: data.code, ...(id ? { NOT: { id } } : {}) } });
    if (duplicate) throw new AppError('Subject code already exists inside this class', StatusCodes.CONFLICT);
  }
  if (modelName === 'professorSubjectAssignment') {
    const [professor, semester, section, subject] = await Promise.all([
      prisma.user.findFirst({ where: { id: data.professorId, institutionId, role: { in: teacherRoles }, isActive: true } }),
      prisma.semester.findFirst({ where: { id: data.semesterId, courseId: data.courseId, institutionId } }),
      prisma.section.findFirst({ where: { id: data.sectionId, courseId: data.courseId, semesterId: data.semesterId, institutionId } }),
      prisma.subject.findFirst({ where: { id: data.subjectId, courseId: data.courseId, semesterId: data.semesterId, institutionId } }),
    ]);
    if (!professor) throw new AppError('Professor is required and must be active', StatusCodes.BAD_REQUEST);
    if (!semester) throw new AppError('Semester must belong to the selected class', StatusCodes.BAD_REQUEST);
    if (!section) throw new AppError('Section must belong to the selected class and semester', StatusCodes.BAD_REQUEST);
    if (!subject) throw new AppError('Subject must belong to the selected class and semester', StatusCodes.BAD_REQUEST);
    const duplicate = await prisma.professorSubjectAssignment.findFirst({ where: { professorId: data.professorId, courseId: data.courseId, semesterId: data.semesterId, sectionId: data.sectionId, subjectId: data.subjectId, ...(id ? { NOT: { id } } : {}) } });
    if (duplicate) throw new AppError('This professor assignment already exists', StatusCodes.CONFLICT);
  }
};

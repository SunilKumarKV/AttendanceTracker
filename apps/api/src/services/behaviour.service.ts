import { BehaviourRecordType, BehaviourTone, DisciplineSeverity, Role } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { toCsv, toSimplePdf } from '../utils/reportExport.js';
import { writeAuditLog } from './audit.service.js';

type Context = { userId?: string; institutionId?: string | null; role?: Role; ipAddress?: string; userAgent?: string };

type ExportFormat = 'csv' | 'excel' | 'pdf';

const requireContext = (context: Context) => {
  if (!context.userId) throw new AppError('Authentication required', StatusCodes.UNAUTHORIZED);
  if (!context.institutionId) throw new AppError('Institution context is required', StatusCodes.BAD_REQUEST);
  return { userId: context.userId, institutionId: context.institutionId, role: context.role };
};

const isAdminRole = (role?: Role) => role === Role.ADMIN || role === Role.SUPER_ADMIN || role === Role.HOD;
const isTeacherRole = (role?: Role) => role === Role.TEACHER || role === Role.PROFESSOR;

const clean = (value: unknown) => String(value ?? '').trim();
const optional = (value: unknown) => clean(value) || null;
const bool = (value: unknown) => value === true || value === 'true' || value === '1';

const parseDate = (value: unknown, field: string) => {
  const date = value ? new Date(String(value)) : new Date();
  if (Number.isNaN(date.getTime())) throw new AppError(`${field} must be a valid date`, StatusCodes.BAD_REQUEST);
  return date;
};

const parseEnum = <T extends string>(value: unknown, allowed: readonly T[], field: string, fallback?: T): T => {
  const text = clean(value).toUpperCase() as T;
  if (!text && fallback) return fallback;
  if (!allowed.includes(text)) throw new AppError(`${field} is invalid`, StatusCodes.BAD_REQUEST);
  return text;
};

const ensureTeacherCanAccessStudent = async (context: Context, studentId: string) => {
  const { userId, institutionId, role } = requireContext(context);
  const student = await prisma.student.findFirst({ where: { id: studentId, institutionId, isActive: true }, include: { course: true, section: true } });
  if (!student) throw new AppError('Student not found', StatusCodes.NOT_FOUND);
  if (isAdminRole(role)) return student;
  if (!isTeacherRole(role)) throw new AppError('Insufficient permissions', StatusCodes.FORBIDDEN);
  const assigned = await prisma.professorSubjectAssignment.findFirst({
    where: {
      professorId: userId,
      courseId: student.courseId,
      isActive: true,
      OR: [{ sectionId: student.sectionId }, { sectionId: null }],
    },
  });
  if (!assigned) throw new AppError('This student is not assigned to you', StatusCodes.FORBIDDEN);
  return student;
};

const visibleWhereForContext = async (context: Context) => {
  const { userId, institutionId, role } = requireContext(context);
  if (isAdminRole(role)) return { institutionId };
  if (isTeacherRole(role)) {
    const assignments = await prisma.professorSubjectAssignment.findMany({
      where: { professorId: userId, isActive: true },
      select: { courseId: true, sectionId: true },
    });
    if (!assignments.length) return { institutionId, id: '__none__' };
    return {
      institutionId,
      student: {
        OR: assignments.map((assignment) => ({
          courseId: assignment.courseId,
          ...(assignment.sectionId ? { sectionId: assignment.sectionId } : {}),
        })),
      },
    };
  }
  if (role === Role.STUDENT) {
    const student = await prisma.student.findFirst({ where: { institutionId, portalUserId: userId, isActive: true }, select: { id: true } });
    return { institutionId, studentId: student?.id ?? '__none__', isApproved: true, isAdminOnly: false };
  }
  if (role === Role.PARENT) {
    const parent = await prisma.parentProfile.findFirst({ where: { institutionId, userId }, include: { children: true } });
    const studentIds = parent?.children.map((child) => child.studentId) ?? [];
    return { institutionId, studentId: { in: studentIds.length ? studentIds : ['__none__'] }, isApproved: true, isAdminOnly: false };
  }
  throw new AppError('Insufficient permissions', StatusCodes.FORBIDDEN);
};

const includeRecord = {
  student: { include: { course: true, section: true } },
  createdBy: { select: { id: true, name: true, email: true, role: true } },
  approvedBy: { select: { id: true, name: true, email: true } },
};

const toDto = (record: any) => ({
  id: record.id,
  studentId: record.studentId,
  studentName: record.student?.name,
  rollNumber: record.student?.rollNumber,
  className: record.student?.course?.name,
  sectionName: record.student?.section?.name,
  recordType: record.recordType,
  tone: record.tone,
  title: record.title,
  description: record.description,
  category: record.category,
  severity: record.severity,
  actionTaken: record.actionTaken,
  awardName: record.awardName,
  achievement: record.achievement,
  eventDate: record.eventDate,
  isApproved: record.isApproved,
  isAdminOnly: record.isAdminOnly,
  parentNotificationRequired: record.parentNotificationRequired,
  parentNotifiedAt: record.parentNotifiedAt,
  createdBy: record.createdBy,
  approvedBy: record.approvedBy,
  createdAt: record.createdAt,
});


export const behaviourStudentOptions = async (context: Context) => {
  const { userId, institutionId, role } = requireContext(context);
  if (isAdminRole(role)) {
    return prisma.student.findMany({
      where: { institutionId, isActive: true },
      select: { id: true, name: true, rollNumber: true, courseId: true, sectionId: true, course: { select: { name: true } }, section: { select: { name: true } } },
      orderBy: [{ course: { name: 'asc' } }, { section: { name: 'asc' } }, { rollNumber: 'asc' }],
      take: 1000,
    });
  }
  if (!isTeacherRole(role)) return [];
  const assignments = await prisma.professorSubjectAssignment.findMany({ where: { professorId: userId, isActive: true }, select: { courseId: true, sectionId: true } });
  if (!assignments.length) return [];
  return prisma.student.findMany({
    where: {
      institutionId,
      isActive: true,
      OR: assignments.map((assignment) => ({ courseId: assignment.courseId, ...(assignment.sectionId ? { sectionId: assignment.sectionId } : {}) })),
    },
    select: { id: true, name: true, rollNumber: true, courseId: true, sectionId: true, course: { select: { name: true } }, section: { select: { name: true } } },
    orderBy: [{ course: { name: 'asc' } }, { section: { name: 'asc' } }, { rollNumber: 'asc' }],
    take: 1000,
  });
};

export const createBehaviourRecord = async (context: Context, body: Record<string, unknown>) => {
  const { userId, institutionId, role } = requireContext(context);
  const studentId = clean(body.studentId);
  if (!studentId) throw new AppError('studentId is required', StatusCodes.BAD_REQUEST);
  await ensureTeacherCanAccessStudent(context, studentId);
  const recordType = parseEnum(body.recordType, Object.values(BehaviourRecordType), 'recordType', BehaviourRecordType.BEHAVIOUR);
  const tone = parseEnum(body.tone, Object.values(BehaviourTone), 'tone', recordType === BehaviourRecordType.DISCIPLINE ? BehaviourTone.NEGATIVE : recordType === BehaviourRecordType.APPRECIATION ? BehaviourTone.POSITIVE : BehaviourTone.NEUTRAL);
  const title = clean(body.title);
  const description = clean(body.description);
  if (!title || !description) throw new AppError('Title and description are required', StatusCodes.BAD_REQUEST);
  const severity = body.severity ? parseEnum(body.severity, Object.values(DisciplineSeverity), 'severity') : null;
  const isAdmin = isAdminRole(role);
  const record = await prisma.studentBehaviourRecord.create({
    data: {
      institutionId,
      studentId,
      createdById: userId,
      recordType,
      tone,
      title,
      description,
      category: optional(body.category),
      severity,
      actionTaken: optional(body.actionTaken),
      awardName: optional(body.awardName),
      achievement: optional(body.achievement),
      eventDate: parseDate(body.eventDate, 'eventDate'),
      isApproved: isAdmin ? (body.isApproved === undefined ? true : bool(body.isApproved)) : recordType !== BehaviourRecordType.DISCIPLINE,
      isAdminOnly: bool(body.isAdminOnly),
      parentNotificationRequired: bool(body.parentNotificationRequired),
    },
    include: includeRecord,
  });
  await writeAuditLog({ institutionId, actorId: userId, action: 'CREATE', entityType: 'StudentBehaviourRecord', entityId: record.id, metadata: { studentId, recordType }, ipAddress: context.ipAddress, userAgent: context.userAgent });
  return toDto(record);
};

export const updateBehaviourRecord = async (context: Context, id: string, body: Record<string, unknown>) => {
  const { userId, institutionId, role } = requireContext(context);
  const existing = await prisma.studentBehaviourRecord.findFirst({ where: { id, institutionId }, include: includeRecord });
  if (!existing) throw new AppError('Behaviour record not found', StatusCodes.NOT_FOUND);
  if (!isAdminRole(role) && existing.createdById !== userId) throw new AppError('You cannot edit this record', StatusCodes.FORBIDDEN);
  if (!isAdminRole(role) && existing.isApproved) throw new AppError('Approved records can only be edited by admin', StatusCodes.FORBIDDEN);
  await ensureTeacherCanAccessStudent(context, existing.studentId);
  const record = await prisma.studentBehaviourRecord.update({
    where: { id },
    data: {
      title: body.title === undefined ? existing.title : clean(body.title),
      description: body.description === undefined ? existing.description : clean(body.description),
      category: body.category === undefined ? existing.category : optional(body.category),
      severity: body.severity === undefined ? existing.severity : body.severity ? parseEnum(body.severity, Object.values(DisciplineSeverity), 'severity') : null,
      actionTaken: body.actionTaken === undefined ? existing.actionTaken : optional(body.actionTaken),
      awardName: body.awardName === undefined ? existing.awardName : optional(body.awardName),
      achievement: body.achievement === undefined ? existing.achievement : optional(body.achievement),
      eventDate: body.eventDate === undefined ? existing.eventDate : parseDate(body.eventDate, 'eventDate'),
      isAdminOnly: body.isAdminOnly === undefined ? existing.isAdminOnly : bool(body.isAdminOnly),
      parentNotificationRequired: body.parentNotificationRequired === undefined ? existing.parentNotificationRequired : bool(body.parentNotificationRequired),
      ...(isAdminRole(role) && body.isApproved !== undefined ? { isApproved: bool(body.isApproved), approvedById: userId } : {}),
    },
    include: includeRecord,
  });
  await writeAuditLog({ institutionId, actorId: userId, action: 'UPDATE', entityType: 'StudentBehaviourRecord', entityId: id, metadata: { studentId: existing.studentId }, ipAddress: context.ipAddress, userAgent: context.userAgent });
  return toDto(record);
};

export const approveBehaviourRecord = async (context: Context, id: string, approved: boolean) => {
  const { userId, institutionId, role } = requireContext(context);
  if (!isAdminRole(role)) throw new AppError('Only admin can approve behaviour records', StatusCodes.FORBIDDEN);
  const current = await prisma.studentBehaviourRecord.findFirst({ where: { id, institutionId } });
  if (!current) throw new AppError('Behaviour record not found', StatusCodes.NOT_FOUND);
  const record = await prisma.studentBehaviourRecord.update({ where: { id }, data: { isApproved: approved, approvedById: userId }, include: includeRecord });
  await writeAuditLog({ institutionId, actorId: userId, action: approved ? 'APPROVE' : 'UPDATE', entityType: 'StudentBehaviourRecord', entityId: id, metadata: { studentId: current.studentId }, ipAddress: context.ipAddress, userAgent: context.userAgent });
  return toDto(record);
};

export const deleteBehaviourRecord = async (context: Context, id: string) => {
  const { userId, institutionId, role } = requireContext(context);
  const existing = await prisma.studentBehaviourRecord.findFirst({ where: { id, institutionId } });
  if (!existing) throw new AppError('Behaviour record not found', StatusCodes.NOT_FOUND);
  if (!isAdminRole(role) && existing.createdById !== userId) throw new AppError('You cannot delete this record', StatusCodes.FORBIDDEN);
  await prisma.studentBehaviourRecord.delete({ where: { id } });
  await writeAuditLog({ institutionId, actorId: userId, action: 'DELETE', entityType: 'StudentBehaviourRecord', entityId: id, metadata: { studentId: existing.studentId }, ipAddress: context.ipAddress, userAgent: context.userAgent });
  return { deleted: true };
};

export const listBehaviourRecords = async (context: Context, query: Record<string, unknown>) => {
  const baseWhere: any = await visibleWhereForContext(context);
  const recordType = clean(query.recordType).toUpperCase();
  const severity = clean(query.severity).toUpperCase();
  const studentId = clean(query.studentId);
  const from = query.from ? parseDate(query.from, 'from') : null;
  const to = query.to ? parseDate(query.to, 'to') : null;
  const where: any = {
    ...baseWhere,
    ...(studentId ? { studentId } : {}),
    ...(recordType ? { recordType } : {}),
    ...(severity ? { severity } : {}),
    ...(from || to ? { eventDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
  };
  const records = await prisma.studentBehaviourRecord.findMany({ where, include: includeRecord, orderBy: [{ eventDate: 'desc' }, { createdAt: 'desc' }], take: 300 });
  return records.map(toDto);
};

export const behaviourDashboard = async (context: Context) => {
  const where: any = await visibleWhereForContext(context);
  const start = new Date(); start.setDate(start.getDate() - 30);
  const [recent, highSeverityDisciplineCount, appreciationCount, pendingParentNotificationCount] = await Promise.all([
    prisma.studentBehaviourRecord.findMany({ where, include: includeRecord, orderBy: { createdAt: 'desc' }, take: 8 }),
    prisma.studentBehaviourRecord.count({ where: { ...where, recordType: BehaviourRecordType.DISCIPLINE, severity: DisciplineSeverity.HIGH } }),
    prisma.studentBehaviourRecord.count({ where: { ...where, recordType: BehaviourRecordType.APPRECIATION, eventDate: { gte: start } } }),
    prisma.studentBehaviourRecord.count({ where: { ...where, parentNotificationRequired: true, parentNotifiedAt: null } }),
  ]);
  return { recent: recent.map(toDto), highSeverityDisciplineCount, appreciationCount, pendingParentNotificationCount };
};

export const behaviourReport = async (context: Context, query: Record<string, unknown>) => {
  const records = await listBehaviourRecords(context, query);
  const classSummary = new Map<string, { className: string; total: number; discipline: number; appreciation: number; behaviour: number; high: number }>();
  const monthlySummary = new Map<string, { month: string; total: number; discipline: number; appreciation: number; high: number }>();
  records.forEach((record: any) => {
    const classKey = `${record.className ?? 'Unassigned'}-${record.sectionName ?? ''}`;
    const classEntry = classSummary.get(classKey) ?? { className: classKey, total: 0, discipline: 0, appreciation: 0, behaviour: 0, high: 0 };
    classEntry.total += 1;
    if (record.recordType === 'DISCIPLINE') classEntry.discipline += 1;
    if (record.recordType === 'APPRECIATION') classEntry.appreciation += 1;
    if (record.recordType === 'BEHAVIOUR') classEntry.behaviour += 1;
    if (record.severity === 'HIGH') classEntry.high += 1;
    classSummary.set(classKey, classEntry);
    const date = new Date(record.eventDate);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthEntry = monthlySummary.get(month) ?? { month, total: 0, discipline: 0, appreciation: 0, high: 0 };
    monthEntry.total += 1;
    if (record.recordType === 'DISCIPLINE') monthEntry.discipline += 1;
    if (record.recordType === 'APPRECIATION') monthEntry.appreciation += 1;
    if (record.severity === 'HIGH') monthEntry.high += 1;
    monthlySummary.set(month, monthEntry);
  });
  return { records, classSummary: Array.from(classSummary.values()), monthlySummary: Array.from(monthlySummary.values()).sort((a, b) => b.month.localeCompare(a.month)) };
};

export const exportBehaviourReport = async (context: Context, query: Record<string, unknown>) => {
  const format = (clean(query.format).toLowerCase() || 'csv') as ExportFormat;
  const report = await behaviourReport(context, query);
  const rows = report.records.map((record: any) => ({
    Date: new Date(record.eventDate).toISOString().slice(0, 10),
    Student: record.studentName,
    RollNumber: record.rollNumber,
    Class: record.className,
    Section: record.sectionName,
    Type: record.recordType,
    Tone: record.tone,
    Severity: record.severity ?? '',
    Title: record.title,
    Category: record.category ?? '',
    ActionTaken: record.actionTaken ?? '',
    Approved: record.isApproved ? 'Yes' : 'No',
  }));
  if (format === 'pdf') {
    return { buffer: toSimplePdf('Student Behaviour Report', rows.slice(0, 40).map((row) => `${row.Date} | ${row.Student} | ${row.Type} | ${row.Title}`)), contentType: 'application/pdf', fileName: 'behaviour-report.pdf' };
  }
  if (format === 'excel') {
    return { buffer: Buffer.from(toCsv(rows), 'utf8'), contentType: 'application/vnd.ms-excel; charset=utf-8', fileName: 'behaviour-report.xls' };
  }
  return { buffer: Buffer.from(toCsv(rows), 'utf8'), contentType: 'text/csv; charset=utf-8', fileName: 'behaviour-report.csv' };
};

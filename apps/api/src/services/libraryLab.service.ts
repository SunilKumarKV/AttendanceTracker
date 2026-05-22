import { Role } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';

type Context = { userId?: string; institutionId?: string | null; role?: Role | string };
type Query = Record<string, unknown>;

const db = prisma as any;
const adminRoles = new Set(['SUPER_ADMIN', 'ADMIN', 'HOD']);
const libraryStaffRoles = new Set(['LIBRARIAN']);
const labStaffRoles = new Set(['LAB_INCHARGE', 'LAB IN-CHARGE', 'LAB_IN_CHARGE']);

const requireInstitution = (context: Context) => {
  if (!context.userId) throw new AppError('Authentication required', StatusCodes.UNAUTHORIZED);
  if (!context.institutionId) throw new AppError('Institution context is required', StatusCodes.FORBIDDEN);
  return context.institutionId;
};

const isAdmin = (context: Context) => adminRoles.has(String(context.role));

const getStaffProfile = async (context: Context) => {
  if (!context.userId || String(context.role) !== 'STAFF') return null;
  return db.staffProfile.findFirst({ where: { userId: context.userId, institutionId: context.institutionId ?? undefined, isActive: true } });
};

const assertAdmin = (context: Context) => {
  if (!isAdmin(context)) throw new AppError('Admin access required', StatusCodes.FORBIDDEN);
};

const assertLibraryWrite = async (context: Context) => {
  if (isAdmin(context)) return;
  const staff = await getStaffProfile(context);
  if (!staff || !libraryStaffRoles.has(String(staff.staffRole).toUpperCase())) {
    throw new AppError('Library access required', StatusCodes.FORBIDDEN);
  }
};

const assertLabWrite = async (context: Context) => {
  if (isAdmin(context)) return;
  const staff = await getStaffProfile(context);
  if (!staff || !labStaffRoles.has(String(staff.staffRole).toUpperCase())) {
    throw new AppError('Lab in-charge access required', StatusCodes.FORBIDDEN);
  }
};

const stringValue = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const optionalString = (value: unknown) => {
  const v = stringValue(value);
  return v || undefined;
};
const intValue = (value: unknown, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
};
const dateValue = (value: unknown, field: string) => {
  const raw = stringValue(value);
  const d = new Date(raw);
  if (!raw || Number.isNaN(d.getTime())) throw new AppError(`${field} is invalid`, StatusCodes.BAD_REQUEST);
  return d;
};

const ensureTarget = async (institutionId: string, data: any, targetType: string) => {
  if (targetType === 'STUDENT') {
    if (!data.studentId) throw new AppError('studentId is required', StatusCodes.BAD_REQUEST);
    const student = await db.student.findFirst({ where: { id: data.studentId, institutionId, isActive: true } });
    if (!student) throw new AppError('Student not found', StatusCodes.NOT_FOUND);
  }
  if (targetType === 'STAFF') {
    if (!data.staffId) throw new AppError('staffId is required', StatusCodes.BAD_REQUEST);
    const staff = await db.staffProfile.findFirst({ where: { id: data.staffId, institutionId, isActive: true } });
    if (!staff) throw new AppError('Staff member not found', StatusCodes.NOT_FOUND);
  }
};

export const listBooks = async (context: Context, query: Query = {}) => {
  const institutionId = requireInstitution(context);
  const search = optionalString(query.search);
  return db.libraryBook.findMany({
    where: {
      institutionId,
      isActive: true,
      ...(optionalString(query.category) ? { category: optionalString(query.category) } : {}),
      ...(search ? { OR: [{ title: { contains: search, mode: 'insensitive' } }, { accessionNumber: { contains: search, mode: 'insensitive' } }, { isbn: { contains: search, mode: 'insensitive' } }] } : {}),
    },
    include: { course: true, subject: true, _count: { select: { issues: true } } },
    orderBy: { createdAt: 'desc' },
  });
};

export const createBook = async (context: Context, data: any) => {
  await assertLibraryWrite(context);
  const institutionId = requireInstitution(context);
  const title = stringValue(data.title);
  const category = stringValue(data.category);
  const accessionNumber = stringValue(data.accessionNumber);
  const totalQuantity = Math.max(1, intValue(data.totalQuantity ?? data.availableQuantity, 1));
  const availableQuantity = Math.max(0, intValue(data.availableQuantity ?? totalQuantity, totalQuantity));
  if (!title || !category || !accessionNumber) throw new AppError('title, category and accessionNumber are required', StatusCodes.BAD_REQUEST);
  if (availableQuantity > totalQuantity) throw new AppError('Available quantity cannot exceed total quantity', StatusCodes.BAD_REQUEST);
  return db.libraryBook.create({ data: { institutionId, title, category, accessionNumber, author: optionalString(data.author), publisher: optionalString(data.publisher), isbn: optionalString(data.isbn), courseId: optionalString(data.courseId), subjectId: optionalString(data.subjectId), totalQuantity, availableQuantity } });
};

export const updateBook = async (context: Context, id: string, data: any) => {
  await assertLibraryWrite(context);
  const institutionId = requireInstitution(context);
  const book = await db.libraryBook.findFirst({ where: { id, institutionId } });
  if (!book) throw new AppError('Book not found', StatusCodes.NOT_FOUND);
  const payload: any = {};
  ['title','category','author','publisher','isbn','accessionNumber','courseId','subjectId'].forEach((key) => { if (key in data) payload[key] = optionalString(data[key]) ?? null; });
  if ('totalQuantity' in data) payload.totalQuantity = Math.max(1, intValue(data.totalQuantity, book.totalQuantity));
  if ('availableQuantity' in data) payload.availableQuantity = Math.max(0, intValue(data.availableQuantity, book.availableQuantity));
  if (payload.availableQuantity !== undefined && (payload.totalQuantity ?? book.totalQuantity) < payload.availableQuantity) throw new AppError('Available quantity cannot exceed total quantity', StatusCodes.BAD_REQUEST);
  return db.libraryBook.update({ where: { id }, data: payload });
};

export const deleteBook = async (context: Context, id: string) => {
  await assertLibraryWrite(context);
  const institutionId = requireInstitution(context);
  await db.libraryBook.updateMany({ where: { id, institutionId }, data: { isActive: false } });
};

export const listBookIssues = async (context: Context, query: Query = {}) => {
  const institutionId = requireInstitution(context);
  return db.libraryBookIssue.findMany({ where: { institutionId, ...(optionalString(query.status) ? { status: optionalString(query.status) } : {}) }, include: { book: true, student: true, staff: { include: { user: { select: { name: true, email: true } } } } }, orderBy: { createdAt: 'desc' } });
};

export const issueBook = async (context: Context, data: any) => {
  await assertLibraryWrite(context);
  const institutionId = requireInstitution(context);
  const bookId = stringValue(data.bookId);
  const targetType = stringValue(data.targetType).toUpperCase();
  if (!bookId || !['STUDENT','STAFF'].includes(targetType)) throw new AppError('bookId and valid targetType are required', StatusCodes.BAD_REQUEST);
  await ensureTarget(institutionId, data, targetType);
  const dueDate = dateValue(data.dueDate, 'dueDate');
  return db.$transaction(async (tx: any) => {
    const book = await tx.libraryBook.findFirst({ where: { id: bookId, institutionId, isActive: true } });
    if (!book) throw new AppError('Book not found', StatusCodes.NOT_FOUND);
    if (book.availableQuantity < 1) throw new AppError('Book is out of stock', StatusCodes.CONFLICT);
    const issue = await tx.libraryBookIssue.create({ data: { institutionId, bookId, targetType, studentId: targetType === 'STUDENT' ? data.studentId : null, staffId: targetType === 'STAFF' ? data.staffId : null, issuedById: context.userId, dueDate, remarks: optionalString(data.remarks) } });
    await tx.libraryBook.update({ where: { id: bookId }, data: { availableQuantity: { decrement: 1 } } });
    return issue;
  });
};

export const returnBook = async (context: Context, issueId: string, data: any) => {
  await assertLibraryWrite(context);
  const institutionId = requireInstitution(context);
  return db.$transaction(async (tx: any) => {
    const issue = await tx.libraryBookIssue.findFirst({ where: { id: issueId, institutionId } });
    if (!issue) throw new AppError('Book issue not found', StatusCodes.NOT_FOUND);
    if (issue.status === 'RETURNED') return issue;
    const late = issue.dueDate && new Date(issue.dueDate).getTime() < Date.now();
    const updated = await tx.libraryBookIssue.update({ where: { id: issueId }, data: { status: data.status === 'LATE' || late ? 'LATE' : 'RETURNED', returnDate: new Date(), fineAmount: data.fineAmount === undefined ? undefined : Number(data.fineAmount), remarks: optionalString(data.remarks) ?? issue.remarks } });
    await tx.libraryBook.update({ where: { id: issue.bookId }, data: { availableQuantity: { increment: 1 } } });
    return updated;
  });
};

export const listEquipment = async (context: Context, query: Query = {}) => {
  const institutionId = requireInstitution(context);
  const search = optionalString(query.search);
  return db.labEquipment.findMany({ where: { institutionId, isActive: true, ...(optionalString(query.condition) ? { condition: optionalString(query.condition) } : {}), ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { assetCode: { contains: search, mode: 'insensitive' } }] } : {}) }, include: { lab: true, _count: { select: { issues: true, maintenanceRequests: true } } }, orderBy: { createdAt: 'desc' } });
};

export const createEquipment = async (context: Context, data: any) => {
  await assertLabWrite(context);
  const institutionId = requireInstitution(context);
  const name = stringValue(data.name);
  const category = stringValue(data.category);
  const assetCode = stringValue(data.assetCode);
  const quantity = Math.max(1, intValue(data.quantity, 1));
  const availableQuantity = Math.max(0, intValue(data.availableQuantity ?? quantity, quantity));
  if (!name || !category || !assetCode) throw new AppError('name, category and assetCode are required', StatusCodes.BAD_REQUEST);
  if (availableQuantity > quantity) throw new AppError('Available quantity cannot exceed quantity', StatusCodes.BAD_REQUEST);
  return db.labEquipment.create({ data: { institutionId, name, category, assetCode, labId: optionalString(data.labId), quantity, availableQuantity, condition: optionalString(data.condition) ?? 'GOOD', remarks: optionalString(data.remarks) } });
};

export const updateEquipment = async (context: Context, id: string, data: any) => {
  await assertLabWrite(context);
  const institutionId = requireInstitution(context);
  const existing = await db.labEquipment.findFirst({ where: { id, institutionId } });
  if (!existing) throw new AppError('Equipment not found', StatusCodes.NOT_FOUND);
  const payload: any = {};
  ['name','category','assetCode','labId','condition','remarks'].forEach((key) => { if (key in data) payload[key] = optionalString(data[key]) ?? null; });
  if ('quantity' in data) payload.quantity = Math.max(1, intValue(data.quantity, existing.quantity));
  if ('availableQuantity' in data) payload.availableQuantity = Math.max(0, intValue(data.availableQuantity, existing.availableQuantity));
  if (payload.availableQuantity !== undefined && (payload.quantity ?? existing.quantity) < payload.availableQuantity) throw new AppError('Available quantity cannot exceed quantity', StatusCodes.BAD_REQUEST);
  return db.labEquipment.update({ where: { id }, data: payload });
};

export const deleteEquipment = async (context: Context, id: string) => {
  await assertLabWrite(context);
  const institutionId = requireInstitution(context);
  await db.labEquipment.updateMany({ where: { id, institutionId }, data: { isActive: false } });
};

export const listEquipmentIssues = async (context: Context, query: Query = {}) => {
  const institutionId = requireInstitution(context);
  return db.labEquipmentIssue.findMany({ where: { institutionId, ...(optionalString(query.status) ? { status: optionalString(query.status) } : {}) }, include: { equipment: true, student: true, staff: { include: { user: { select: { name: true, email: true } } } } }, orderBy: { createdAt: 'desc' } });
};

export const issueEquipment = async (context: Context, data: any) => {
  await assertLabWrite(context);
  const institutionId = requireInstitution(context);
  const equipmentId = stringValue(data.equipmentId);
  const targetType = stringValue(data.targetType).toUpperCase();
  const quantity = Math.max(1, intValue(data.quantity, 1));
  if (!equipmentId || !['STUDENT','STAFF','CLASS'].includes(targetType)) throw new AppError('equipmentId and valid targetType are required', StatusCodes.BAD_REQUEST);
  if (targetType !== 'CLASS') await ensureTarget(institutionId, data, targetType);
  if (targetType === 'CLASS') {
    if (!data.courseId || !data.sectionId) throw new AppError('courseId and sectionId are required for class issue', StatusCodes.BAD_REQUEST);
    const section = await db.section.findFirst({ where: { id: data.sectionId, courseId: data.courseId, institutionId, isActive: true } });
    if (!section) throw new AppError('Class/section not found', StatusCodes.NOT_FOUND);
  }
  return db.$transaction(async (tx: any) => {
    const equipment = await tx.labEquipment.findFirst({ where: { id: equipmentId, institutionId, isActive: true } });
    if (!equipment) throw new AppError('Equipment not found', StatusCodes.NOT_FOUND);
    if (equipment.availableQuantity < quantity) throw new AppError('Insufficient equipment quantity', StatusCodes.CONFLICT);
    const issue = await tx.labEquipmentIssue.create({ data: { institutionId, equipmentId, targetType, studentId: targetType === 'STUDENT' ? data.studentId : null, staffId: targetType === 'STAFF' ? data.staffId : null, courseId: targetType === 'CLASS' ? data.courseId : null, sectionId: targetType === 'CLASS' ? data.sectionId : null, issuedById: context.userId, quantity, dueDate: data.dueDate ? dateValue(data.dueDate, 'dueDate') : null, responsibilityNotes: optionalString(data.responsibilityNotes) } });
    await tx.labEquipment.update({ where: { id: equipmentId }, data: { availableQuantity: { decrement: quantity } } });
    return issue;
  });
};

export const returnEquipment = async (context: Context, issueId: string, data: any) => {
  await assertLabWrite(context);
  const institutionId = requireInstitution(context);
  return db.$transaction(async (tx: any) => {
    const issue = await tx.labEquipmentIssue.findFirst({ where: { id: issueId, institutionId } });
    if (!issue) throw new AppError('Equipment issue not found', StatusCodes.NOT_FOUND);
    if (issue.status === 'RETURNED') return issue;
    const status = ['RETURNED','DAMAGED','LOST'].includes(stringValue(data.status).toUpperCase()) ? stringValue(data.status).toUpperCase() : 'RETURNED';
    const updated = await tx.labEquipmentIssue.update({ where: { id: issueId }, data: { status, returnDate: new Date(), damageRemarks: optionalString(data.damageRemarks), responsibilityNotes: optionalString(data.responsibilityNotes) ?? issue.responsibilityNotes } });
    if (status === 'RETURNED') await tx.labEquipment.update({ where: { id: issue.equipmentId }, data: { availableQuantity: { increment: issue.quantity } } });
    if (status === 'DAMAGED') await tx.labEquipment.update({ where: { id: issue.equipmentId }, data: { condition: 'DAMAGED' } });
    return updated;
  });
};

export const listMaintenance = async (context: Context, query: Query = {}) => {
  const institutionId = requireInstitution(context);
  return db.maintenanceRequest.findMany({ where: { institutionId, ...(optionalString(query.status) ? { status: optionalString(query.status) } : {}) }, include: { equipment: true, assignedTo: { select: { id: true, name: true, email: true } }, createdBy: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: 'desc' } });
};

export const createMaintenance = async (context: Context, data: any) => {
  const institutionId = requireInstitution(context);
  const title = stringValue(data.title);
  const description = stringValue(data.description);
  if (!title || !description) throw new AppError('title and description are required', StatusCodes.BAD_REQUEST);
  return db.maintenanceRequest.create({ data: { institutionId, title, description, equipmentId: optionalString(data.equipmentId), assignedToId: optionalString(data.assignedToId), createdById: context.userId, cost: data.cost === undefined || data.cost === '' ? undefined : Number(data.cost), remarks: optionalString(data.remarks) } });
};

export const updateMaintenance = async (context: Context, id: string, data: any) => {
  await assertLabWrite(context);
  const institutionId = requireInstitution(context);
  const existing = await db.maintenanceRequest.findFirst({ where: { id, institutionId } });
  if (!existing) throw new AppError('Maintenance request not found', StatusCodes.NOT_FOUND);
  const status = optionalString(data.status)?.toUpperCase();
  return db.maintenanceRequest.update({ where: { id }, data: { status: status && ['PENDING','IN_PROGRESS','RESOLVED'].includes(status) ? status : undefined, assignedToId: 'assignedToId' in data ? optionalString(data.assignedToId) ?? null : undefined, cost: data.cost === undefined || data.cost === '' ? undefined : Number(data.cost), remarks: 'remarks' in data ? optionalString(data.remarks) ?? null : undefined, resolvedAt: status === 'RESOLVED' ? new Date() : undefined } });
};

export const dashboard = async (context: Context) => {
  const institutionId = requireInstitution(context);
  const today = new Date();
  const [lowStockBooks, pendingReturns, damagedEquipment, pendingMaintenance] = await Promise.all([
    db.libraryBook.count({ where: { institutionId, isActive: true, availableQuantity: { lte: 2 } } }),
    db.libraryBookIssue.count({ where: { institutionId, status: 'ISSUED', dueDate: { lt: today } } }),
    db.labEquipment.count({ where: { institutionId, isActive: true, condition: 'DAMAGED' } }),
    db.maintenanceRequest.count({ where: { institutionId, status: { in: ['PENDING','IN_PROGRESS'] } } }),
  ]);
  return { lowStockBooks, pendingReturns, damagedEquipment, pendingMaintenance };
};

export const reportRows = async (context: Context, type: string) => {
  const institutionId = requireInstitution(context);
  if (type === 'book-stock') return (await listBooks(context)).map((b: any) => ({ title: b.title, accessionNumber: b.accessionNumber, category: b.category, totalQuantity: b.totalQuantity, availableQuantity: b.availableQuantity }));
  if (type === 'book-issues') return (await listBookIssues(context)).map((i: any) => ({ book: i.book?.title, targetType: i.targetType, status: i.status, issueDate: i.issueDate, dueDate: i.dueDate }));
  if (type === 'equipment-stock') return (await listEquipment(context)).map((e: any) => ({ name: e.name, assetCode: e.assetCode, category: e.category, condition: e.condition, quantity: e.quantity, availableQuantity: e.availableQuantity }));
  if (type === 'equipment-issues') return (await listEquipmentIssues(context)).map((i: any) => ({ equipment: i.equipment?.name, targetType: i.targetType, status: i.status, quantity: i.quantity, issueDate: i.issueDate }));
  if (type === 'maintenance') return (await listMaintenance(context)).map((m: any) => ({ title: m.title, status: m.status, equipment: m.equipment?.name, cost: m.cost ?? '', createdAt: m.createdAt }));
  throw new AppError('Invalid report type', StatusCodes.BAD_REQUEST);
};

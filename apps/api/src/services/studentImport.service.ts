import { Prisma } from '@prisma/client';
import { parse as parseCsv } from 'csv-parse/sync';
import { StatusCodes } from 'http-status-codes';
import readXlsxFile from 'read-excel-file/node';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { writeAuditLog } from './audit.service.js';

interface AdminContext {
  userId?: string;
  institutionId?: string | null;
}

interface ImportRow {
  name: string;
  rollNumber: string;
  email: string;
  mobile: string;
  className: string;
  sectionName: string;
  parentName?: string;
  parentEmail?: string;
  parentMobile?: string;
}

interface RowError {
  row: number;
  errors: string[];
}

const MAX_IMPORT_ROWS = 1000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_REGEX = /^[0-9]{10,15}$/;

const normalizeKey = (value: string) => value.trim().toLowerCase().replace(/[\s_-]+/g, '');
const normalizeValue = (value: unknown) => String(value ?? '').trim();
const normalizeComparable = (value: string) => value.trim().toLowerCase();

const fieldAliases: Record<keyof ImportRow, string[]> = {
  name: ['name', 'studentname', 'fullname'],
  rollNumber: ['rollnumber', 'rollno', 'roll'],
  email: ['email', 'studentemail'],
  mobile: ['mobile', 'phone', 'studentmobile', 'studentphone'],
  className: ['classname', 'class', 'classcode', 'course', 'coursename'],
  sectionName: ['sectionname', 'section', 'sectioncode'],
  parentName: ['parentname', 'guardianname'],
  parentEmail: ['parentemail', 'guardianemail'],
  parentMobile: ['parentmobile', 'parentphone', 'guardianmobile', 'guardianphone'],
};

const findValue = (raw: Record<string, unknown>, key: keyof ImportRow) => {
  const normalizedEntries = Object.entries(raw).map(([field, value]) => [normalizeKey(field), value] as const);
  const aliases = new Set(fieldAliases[key]);
  const match = normalizedEntries.find(([field]) => aliases.has(field));
  return normalizeValue(match?.[1]);
};

const mapRawRow = (raw: Record<string, unknown>): ImportRow => ({
  name: findValue(raw, 'name'),
  rollNumber: findValue(raw, 'rollNumber'),
  email: findValue(raw, 'email').toLowerCase(),
  mobile: findValue(raw, 'mobile'),
  className: findValue(raw, 'className'),
  sectionName: findValue(raw, 'sectionName'),
  parentName: findValue(raw, 'parentName') || undefined,
  parentEmail: findValue(raw, 'parentEmail').toLowerCase() || undefined,
  parentMobile: findValue(raw, 'parentMobile') || undefined,
});

export const parseStudentImportFile = async (file: Express.Multer.File) => {
  const fileName = file.originalname.toLowerCase();
  if (fileName.endsWith('.csv')) {
    return parseCsv(file.buffer.toString('utf8'), {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    }) as Record<string, unknown>[];
  }
  if (fileName.endsWith('.xlsx')) {
    const parsedRows = await readXlsxFile(file.buffer);
    const rows = parsedRows as unknown as unknown[][];
    const [headers = [], ...dataRows] = rows;
    const headerNames = headers.map((header: unknown) => normalizeValue(header));
    return dataRows.map((row: unknown[]) => Object.fromEntries(headerNames.map((header: string, index: number) => [header, row[index] ?? ''])));
  }
  throw new AppError('Only .csv and .xlsx files are supported.', StatusCodes.BAD_REQUEST);
};

const requiredFields: Array<keyof ImportRow> = ['name', 'rollNumber', 'email', 'mobile', 'className', 'sectionName'];

export const importStudents = async (context: AdminContext, file: Express.Multer.File | undefined) => {
  const institutionId = context.institutionId;
  if (!institutionId) throw new AppError('Admin is not linked to an institution', StatusCodes.BAD_REQUEST);
  if (!file) throw new AppError('Student import file is required.', StatusCodes.BAD_REQUEST);

  const rawRows = await parseStudentImportFile(file);
  if (rawRows.length === 0) throw new AppError('The uploaded file does not contain any student rows.', StatusCodes.BAD_REQUEST);
  if (rawRows.length > MAX_IMPORT_ROWS) {
    throw new AppError(`Maximum ${MAX_IMPORT_ROWS} rows are allowed per import.`, StatusCodes.BAD_REQUEST);
  }

  const rows = rawRows.map(mapRawRow);
  const errors: RowError[] = [];
  const validRows: Array<ImportRow & { rowNumber: number; courseId: string; sectionId: string }> = [];
  const seenRollNumbers = new Set<string>();
  const seenEmails = new Set<string>();

  const [courses, sections] = await Promise.all([
    prisma.course.findMany({ where: { institutionId, isActive: true } }),
    prisma.section.findMany({ where: { institutionId, isActive: true } }),
  ]);

  const courseByNameOrCode = new Map<string, (typeof courses)[number]>();
  courses.forEach((course) => {
    courseByNameOrCode.set(normalizeComparable(course.name), course);
    courseByNameOrCode.set(normalizeComparable(course.code), course);
  });

  const sectionsByCourseAndNameOrCode = new Map<string, (typeof sections)[number]>();
  sections.forEach((section) => {
    sectionsByCourseAndNameOrCode.set(`${section.courseId}:${normalizeComparable(section.name)}`, section);
    if (section.code) sectionsByCourseAndNameOrCode.set(`${section.courseId}:${normalizeComparable(section.code)}`, section);
  });

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const rowErrors: string[] = [];

    requiredFields.forEach((field) => {
      if (!row[field]) rowErrors.push(`${field} is required`);
    });
    if (row.email && !EMAIL_REGEX.test(row.email)) rowErrors.push('email is invalid');
    if (row.parentEmail && !EMAIL_REGEX.test(row.parentEmail)) rowErrors.push('parentEmail is invalid');
    if (row.mobile && !MOBILE_REGEX.test(row.mobile)) rowErrors.push('mobile must contain 10 to 15 digits');
    if (row.parentMobile && !MOBILE_REGEX.test(row.parentMobile)) rowErrors.push('parentMobile must contain 10 to 15 digits');

    const course = row.className ? courseByNameOrCode.get(normalizeComparable(row.className)) : undefined;
    if (!course) rowErrors.push('className does not match an existing active class');

    const section = course && row.sectionName
      ? sectionsByCourseAndNameOrCode.get(`${course.id}:${normalizeComparable(row.sectionName)}`)
      : undefined;
    if (course && !section) rowErrors.push('sectionName does not match an existing active section for the class');

    if (course && section) {
      const rollKey = `${course.id}:${section.id}:${normalizeComparable(row.rollNumber)}`;
      const emailKey = `${course.id}:${section.id}:${normalizeComparable(row.email)}`;
      if (seenRollNumbers.has(rollKey)) rowErrors.push('duplicate rollNumber inside this upload for the same class/section');
      if (seenEmails.has(emailKey)) rowErrors.push('duplicate email inside this upload for the same class/section');
      seenRollNumbers.add(rollKey);
      seenEmails.add(emailKey);
    }

    if (rowErrors.length > 0 || !course || !section) {
      errors.push({ row: rowNumber, errors: rowErrors });
      return;
    }

    validRows.push({ ...row, rowNumber, courseId: course.id, sectionId: section.id });
  });

  if (validRows.length > 0) {
    const existing = await prisma.student.findMany({
      where: {
        institutionId,
        OR: validRows.flatMap((row) => [
          { courseId: row.courseId, sectionId: row.sectionId, rollNumber: row.rollNumber },
          { courseId: row.courseId, sectionId: row.sectionId, email: row.email },
        ]),
      },
      select: { courseId: true, sectionId: true, rollNumber: true, email: true },
    });

    const existingRolls = new Set(existing.map((student) => `${student.courseId}:${student.sectionId}:${normalizeComparable(student.rollNumber)}`));
    const existingEmails = new Set(existing.filter((student) => student.email).map((student) => `${student.courseId}:${student.sectionId}:${normalizeComparable(student.email ?? '')}`));

    for (let index = validRows.length - 1; index >= 0; index -= 1) {
      const row = validRows[index];
      const rowErrors: string[] = [];
      if (existingRolls.has(`${row.courseId}:${row.sectionId}:${normalizeComparable(row.rollNumber)}`)) {
        rowErrors.push('rollNumber already exists in database for this class/section');
      }
      if (existingEmails.has(`${row.courseId}:${row.sectionId}:${normalizeComparable(row.email)}`)) {
        rowErrors.push('email already exists in database for this class/section');
      }
      if (rowErrors.length > 0) {
        errors.push({ row: row.rowNumber, errors: rowErrors });
        validRows.splice(index, 1);
      }
    }
  }

  let importedCount = 0;
  if (validRows.length > 0) {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      for (const row of validRows) {
        await tx.student.create({
          data: {
            institutionId,
            courseId: row.courseId,
            sectionId: row.sectionId,
            name: row.name,
            rollNumber: row.rollNumber,
            email: row.email,
            phone: row.mobile,
            parentName: row.parentName ?? null,
            parentEmail: row.parentEmail ?? null,
            parentPhone: row.parentMobile ?? null,
            isActive: true,
          },
        });
        importedCount += 1;
      }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  await writeAuditLog({
    actorId: context.userId,
    institutionId,
    action: 'IMPORT',
    entityType: 'Student',
    metadata: { totalRows: rawRows.length, importedCount, failedCount: errors.length },
  });

  return {
    totalRows: rawRows.length,
    importedCount,
    failedCount: errors.length,
    errors: errors.sort((a, b) => a.row - b.row),
  };
};

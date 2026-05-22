import { StatusCodes } from 'http-status-codes';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';

const DEFAULT_COURSE = {
  name: 'Default Class',
  code: 'DEFAULT-CLASS',
};

const DEFAULT_SEMESTER = {
  name: 'Semester 1',
  number: 1,
};

const DEFAULT_SECTION = {
  name: 'A',
};

export const requireInstitutionId = (institutionId?: string | null) => {
  if (!institutionId) {
    throw new AppError('Admin user is not linked to an institution', StatusCodes.BAD_REQUEST);
  }

  return institutionId;
};

export const ensureDefaultAcademicScope = async (institutionId: string) => {
  const course = await prisma.course.upsert({
    where: {
      institutionId_code: {
        institutionId,
        code: DEFAULT_COURSE.code,
      },
    },
    update: {},
    create: {
      institutionId,
      name: DEFAULT_COURSE.name,
      code: DEFAULT_COURSE.code,
    },
  });

  const semester = await prisma.semester.upsert({
    where: {
      courseId_number: {
        courseId: course.id,
        number: DEFAULT_SEMESTER.number,
      },
    },
    update: {},
    create: {
      institutionId,
      courseId: course.id,
      name: DEFAULT_SEMESTER.name,
      number: DEFAULT_SEMESTER.number,
    },
  });

  const section = await prisma.section.upsert({
    where: {
      courseId_semesterId_name: {
        courseId: course.id,
        semesterId: semester.id,
        name: DEFAULT_SECTION.name,
      },
    },
    update: {},
    create: {
      institutionId,
      courseId: course.id,
      semesterId: semester.id,
      name: DEFAULT_SECTION.name,
    },
  });

  return { course, semester, section };
};

export const ensureSubject = async (institutionId: string, courseId: string, semesterId: string, name: string) => {
  const code = name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'GENERAL';

  return prisma.subject.upsert({
    where: {
      institutionId_courseId_code: {
        institutionId,
        courseId,
        code,
      },
    },
    update: { name: name.trim() },
    create: {
      institutionId,
      courseId,
      semesterId,
      name: name.trim(),
      code,
    },
  });
};

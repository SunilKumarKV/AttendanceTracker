import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { prisma } from '../src/config/prisma.js';

if (process.env.NODE_ENV === 'production') {
  throw new Error('Refusing to run development seed in production. Use npm run seed:first-admin instead.');
}

const institutionSeed = {
  name: 'AttendanceTracker Local Institution',
  code: 'ATT-DEMO',
  email: 'admin@attendancetracker.local',
};

const defaultPassword = process.env.DEV_SEED_PASSWORD ?? randomBytes(18).toString('base64url');

async function main() {
  const passwordHash = await bcrypt.hash(defaultPassword, 12);

  const institution = await prisma.institution.upsert({
    where: { code: institutionSeed.code },
    update: institutionSeed,
    create: institutionSeed,
  });

  await prisma.appSettings.upsert({
    where: { institutionId: institution.id },
    update: {
      minimumAttendancePct: 75,
      timezone: 'Asia/Kolkata',
      notificationEnabled: true,
    },
    create: {
      institutionId: institution.id,
      minimumAttendancePct: 75,
      timezone: 'Asia/Kolkata',
      notificationEnabled: true,
    },
  });

  await prisma.user.upsert({
    where: { email: 'admin@attendancetracker.local' },
    update: {
      institutionId: institution.id,
      name: 'Development Admin',
      passwordHash,
      role: 'ADMIN',
      isActive: true,
    },
    create: {
      institutionId: institution.id,
      name: 'Development Admin',
      email: 'admin@attendancetracker.local',
      passwordHash,
      role: 'ADMIN',
      isActive: true,
    },
  });

  const professor = await prisma.user.upsert({
    where: { email: 'professor@attendancetracker.local' },
    update: {
      institutionId: institution.id,
      name: 'Development Teacher',
      passwordHash,
      role: 'TEACHER',
      isActive: true,
    },
    create: {
      institutionId: institution.id,
      name: 'Development Teacher',
      email: 'professor@attendancetracker.local',
      passwordHash,
      role: 'TEACHER',
      isActive: true,
    },
  });

  const professorProfile = await prisma.professorProfile.upsert({
    where: { userId: professor.id },
    update: {
      institutionId: institution.id,
      employeeCode: 'PROF-DEMO-001',
      department: 'Computer Science',
      designation: 'Teacher',
      phone: '9876500000',
    },
    create: {
      institutionId: institution.id,
      userId: professor.id,
      employeeCode: 'PROF-DEMO-001',
      department: 'Computer Science',
      designation: 'Teacher',
      phone: '9876500000',
    },
  });

  const course = await prisma.course.upsert({
    where: { institutionId_code: { institutionId: institution.id, code: 'CSE' } },
    update: {
      name: 'Computer Science Engineering',
      description: 'Local class for development testing',
      isActive: true,
    },
    create: {
      institutionId: institution.id,
      name: 'Computer Science Engineering',
      code: 'CSE',
      description: 'Local class for development testing',
      isActive: true,
    },
  });

  const semester = await prisma.semester.upsert({
    where: { courseId_number: { courseId: course.id, number: 1 } },
    update: {
      institutionId: institution.id,
      name: 'Semester 1',
      isActive: true,
    },
    create: {
      institutionId: institution.id,
      courseId: course.id,
      name: 'Semester 1',
      number: 1,
      isActive: true,
    },
  });

  const section = await prisma.section.upsert({
    where: { courseId_semesterId_name: { courseId: course.id, semesterId: semester.id, name: 'A' } },
    update: {
      institutionId: institution.id,
      code: 'CSE-A',
      capacity: 60,
      isActive: true,
    },
    create: {
      institutionId: institution.id,
      courseId: course.id,
      semesterId: semester.id,
      name: 'A',
      code: 'CSE-A',
      capacity: 60,
      isActive: true,
    },
  });

  const subject = await prisma.subject.upsert({
    where: { institutionId_courseId_code: { institutionId: institution.id, courseId: course.id, code: 'CS101' } },
    update: {
      semesterId: semester.id,
      name: 'Programming Fundamentals',
      credits: 4,
      isActive: true,
    },
    create: {
      institutionId: institution.id,
      courseId: course.id,
      semesterId: semester.id,
      name: 'Programming Fundamentals',
      code: 'CS101',
      credits: 4,
      isActive: true,
    },
  });

  const existingAssignment = await prisma.professorSubjectAssignment.findFirst({
    where: {
      professorId: professor.id,
      courseId: course.id,
      semesterId: semester.id,
      sectionId: section.id,
      subjectId: subject.id,
    },
  });
  if (existingAssignment) {
    await prisma.professorSubjectAssignment.update({
      where: { id: existingAssignment.id },
      data: {
        professorProfileId: professorProfile.id,
        isActive: true,
      },
    });
  } else {
    await prisma.professorSubjectAssignment.create({
      data: {
        professorId: professor.id,
        professorProfileId: professorProfile.id,
        courseId: course.id,
        semesterId: semester.id,
        sectionId: section.id,
        subjectId: subject.id,
        isActive: true,
      },
    });
  }

  const students = [
    { rollNumber: 'CSE001', name: 'Aarav Sharma', email: 'aarav.sharma@example.local', phone: '9876543210', parentPhone: '9876543211' },
    { rollNumber: 'CSE002', name: 'Diya Patel', email: 'diya.patel@example.local', phone: '9876543212', parentPhone: '9876543213' },
    { rollNumber: 'CSE003', name: 'Kabir Rao', email: 'kabir.rao@example.local', phone: '9876543214', parentPhone: '9876543215' },
  ];

  for (const student of students) {
    await prisma.student.upsert({
      where: {
        institutionId_courseId_sectionId_rollNumber: {
          institutionId: institution.id,
          courseId: course.id,
          sectionId: section.id,
          rollNumber: student.rollNumber,
        },
      },
      update: {
        ...student,
        isActive: true,
      },
      create: {
        institutionId: institution.id,
        courseId: course.id,
        sectionId: section.id,
        ...student,
        isActive: true,
      },
    });
  }

  console.log('Development admin, teacher, class, assignment, and students seeded.');
  console.log('Admin email: admin@attendancetracker.local');
  console.log('Teacher email: professor@attendancetracker.local');
  console.log(`Default password: ${defaultPassword}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

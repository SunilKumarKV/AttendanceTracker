import bcrypt from 'bcryptjs';
import { prisma } from '../src/config/prisma.js';

const institutionSeed = {
  name: 'AttendanceTracker Demo Institution',
  code: 'ATT-DEMO',
  email: 'admin@attendancetracker.local',
};

const defaultPassword = 'Password@123';

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
      name: 'Development Professor',
      passwordHash,
      role: 'PROFESSOR',
      isActive: true,
    },
    create: {
      institutionId: institution.id,
      name: 'Development Professor',
      email: 'professor@attendancetracker.local',
      passwordHash,
      role: 'PROFESSOR',
      isActive: true,
    },
  });

  await prisma.professorProfile.upsert({
    where: { userId: professor.id },
    update: {
      institutionId: institution.id,
      employeeCode: 'PROF-DEMO-001',
      department: 'Computer Science',
      designation: 'Professor',
    },
    create: {
      institutionId: institution.id,
      userId: professor.id,
      employeeCode: 'PROF-DEMO-001',
      department: 'Computer Science',
      designation: 'Professor',
    },
  });

  console.log('Development admin and professor seeded.');
  console.log('Admin email: admin@attendancetracker.local');
  console.log('Professor email: professor@attendancetracker.local');
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

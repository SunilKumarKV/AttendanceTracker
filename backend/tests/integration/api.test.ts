import bcrypt from 'bcryptjs';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../../src/app.js';
import { prisma } from '../../src/config/prisma.js';

const password = 'Password@123';
const prefix = `PH13-${Date.now()}`;

let adminToken = '';
let professorToken = '';
let professorId = '';
let courseId = '';
let semesterId = '';
let sectionId = '';
let subjectId = '';
let studentId = '';
let sessionId = '';

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

const cleanup = async () => {
  const courses = await prisma.course.findMany({ where: { code: { startsWith: 'PH13-' } }, select: { id: true } });
  const courseIds = courses.map((course) => course.id);
  const sessions = await prisma.attendanceSession.findMany({
    where: { courseId: { in: courseIds } },
    select: { id: true },
  });
  const sessionIds = sessions.map((session) => session.id);
  await prisma.attendanceRecord.deleteMany({ where: { sessionId: { in: sessionIds } } });
  await prisma.attendanceSession.deleteMany({ where: { id: { in: sessionIds } } });
  await prisma.professorSubjectAssignment.deleteMany({ where: { courseId: { in: courseIds } } });
  await prisma.student.deleteMany({ where: { courseId: { in: courseIds } } });
  await prisma.subject.deleteMany({ where: { courseId: { in: courseIds } } });
  await prisma.section.deleteMany({ where: { courseId: { in: courseIds } } });
  await prisma.semester.deleteMany({ where: { courseId: { in: courseIds } } });
  await prisma.course.deleteMany({ where: { id: { in: courseIds } } });
  await prisma.refreshToken.deleteMany({ where: { user: { email: { contains: '@phase13.test' } } } });
  await prisma.user.deleteMany({ where: { email: { contains: '@phase13.test' } } });
  await prisma.institution.deleteMany({ where: { code: { startsWith: 'PH13-' } } });
};

beforeAll(async () => {
  await cleanup();
  const institution = await prisma.institution.create({
    data: { name: 'Phase 13 Test Institution', code: `${prefix}-INST` },
  });
  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await prisma.user.create({
    data: {
      institutionId: institution.id,
      name: 'Phase 13 Admin',
      email: `${prefix.toLowerCase()}-admin@phase13.test`,
      passwordHash,
      role: 'ADMIN',
    },
  });
  const professor = await prisma.user.create({
    data: {
      institutionId: institution.id,
      name: 'Phase 13 Professor',
      email: `${prefix.toLowerCase()}-professor@phase13.test`,
      passwordHash,
      role: 'PROFESSOR',
      professorProfile: {
        create: {
          institutionId: institution.id,
          employeeCode: `${prefix}-PROF`,
        },
      },
    },
  });
  professorId = professor.id;

  const adminLogin = await request(app).post('/api/auth/login').send({ email: admin.email, password });
  adminToken = adminLogin.body.data.accessToken;
  const professorLogin = await request(app).post('/api/auth/login').send({ email: professor.email, password });
  professorToken = professorLogin.body.data.accessToken;
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe('auth login', () => {
  it('logs in with seeded test admin', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: `${prefix.toLowerCase()}-admin@phase13.test`, password })
      .expect(200);

    expect(response.body.data.user.role).toBe('ADMIN');
    expect(response.body.data.accessToken).toBeTruthy();
  });
});

describe('admin CRUD and attendance integration', () => {
  it('creates, updates, and lists professor records', async () => {
    const created = await request(app)
      .post('/api/professors')
      .set(auth(adminToken))
      .send({
        name: 'Phase 13 CRUD Professor',
        email: `${prefix.toLowerCase()}-crud-prof@phase13.test`,
        employeeId: `${prefix}-CRUD-PROF`,
        password,
      })
      .expect(201);

    await request(app)
      .patch(`/api/professors/${created.body.data.id}`)
      .set(auth(adminToken))
      .send({ department: 'Quality' })
      .expect(200);

    const list = await request(app).get('/api/professors?search=CRUD-PROF').set(auth(adminToken)).expect(200);
    expect(list.body.data.items.length).toBeGreaterThanOrEqual(1);
  });

  it('creates and updates academic records plus a student', async () => {
    const course = await request(app)
      .post('/api/classes')
      .set(auth(adminToken))
      .send({ name: 'Phase 13 Class', code: `${prefix}-CLASS` })
      .expect(201);
    courseId = course.body.data.id;

    const semester = await request(app)
      .post('/api/semesters')
      .set(auth(adminToken))
      .send({ courseId, name: 'Semester 1', number: 1 })
      .expect(201);
    semesterId = semester.body.data.id;

    const section = await request(app)
      .post('/api/sections')
      .set(auth(adminToken))
      .send({ courseId, semesterId, name: 'A' })
      .expect(201);
    sectionId = section.body.data.id;

    const subject = await request(app)
      .post('/api/subjects')
      .set(auth(adminToken))
      .send({ courseId, semesterId, name: 'Phase 13 Subject', code: `${prefix}-SUB`, credits: 3 })
      .expect(201);
    subjectId = subject.body.data.id;

    await request(app)
      .post('/api/assignments')
      .set(auth(adminToken))
      .send({ professorId, courseId, semesterId, sectionId, subjectId })
      .expect(201);

    const student = await request(app)
      .post('/api/students')
      .set(auth(adminToken))
      .send({
        name: 'Phase 13 Student',
        rollNo: `${prefix}-ROLL`,
        phone: '9876543210',
        parentPhone: '9876543211',
        courseId,
        sectionId,
        subject: 'Phase 13 Subject',
      })
      .expect(201);
    studentId = student.body.data.id;

    await request(app)
      .patch(`/api/students/${studentId}`)
      .set(auth(adminToken))
      .send({ phone: '9876543212' })
      .expect(200);
  });

  it('creates attendance and rejects duplicates', async () => {
    const payload = {
      courseId,
      subjectId,
      semesterId,
      sectionId,
      sessionDate: new Date().toISOString().slice(0, 10),
      topic: 'Phase 13 Integration',
      records: [{ studentId, status: 'PRESENT', remarks: 'On time' }],
    };
    const session = await request(app)
      .post('/api/attendance/sessions')
      .set(auth(professorToken))
      .send(payload)
      .expect(201);
    sessionId = session.body.data.id;
    expect(sessionId).toBeTruthy();

    await request(app).post('/api/attendance/sessions').set(auth(professorToken)).send(payload).expect(409);
  });

  it('returns reports from database data', async () => {
    const overview = await request(app)
      .get(`/api/reports/overview?classId=${courseId}&subjectId=${subjectId}`)
      .set(auth(adminToken))
      .expect(200);
    expect(overview.body.data.summary.sessions).toBeGreaterThanOrEqual(1);

    await request(app).get(`/api/reports/student/${studentId}`).set(auth(adminToken)).expect(200);
    await request(app).get(`/api/reports/class/${courseId}`).set(auth(adminToken)).expect(200);
    await request(app).get(`/api/reports/subject/${subjectId}`).set(auth(adminToken)).expect(200);
    await request(app).get('/api/reports/low-attendance').set(auth(adminToken)).expect(200);
  });
});

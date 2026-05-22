import { expect, test } from '@playwright/test';

const user = {
  id: 'user-admin',
  institutionId: 'inst-1',
  name: 'Admin User',
  email: 'admin@example.com',
  role: 'ADMIN',
};

const professor = {
  id: 'prof-1',
  institutionId: 'inst-1',
  name: 'Teacher User',
  email: 'professor@example.com',
  role: 'TEACHER',
};

const api = (path: string) => `**/api${path}**`;

test.beforeEach(async ({ page }) => {
  await page.route(api('/auth/login'), async (route) => {
    const body = route.request().postDataJSON() as { email: string };
    await route.fulfill({
      json: {
        success: true,
        data: {
          user: body.email.includes('professor') ? professor : user,
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        },
      },
    });
  });
  await page.route(api('/admin/dashboard'), async (route) => {
    await route.fulfill({
      json: {
        success: true,
        data: {
          totalStudents: 0,
          presentToday: 0,
          absentToday: 0,
          below75Count: 0,
          chartData: [],
          atRiskStudents: [],
          recentActivity: [],
        },
      },
    });
  });
  await page.route(api('/students**'), async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        json: {
          success: true,
          data: { id: 'student-1', name: 'Test Student', rollNo: 'R001', phone: '', parentPhone: '' },
        },
      });
      return;
    }
    await route.fulfill({ json: { success: true, data: { items: [], pagination: { page: 1, pageSize: 10, total: 0, totalPages: 1 } } } });
  });
  await page.route(api('/professor/assignments'), async (route) => {
    await route.fulfill({
      json: {
        success: true,
        data: [{ id: 'a1', classId: 'class-1', courseId: 'class-1', className: 'CSE', subjectId: 'sub-1', subjectName: 'Math', semesterId: null, semesterName: null, sectionId: null, sectionName: null }],
      },
    });
  });
  await page.route(api('/attendance/sessions**'), async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        json: {
          success: true,
          data: {
            id: 'session-1',
            classId: 'class-1',
            courseId: 'class-1',
            className: 'CSE',
            subjectId: 'sub-1',
            subjectName: 'Math',
            semesterId: null,
            semesterName: null,
            sectionId: null,
            sectionName: null,
            sessionDate: new Date().toISOString(),
            period: 'Period 1',
            topic: null,
            notes: null,
            isLocked: false,
            lockedAt: null,
            records: [{ id: 'record-1', studentId: 'student-1', studentName: 'Test Student', rollNo: 'R001', status: 'PRESENT', remarks: null }],
          },
        },
      });
      return;
    }
    await route.fulfill({ json: { success: true, data: { items: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 1 } } } });
  });
  await page.route(api('/professor/classes/class-1/students**'), async (route) => {
    await route.fulfill({
      json: {
        success: true,
        data: [{ id: 'student-1', name: 'Test Student', rollNo: 'R001', phone: '', parentPhone: '' }],
      },
    });
  });
  await page.route(api('/classes**'), async (route) => route.fulfill({ json: { success: true, data: { items: [{ id: 'class-1', name: 'CSE', code: 'CSE' }], pagination: { page: 1, pageSize: 100, total: 1, totalPages: 1 } } } }));
  await page.route(api('/semesters**'), async (route) => route.fulfill({ json: { success: true, data: { items: [{ id: 'sem-1', courseId: 'class-1', name: 'Semester 1', number: 1 }], pagination: { page: 1, pageSize: 100, total: 1, totalPages: 1 } } } }));
  await page.route(api('/subjects**'), async (route) => route.fulfill({ json: { success: true, data: { items: [{ id: 'sub-1', courseId: 'class-1', semesterId: 'sem-1', name: 'Math', code: 'MATH' }], pagination: { page: 1, pageSize: 100, total: 1, totalPages: 1 } } } }));
  await page.route(api('/sections**'), async (route) => route.fulfill({ json: { success: true, data: { items: [{ id: 'section-1', courseId: 'class-1', semesterId: 'sem-1', name: 'A', code: 'A' }], pagination: { page: 1, pageSize: 100, total: 1, totalPages: 1 } } } }));
  await page.route(api('/reports/overview**'), async (route) => route.fulfill({ json: { success: true, data: { summary: { totalClasses: 0, averageAttendance: 0, overallPresent: 0, overallLate: 0, overallExcused: 0, overallAbsent: 0, lowAttendanceCount: 0, sessions: 0, studentCount: 0 }, students: [] } } }));
  await page.route(api('/reports/low-attendance**'), async (route) => route.fulfill({ json: { success: true, data: { threshold: 75, students: [] } } }));
});

test('login redirects admin to dashboard', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email Address').fill('admin@example.com');
  await page.locator('#password').fill('Password@123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
});

test('admin creates student', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email Address').fill('admin@example.com');
  await page.locator('#password').fill('Password@123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.goto('/students');
  await page.getByRole('button', { name: 'Add student', exact: true }).click();
  await page.getByLabel('Full Name').fill('Test Student');
  await page.getByLabel('Roll Number').fill('R001');
  await page.getByLabel('Class').selectOption('class-1');
  await page.getByLabel('Semester').selectOption('sem-1');
  await page.getByLabel('Section').selectOption('section-1');
  await page.getByLabel('Student Phone').fill('9876543210');
  await page.getByLabel('Parent Phone').fill('9876543211');
  await page.locator('form').getByRole('button', { name: 'Add Student', exact: true }).click();
  await expect(page.getByText('Student added successfully!').first()).toBeVisible();
});

test('professor marks attendance', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email Address').fill('professor@example.com');
  await page.locator('#password').fill('Password@123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.goto('/mark-attendance');
  await page.getByRole('button', { name: 'PRESENT', exact: true }).click();
  await page.getByRole('button', { name: 'Save Attendance' }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Attendance saved successfully.').first()).toBeVisible();
});

test('reports page opens', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email Address').fill('admin@example.com');
  await page.locator('#password').fill('Password@123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.goto('/reports');
  await expect(page.getByRole('heading', { name: 'Attendance Reports' })).toBeVisible();
});

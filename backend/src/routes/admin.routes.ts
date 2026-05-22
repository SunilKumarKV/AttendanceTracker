import { Router, type Router as ExpressRouter } from 'express';
import multer from 'multer';
import { StatusCodes } from 'http-status-codes';
import { AppError } from '../utils/AppError.js';
import * as adminController from '../controllers/admin.controller.js';
import { adminOnly } from '../middleware/adminOnly.js';
import { writeRateLimiter } from '../middleware/rateLimit.js';
import { validateBody } from '../middleware/validateRequest.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  assignmentSchema,
  assignmentUpdateSchema,
  attendancePolicySchema,
  holidaySchema,
  holidayUpdateSchema,
  reviewRequestSchema,
  courseSchema,
  courseUpdateSchema,
  professorSchema,
  professorUpdateSchema,
  sectionSchema,
  sectionUpdateSchema,
  semesterSchema,
  semesterUpdateSchema,
  studentSchema,
  studentUpdateSchema,
  subjectSchema,
  subjectUpdateSchema,
} from '../validators/admin.validator.js';

export const adminRouter: ExpressRouter = Router();

const studentImportUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) => {
    const name = file.originalname.toLowerCase();
    const allowed = name.endsWith('.csv') || name.endsWith('.xlsx');
    if (!allowed) {
      callback(new Error('Only .csv and .xlsx files are supported.'));
      return;
    }
    callback(null, true);
  },
});

adminRouter.use(adminOnly);
adminRouter.use(writeRateLimiter);

adminRouter.get('/admin/dashboard', asyncHandler(adminController.dashboard));
adminRouter.get('/admin/audit-logs', asyncHandler(adminController.auditLogs));
adminRouter.get('/admin/activity-timeline', asyncHandler(adminController.activityTimeline));
adminRouter.get('/admin/login-history', asyncHandler(adminController.loginHistory));

adminRouter.get('/attendance-policy', asyncHandler(adminController.getAttendancePolicy));
adminRouter.patch('/attendance-policy', validateBody(attendancePolicySchema), asyncHandler(adminController.updateAttendancePolicy));
adminRouter.get('/attendance-calendar/today', asyncHandler(adminController.todayAttendanceStatus));
adminRouter.get('/holidays', asyncHandler(adminController.listHolidays));
adminRouter.post('/holidays', validateBody(holidaySchema), asyncHandler(adminController.createHoliday));
adminRouter.patch('/holidays/:id', validateBody(holidayUpdateSchema), asyncHandler(adminController.updateHoliday));
adminRouter.delete('/holidays/:id', asyncHandler(adminController.deleteHoliday));
adminRouter.get('/correction-requests', asyncHandler(adminController.listCorrectionRequests));
adminRouter.post('/correction-requests/:id/approve', validateBody(reviewRequestSchema), asyncHandler(adminController.approveCorrectionRequest));
adminRouter.post('/correction-requests/:id/reject', validateBody(reviewRequestSchema), asyncHandler(adminController.rejectCorrectionRequest));
adminRouter.get('/leave-requests', asyncHandler(adminController.listLeaveRequests));
adminRouter.post('/leave-requests/:id/approve', validateBody(reviewRequestSchema), asyncHandler(adminController.approveLeaveRequest));
adminRouter.post('/leave-requests/:id/reject', validateBody(reviewRequestSchema), asyncHandler(adminController.rejectLeaveRequest));

adminRouter.get('/professors', asyncHandler(adminController.listProfessors));
adminRouter.post('/professors', validateBody(professorSchema), asyncHandler(adminController.createProfessor));
adminRouter.patch('/professors/:id', validateBody(professorUpdateSchema), asyncHandler(adminController.updateProfessor));
adminRouter.delete('/professors/:id', asyncHandler(adminController.deleteProfessor));
adminRouter.get('/teachers', asyncHandler(adminController.listProfessors));
adminRouter.post('/teachers', validateBody(professorSchema), asyncHandler(adminController.createProfessor));
adminRouter.patch('/teachers/:id', validateBody(professorUpdateSchema), asyncHandler(adminController.updateProfessor));
adminRouter.delete('/teachers/:id', asyncHandler(adminController.deleteProfessor));

adminRouter.get('/students', asyncHandler(adminController.listStudents));
adminRouter.post('/students/import', (request, response, next) => {
  studentImportUpload.single('file')(request, response, (error) => {
    if (error) {
      return next(new AppError(error.message || 'Invalid upload file.', StatusCodes.BAD_REQUEST));
    }
    return next();
  });
}, asyncHandler(adminController.importStudentsFile));
adminRouter.post('/students', validateBody(studentSchema), asyncHandler(adminController.createStudent));
adminRouter.patch('/students/:id', validateBody(studentUpdateSchema), asyncHandler(adminController.updateStudent));
adminRouter.delete('/students/:id', asyncHandler(adminController.deleteStudent));

const crudRoutes = [
  { path: '/classes', model: 'course', create: courseSchema, update: courseUpdateSchema },
  { path: '/subjects', model: 'subject', create: subjectSchema, update: subjectUpdateSchema },
  { path: '/semesters', model: 'semester', create: semesterSchema, update: semesterUpdateSchema },
  { path: '/sections', model: 'section', create: sectionSchema, update: sectionUpdateSchema },
  { path: '/assignments', model: 'professorSubjectAssignment', create: assignmentSchema, update: assignmentUpdateSchema },
] as const;

crudRoutes.forEach(({ path, model, create, update }) => {
  adminRouter.get(path, (request, _response, next) => {
    request.params.model = model;
    next();
  }, asyncHandler(adminController.listModel));
  adminRouter.post(path, (request, _response, next) => {
    request.params.model = model;
    next();
  }, validateBody(create), asyncHandler(adminController.createModel));
  adminRouter.patch(`${path}/:id`, (request, _response, next) => {
    request.params.model = model;
    next();
  }, validateBody(update), asyncHandler(adminController.updateModel));
  adminRouter.delete(`${path}/:id`, (request, _response, next) => {
    request.params.model = model;
    next();
  }, asyncHandler(adminController.deleteModel));
});

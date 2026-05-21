import { Router } from 'express';
import * as adminController from '../controllers/admin.controller.js';
import { adminOnly } from '../middleware/adminOnly.js';
import { writeRateLimiter } from '../middleware/rateLimit.js';
import { validateBody } from '../middleware/validateRequest.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  assignmentSchema,
  assignmentUpdateSchema,
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

export const adminRouter = Router();

adminRouter.use(adminOnly);
adminRouter.use(writeRateLimiter);

adminRouter.get('/admin/dashboard', asyncHandler(adminController.dashboard));

adminRouter.get('/professors', asyncHandler(adminController.listProfessors));
adminRouter.post('/professors', validateBody(professorSchema), asyncHandler(adminController.createProfessor));
adminRouter.patch('/professors/:id', validateBody(professorUpdateSchema), asyncHandler(adminController.updateProfessor));
adminRouter.delete('/professors/:id', asyncHandler(adminController.deleteProfessor));

adminRouter.get('/students', asyncHandler(adminController.listStudents));
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

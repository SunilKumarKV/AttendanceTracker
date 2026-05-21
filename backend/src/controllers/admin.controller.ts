import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as adminCrud from '../services/adminCrud.service.js';

const contextFrom = (request: Request) => ({
  userId: request.auth?.userId,
  institutionId: request.auth?.institutionId,
});

export const dashboard = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await adminCrud.getDashboard(contextFrom(request)) });
};

export const listProfessors = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await adminCrud.listProfessors(contextFrom(request), request.query) });
};

export const createProfessor = async (request: Request, response: Response) => {
  response.status(StatusCodes.CREATED).json({ success: true, data: await adminCrud.createProfessor(contextFrom(request), request.body) });
};

export const updateProfessor = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await adminCrud.updateProfessor(contextFrom(request), request.params.id, request.body) });
};

export const deleteProfessor = async (request: Request, response: Response) => {
  await adminCrud.deleteProfessor(contextFrom(request), request.params.id);
  response.status(StatusCodes.NO_CONTENT).send();
};

export const listStudents = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await adminCrud.listStudents(contextFrom(request), request.query) });
};

export const createStudent = async (request: Request, response: Response) => {
  response.status(StatusCodes.CREATED).json({ success: true, data: await adminCrud.createStudent(contextFrom(request), request.body) });
};

export const updateStudent = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await adminCrud.updateStudent(contextFrom(request), request.params.id, request.body) });
};

export const deleteStudent = async (request: Request, response: Response) => {
  await adminCrud.deleteStudent(contextFrom(request), request.params.id);
  response.status(StatusCodes.NO_CONTENT).send();
};

const modelFromRoute = (request: Request) => request.params.model as any;

export const listModel = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await adminCrud.listModel(contextFrom(request), modelFromRoute(request), request.query) });
};

export const createModel = async (request: Request, response: Response) => {
  response.status(StatusCodes.CREATED).json({ success: true, data: await adminCrud.createModel(contextFrom(request), modelFromRoute(request), request.body) });
};

export const updateModel = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await adminCrud.updateModel(contextFrom(request), modelFromRoute(request), request.params.id, request.body) });
};

export const deleteModel = async (request: Request, response: Response) => {
  await adminCrud.deleteModel(contextFrom(request), modelFromRoute(request), request.params.id);
  response.status(StatusCodes.NO_CONTENT).send();
};

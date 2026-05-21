import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as reportService from '../services/report.service.js';

const contextFrom = (request: Request) => ({
  institutionId: request.auth?.institutionId,
});

const filenameSuffix = () => new Date().toISOString().slice(0, 10);

export const overview = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await reportService.getOverview(contextFrom(request), request.query) });
};

export const student = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await reportService.getStudentReport(contextFrom(request), request.params.studentId, request.query) });
};

export const classReport = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await reportService.getClassReport(contextFrom(request), request.params.classId, request.query) });
};

export const subject = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await reportService.getSubjectReport(contextFrom(request), request.params.subjectId, request.query) });
};

export const lowAttendance = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await reportService.getLowAttendance(contextFrom(request), request.query) });
};

export const monthly = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await reportService.getMonthlyReport(contextFrom(request), request.query) });
};

export const csv = async (request: Request, response: Response) => {
  const csvData = await reportService.exportCsv(contextFrom(request), request.query);
  response
    .status(StatusCodes.OK)
    .setHeader('Content-Type', 'text/csv; charset=utf-8')
    .setHeader('Content-Disposition', `attachment; filename="attendance_report_${filenameSuffix()}.csv"`)
    .send(csvData);
};

export const pdf = async (request: Request, response: Response) => {
  const pdfData = await reportService.exportPdf(contextFrom(request), request.query);
  response
    .status(StatusCodes.OK)
    .setHeader('Content-Type', 'application/pdf')
    .setHeader('Content-Disposition', `attachment; filename="attendance_report_${filenameSuffix()}.pdf"`)
    .send(pdfData);
};

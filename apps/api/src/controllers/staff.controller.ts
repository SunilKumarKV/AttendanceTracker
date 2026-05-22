import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as staffService from '../services/staff.service.js';
import { toCsv, toSimplePdf } from '../utils/reportExport.js';

const contextFrom = (request: Request) => ({ userId: request.auth?.userId, institutionId: request.auth?.institutionId, role: request.auth?.role });

export const listStaff = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await staffService.listStaff(contextFrom(request), request.query) });
};
export const createStaff = async (request: Request, response: Response) => {
  response.status(StatusCodes.CREATED).json({ success: true, data: await staffService.createStaff(contextFrom(request), request.body) });
};
export const updateStaff = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await staffService.updateStaff(contextFrom(request), request.params.id, request.body) });
};
export const deleteStaff = async (request: Request, response: Response) => {
  await staffService.deleteStaff(contextFrom(request), request.params.id);
  response.status(StatusCodes.NO_CONTENT).send();
};
export const markAttendance = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await staffService.markStaffAttendance(contextFrom(request), request.body) });
};
export const listAttendance = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await staffService.listStaffAttendance(contextFrom(request), request.query) });
};
export const createLeave = async (request: Request, response: Response) => {
  response.status(StatusCodes.CREATED).json({ success: true, data: await staffService.createStaffLeave(contextFrom(request), request.body) });
};
export const listLeaves = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await staffService.listStaffLeaves(contextFrom(request), request.query) });
};
export const approveLeave = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await staffService.reviewStaffLeave(contextFrom(request), request.params.id, true, request.body?.adminNote) });
};
export const rejectLeave = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await staffService.reviewStaffLeave(contextFrom(request), request.params.id, false, request.body?.adminNote) });
};
export const dashboard = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await staffService.getStaffDashboard(contextFrom(request)) });
};
export const adminSummary = async (request: Request, response: Response) => {
  response.status(StatusCodes.OK).json({ success: true, data: await staffService.getAdminStaffSummary(contextFrom(request)) });
};
export const exportReport = async (request: Request, response: Response) => {
  const rows = await staffService.exportStaffReportRows(contextFrom(request), request.query);
  const format = String(request.query.format ?? 'csv').toLowerCase();
  if (format === 'pdf') {
    const pdf = toSimplePdf('Staff Attendance Report', rows.map((row) => `${row.date} | ${row.employeeCode} | ${row.name} | ${row.status}`));
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', 'attachment; filename="staff-attendance-report.pdf"');
    response.send(pdf);
    return;
  }
  const csv = toCsv(rows);
  response.setHeader('Content-Type', format === 'excel' || format === 'xlsx' ? 'application/vnd.ms-excel; charset=utf-8' : 'text/csv; charset=utf-8');
  response.setHeader('Content-Disposition', `attachment; filename="staff-attendance-report.${format === 'xlsx' ? 'xls' : 'csv'}"`);
  response.send(csv);
};

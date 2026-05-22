import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as service from '../services/analytics.service.js';
import { toCsv, toSimplePdf } from '../utils/reportExport.js';

const contextFrom = (request: Request) => ({ userId: request.auth?.userId, institutionId: request.auth?.institutionId, role: request.auth?.role });

export const overview = async (req: Request, res: Response) => res.status(StatusCodes.OK).json({ success: true, data: await service.getAnalyticsOverview(contextFrom(req), req.query) });
export const charts = async (req: Request, res: Response) => res.status(StatusCodes.OK).json({ success: true, data: await service.getAnalyticsCharts(contextFrom(req), req.query) });
export const risks = async (req: Request, res: Response) => res.status(StatusCodes.OK).json({ success: true, data: await service.getStudentRiskInsights(contextFrom(req), req.query) });
export const teachers = async (req: Request, res: Response) => res.status(StatusCodes.OK).json({ success: true, data: await service.getTeacherInsights(contextFrom(req), req.query) });
export const filters = async (req: Request, res: Response) => res.status(StatusCodes.OK).json({ success: true, data: await service.getFilterOptions(contextFrom(req)) });
export const exportAnalytics = async (req: Request, res: Response) => {
  const format = String(req.query.format ?? 'csv').toLowerCase();
  const type = String(req.query.type ?? 'summary');
  const rows = await service.exportRows(contextFrom(req), req.query);
  if (format === 'pdf') {
    const pdf = toSimplePdf(`Analytics ${type} Report`, rows.map((row) => Object.values(row).join(' | ')));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="analytics-${type}.pdf"`);
    res.send(pdf);
    return;
  }
  const csv = toCsv(rows);
  res.setHeader('Content-Type', format === 'xlsx' || format === 'excel' ? 'application/vnd.ms-excel; charset=utf-8' : 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="analytics-${type}.${format === 'xlsx' || format === 'excel' ? 'xls' : 'csv'}"`);
  res.send(csv);
};

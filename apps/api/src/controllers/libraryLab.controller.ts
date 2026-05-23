import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as service from '../services/libraryLab.service.js';
import { toCsv, toSimplePdf } from '../utils/reportExport.js';

const contextFrom = (request: Request) => ({ userId: request.auth?.userId, institutionId: request.auth?.institutionId, role: request.auth?.role });

export const dashboard = async (req: Request, res: Response) => res.status(StatusCodes.OK).json({ success: true, data: await service.dashboard(contextFrom(req)) });
export const listBooks = async (req: Request, res: Response) => res.status(StatusCodes.OK).json({ success: true, data: await service.listBooks(contextFrom(req), req.query) });
export const createBook = async (req: Request, res: Response) => res.status(StatusCodes.CREATED).json({ success: true, data: await service.createBook(contextFrom(req), req.body) });
export const updateBook = async (req: Request, res: Response) => res.status(StatusCodes.OK).json({ success: true, data: await service.updateBook(contextFrom(req), req.params.id, req.body) });
export const deleteBook = async (req: Request, res: Response) => { await service.deleteBook(contextFrom(req), req.params.id); res.status(StatusCodes.NO_CONTENT).send(); };
export const listBookIssues = async (req: Request, res: Response) => res.status(StatusCodes.OK).json({ success: true, data: await service.listBookIssues(contextFrom(req), req.query) });
export const issueBook = async (req: Request, res: Response) => res.status(StatusCodes.CREATED).json({ success: true, data: await service.issueBook(contextFrom(req), req.body) });
export const returnBook = async (req: Request, res: Response) => res.status(StatusCodes.OK).json({ success: true, data: await service.returnBook(contextFrom(req), req.params.id, req.body) });
export const listEquipment = async (req: Request, res: Response) => res.status(StatusCodes.OK).json({ success: true, data: await service.listEquipment(contextFrom(req), req.query) });
export const createEquipment = async (req: Request, res: Response) => res.status(StatusCodes.CREATED).json({ success: true, data: await service.createEquipment(contextFrom(req), req.body) });
export const updateEquipment = async (req: Request, res: Response) => res.status(StatusCodes.OK).json({ success: true, data: await service.updateEquipment(contextFrom(req), req.params.id, req.body) });
export const deleteEquipment = async (req: Request, res: Response) => { await service.deleteEquipment(contextFrom(req), req.params.id); res.status(StatusCodes.NO_CONTENT).send(); };
export const listEquipmentIssues = async (req: Request, res: Response) => res.status(StatusCodes.OK).json({ success: true, data: await service.listEquipmentIssues(contextFrom(req), req.query) });
export const issueEquipment = async (req: Request, res: Response) => res.status(StatusCodes.CREATED).json({ success: true, data: await service.issueEquipment(contextFrom(req), req.body) });
export const returnEquipment = async (req: Request, res: Response) => res.status(StatusCodes.OK).json({ success: true, data: await service.returnEquipment(contextFrom(req), req.params.id, req.body) });
export const listMaintenance = async (req: Request, res: Response) => res.status(StatusCodes.OK).json({ success: true, data: await service.listMaintenance(contextFrom(req), req.query) });
export const createMaintenance = async (req: Request, res: Response) => res.status(StatusCodes.CREATED).json({ success: true, data: await service.createMaintenance(contextFrom(req), req.body) });
export const updateMaintenance = async (req: Request, res: Response) => res.status(StatusCodes.OK).json({ success: true, data: await service.updateMaintenance(contextFrom(req), req.params.id, req.body) });
export const exportReport = async (req: Request, res: Response) => {
  const type = String(req.query.type ?? 'book-stock');
  const format = String(req.query.format ?? 'csv').toLowerCase();
  const rows = await service.reportRows(contextFrom(req), type);
  if (format === 'pdf') {
    const pdf = toSimplePdf(
  `Library/Lab ${type} Report`,
  rows.map((row: Record<string, unknown>) => Object.values(row).join(' | '))
);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${type}.pdf"`);
    res.send(pdf);
    return;
  }
  const csv = toCsv(rows);
  res.setHeader('Content-Type', format === 'excel' || format === 'xlsx' ? 'application/vnd.ms-excel; charset=utf-8' : 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${type}.${format === 'xlsx' ? 'xls' : 'csv'}"`);
  res.send(csv);
};

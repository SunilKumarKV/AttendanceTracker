import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as service from '../services/behaviour.service.js';

const contextFrom = (request: Request) => ({
  userId: request.auth?.userId,
  institutionId: request.auth?.institutionId,
  role: request.auth?.role,
  ipAddress: request.ip,
  userAgent: request.headers['user-agent'],
});
const ok = (response: Response, data: unknown, status = StatusCodes.OK) => response.status(status).json({ success: true, data });

export const studentOptions = async (req: Request, res: Response) => ok(res, await service.behaviourStudentOptions(contextFrom(req)));
export const list = async (req: Request, res: Response) => ok(res, await service.listBehaviourRecords(contextFrom(req), req.query as Record<string, unknown>));
export const create = async (req: Request, res: Response) => ok(res, await service.createBehaviourRecord(contextFrom(req), req.body), StatusCodes.CREATED);
export const update = async (req: Request, res: Response) => ok(res, await service.updateBehaviourRecord(contextFrom(req), req.params.id, req.body));
export const approve = async (req: Request, res: Response) => ok(res, await service.approveBehaviourRecord(contextFrom(req), req.params.id, Boolean(req.body?.approved ?? true)));
export const remove = async (req: Request, res: Response) => ok(res, await service.deleteBehaviourRecord(contextFrom(req), req.params.id));
export const dashboard = async (req: Request, res: Response) => ok(res, await service.behaviourDashboard(contextFrom(req)));
export const report = async (req: Request, res: Response) => ok(res, await service.behaviourReport(contextFrom(req), req.query as Record<string, unknown>));
export const exportReport = async (req: Request, res: Response) => {
  const file = await service.exportBehaviourReport(contextFrom(req), req.query as Record<string, unknown>);
  res.setHeader('Content-Type', file.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
  res.send(file.buffer);
};

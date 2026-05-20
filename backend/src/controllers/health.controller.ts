import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { getHealthStatus } from '../services/health.service.js';

export const getHealth = (_request: Request, response: Response) => {
  response.status(StatusCodes.OK).json(getHealthStatus());
};

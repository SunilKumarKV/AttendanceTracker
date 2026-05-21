import { prisma } from '../config/prisma.js';

interface AuditInput {
  actorId?: string;
  institutionId?: string | null;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entityType: string;
  entityId?: string;
  metadata?: unknown;
}

export const writeAuditLog = async ({
  actorId,
  institutionId,
  action,
  entityType,
  entityId,
  metadata,
}: AuditInput) => {
  await prisma.auditLog.create({
    data: {
      actorId,
      institutionId,
      action,
      entityType,
      entityId,
      metadata: metadata === undefined ? undefined : JSON.parse(JSON.stringify(metadata)),
    },
  });
};

import { prisma } from '../config/prisma.js';

interface AuditInput {
  actorId?: string;
  institutionId?: string | null;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: unknown;
  ipAddress?: string;
  userAgent?: string;
}

export type AuditAction = string;

export const writeAuditLog = async ({
  actorId,
  institutionId,
  action,
  entityType,
  entityId,
  metadata,
  ipAddress,
  userAgent,
}: AuditInput) => {
  await prisma.auditLog.create({
    data: {
      actorId,
      institutionId,
      action,
      entityType,
      entityId,
      metadata: metadata === undefined ? undefined : JSON.parse(JSON.stringify(metadata)),
      ipAddress,
      userAgent,
    },
  });
};


export const listAuditLogs = async (institutionId: string, limit = 50) => (
  prisma.auditLog.findMany({
    where: { institutionId },
    include: { actor: { select: { id: true, name: true, email: true, role: true } } },
    orderBy: { createdAt: 'desc' },
    take: Math.min(Math.max(limit, 1), 100),
  })
);

export const listPlatformAuditLogs = async ({ limit = 100, institutionId, action }: { limit?: number; institutionId?: string; action?: string }) => (
  prisma.auditLog.findMany({
    where: {
      institutionId: institutionId || undefined,
      action: action ? { contains: action, mode: 'insensitive' } : undefined,
    },
    include: {
      actor: { select: { id: true, name: true, email: true, role: true } },
      institution: { select: { id: true, name: true, code: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: Math.min(Math.max(Number(limit), 1), 200),
  })
);

export const listActivityTimeline = async (institutionId: string, limit = 20) => {
  const logs = await listAuditLogs(institutionId, limit);
  return logs.map((log) => ({
    id: log.id,
    actor: log.actor?.name ?? 'System',
    role: log.actor?.role ?? null,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    createdAt: log.createdAt,
    metadata: log.metadata,
  }));
};

import { Router } from "express";
import { listAuditLogs, listAuditLogsByDecision } from "../../lib/mongodb";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../middlewares/asyncHandler";
import { isAuthenticated } from "../../middlewares/isAuthenticated";
import { requireRole } from "../../middlewares/requireRole";

export const auditRoutes = Router();

type AuditLogDocument = {
  _id: { toString(): string };
  action: string;
  userId?: string | null;
  companyId?: string | null;
  details?: Record<string, unknown>;
  timestamp: Date | string;
};

type AuditUser = {
  id: string;
  name: string;
  email: string;
};

function serializeLog(log: AuditLogDocument, user?: AuditUser) {
  return {
    id: log._id.toString(),
    action: log.action,
    userId: log.userId,
    userName: user?.name,
    userEmail: user?.email,
    companyId: log.companyId,
    details: log.details,
    timestamp: log.timestamp,
  };
}

async function serializeLogsWithUsers(
  rawLogs: unknown[],
  companyId?: string,
) {
  const logs = (Array.isArray(rawLogs) ? rawLogs : []) as AuditLogDocument[];
  const userIds = Array.from(
    new Set(logs.map((log) => log.userId).filter(Boolean)),
  ) as string[];

  if (userIds.length === 0) {
    return logs.map((log) => serializeLog(log));
  }

  const users = (await prisma.user.findMany({
    where: {
      id: { in: userIds },
      ...(companyId ? { companyId } : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  })) ?? [];

  const usersById = new Map(users.map((user) => [user.id, user]));

  return logs.map((log) =>
    serializeLog(log, log.userId ? usersById.get(log.userId) : undefined),
  );
}

auditRoutes.use(isAuthenticated);
auditRoutes.use(requireRole(["admin", "auditor"]));

auditRoutes.get(
  "/",
  asyncHandler(async (request, response) => {
    const logs = await listAuditLogs(50, request.user?.companyId);
    response.json(await serializeLogsWithUsers(logs, request.user?.companyId));
  }),
);

auditRoutes.get(
  "/decisions/:decisionId",
  asyncHandler(async (request, response) => {
    const decisionId = Array.isArray(request.params.decisionId)
      ? request.params.decisionId[0]
      : request.params.decisionId;
    const logs = await listAuditLogsByDecision(
      decisionId,
      50,
      request.user?.companyId,
    );
    response.json(await serializeLogsWithUsers(logs, request.user?.companyId));
  }),
);

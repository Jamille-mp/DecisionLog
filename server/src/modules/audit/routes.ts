import { Router } from "express";
import { listAuditLogs, listAuditLogsByDecision } from "../../lib/mongodb";
import { asyncHandler } from "../../middlewares/asyncHandler";
import { isAuthenticated } from "../../middlewares/isAuthenticated";
import { requireRole } from "../../middlewares/requireRole";

export const auditRoutes = Router();

function serializeLog(log: any) {
  return {
    id: log._id.toString(),
    action: log.action,
    userId: log.userId,
    companyId: log.companyId,
    details: log.details,
    timestamp: log.timestamp,
  };
}

auditRoutes.use(isAuthenticated);
auditRoutes.use(requireRole(["admin", "auditor"]));

auditRoutes.get(
  "/",
  asyncHandler(async (request, response) => {
    const logs = await listAuditLogs(50, request.user?.companyId);
    response.json(logs.map(serializeLog));
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
    response.json(logs.map(serializeLog));
  }),
);

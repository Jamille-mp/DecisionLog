import { Router } from "express";
import { listAuditLogs } from "../../lib/mongodb";
import { asyncHandler } from "../../middlewares/asyncHandler";
import { isAuthenticated } from "../../middlewares/isAuthenticated";

export const auditRoutes = Router();

auditRoutes.use(isAuthenticated);

auditRoutes.get(
  "/",
  asyncHandler(async (_request, response) => {
    const logs = await listAuditLogs(50);

    response.json(
      logs.map((log) => ({
        id: log._id.toString(),
        action: log.action,
        userId: log.userId,
        details: log.details,
        timestamp: log.timestamp,
      })),
    );
  }),
);

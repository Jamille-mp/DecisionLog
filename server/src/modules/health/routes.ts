import { Router } from "express";
import { getEventBusHealth } from "../../lib/eventBus";
import { checkMongoHealth } from "../../lib/mongodb";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../middlewares/asyncHandler";

export const healthRoutes = Router();

async function getHealthChecks() {
  const checks = {
    api: "ok",
    mysql: "unknown",
    mongodb: "unknown",
    events: getEventBusHealth(),
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.mysql = "ok";
  } catch {
    checks.mysql = "error";
  }

  try {
    await checkMongoHealth();
    checks.mongodb = "ok";
  } catch {
    checks.mongodb = "error";
  }

  const status =
    checks.mysql === "ok" && checks.mongodb === "ok" ? "ok" : "degraded";

  return {
    checks,
    status,
  };
}

healthRoutes.get(
  "/",
  asyncHandler(async (_request, response) => {
    const { checks, status } = await getHealthChecks();

    response.status(200).json({
      status,
      service: "DecisionLog API",
      checks,
    });
  }),
);

healthRoutes.get(
  "/ready",
  asyncHandler(async (_request, response) => {
    const { checks, status } = await getHealthChecks();

    response.status(status === "ok" ? 200 : 503).json({
      status,
      service: "DecisionLog API",
      checks,
    });
  }),
);

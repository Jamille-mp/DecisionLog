import { Router } from "express";
import { getEventBusHealth } from "../../lib/eventBus";
import { checkMongoHealth } from "../../lib/mongodb";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../middlewares/asyncHandler";
import { isAuthenticated } from "../../middlewares/isAuthenticated";
import { requireRole } from "../../middlewares/requireRole";

export const healthRoutes = Router();

async function getHealthChecks() {
  const checks = {
    api: "ok",
    mysql: "unknown",
    mongodb: "unknown",
    mongodbError: null as string | null,
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
  } catch (error) {
    checks.mongodb = "error";
    checks.mongodbError =
      error instanceof Error ? error.message : "Erro desconhecido no MongoDB.";
  }

  const eventsOk =
    checks.events.state !== "open" &&
    (process.env.NODE_ENV !== "production" ||
      checks.events.mode === "rabbitmq" ||
      process.env.ALLOW_MEMORY_EVENT_BROKER === "true");
  const status =
    checks.mysql === "ok" && checks.mongodb === "ok" && eventsOk
      ? "ok"
      : "degraded";

  return {
    checks,
    status,
  };
}

function toPublicHealth(checks: Awaited<ReturnType<typeof getHealthChecks>>["checks"]) {
  return {
    api: checks.api,
    mysql: checks.mysql,
    mongodb: checks.mongodb,
    events: {
      mode: checks.events.mode,
      state: checks.events.state,
      configured: checks.events.configured,
    },
  };
}

healthRoutes.get(
  "/",
  asyncHandler(async (_request, response) => {
    const { checks, status } = await getHealthChecks();

    response.status(200).json({
      status,
      service: "DecisionLog API",
      checks: toPublicHealth(checks),
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
      checks: toPublicHealth(checks),
    });
  }),
);

healthRoutes.get(
  "/details",
  isAuthenticated,
  requireRole(["admin"]),
  asyncHandler(async (_request, response) => {
    const { checks, status } = await getHealthChecks();

    response.json({
      status,
      service: "DecisionLog API",
      checkedAt: new Date().toISOString(),
      checks,
    });
  }),
);

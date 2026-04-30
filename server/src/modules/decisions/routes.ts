import { Router } from "express";
import { AppError } from "../../errors/AppError";
import { logActivity } from "../../lib/mongodb";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../middlewares/asyncHandler";
import { isAuthenticated } from "../../middlewares/isAuthenticated";
import {
  createDecisionSchema,
  updateDecisionSchema,
} from "../../schemas/decision";

export const decisionRoutes = Router();

const decisionInclude = {
  user: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
};

function getDecisionId(id: string | string[] | undefined) {
  return Array.isArray(id) ? id[0] : id;
}

decisionRoutes.use(isAuthenticated);

decisionRoutes.get(
  "/",
  asyncHandler(async (request, response) => {
    const decisions = await prisma.decision.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: decisionInclude,
    });

    void logActivity(
      "DECISIONS_VIEWED",
      {
        total: decisions.length,
      },
      request.user?.id,
    );

    response.json(decisions);
  }),
);

decisionRoutes.post(
  "/",
  asyncHandler(async (request, response) => {
    const { title, context, decision, reason } = createDecisionSchema.parse(
      request.body,
    );

    const newDecision = await prisma.decision.create({
      data: {
        title,
        context,
        decision,
        reason,
        userId: request.user?.id,
      },
      include: decisionInclude,
    });

    void logActivity(
      "DECISION_CREATED",
      {
        decisionId: newDecision.id,
        title: newDecision.title,
        status: newDecision.status,
      },
      request.user?.id,
    );

    response.status(201).json(newDecision);
  }),
);

decisionRoutes.put(
  "/:id",
  asyncHandler(async (request, response) => {
    const data = updateDecisionSchema.parse(request.body);
    const decisionId = getDecisionId(request.params.id);

    if (!decisionId) {
      throw new AppError("ID da decisao ausente.", 400);
    }

    const currentDecision = await prisma.decision.findUnique({
      where: {
        id: decisionId,
      },
    });

    if (!currentDecision) {
      throw new AppError("Decisao nao encontrada.", 404);
    }

    if (currentDecision.userId && currentDecision.userId !== request.user?.id) {
      throw new AppError("Voce nao pode alterar esta decisao.", 403);
    }

    const updatedDecision = await prisma.decision.update({
      where: {
        id: currentDecision.id,
      },
      data,
      include: decisionInclude,
    });

    void logActivity(
      "DECISION_UPDATED",
      {
        decisionId: updatedDecision.id,
        title: updatedDecision.title,
        updatedFields: Object.keys(data),
      },
      request.user?.id,
    );

    response.json(updatedDecision);
  }),
);

decisionRoutes.delete(
  "/:id",
  asyncHandler(async (request, response) => {
    const decisionId = getDecisionId(request.params.id);

    if (!decisionId) {
      throw new AppError("ID da decisao ausente.", 400);
    }

    const currentDecision = await prisma.decision.findUnique({
      where: {
        id: decisionId,
      },
    });

    if (!currentDecision) {
      throw new AppError("Decisao nao encontrada.", 404);
    }

    if (currentDecision.userId && currentDecision.userId !== request.user?.id) {
      throw new AppError("Voce nao pode excluir esta decisao.", 403);
    }

    await prisma.decision.delete({
      where: {
        id: currentDecision.id,
      },
    });

    void logActivity(
      "DECISION_DELETED",
      {
        decisionId: currentDecision.id,
        title: currentDecision.title,
      },
      request.user?.id,
    );

    response.status(204).send();
  }),
);

import { Router } from "express";
import { AppError } from "../../errors/AppError";
import { publishDomainEvent } from "../../lib/eventBus";
import { logActivity } from "../../lib/mongodb";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../middlewares/asyncHandler";
import { isAuthenticated } from "../../middlewares/isAuthenticated";
import { requireRole } from "../../middlewares/requireRole";
import {
  createDecisionSchema,
  listDecisionQuerySchema,
  updateDecisionSchema,
} from "../../schemas/decision";

export const decisionRoutes = Router();

const decisionInclude = {
  user: {
    select: {
      id: true,
      name: true,
      role: true,
    },
  },
  departmentRef: true,
};

function getDecisionId(id: string | string[] | undefined) {
  return Array.isArray(id) ? id[0] : id;
}

function canManageDecision(
  role: string | undefined,
  currentUserId: string | undefined,
  decisionUserId: string | null,
) {
  if (role === "admin") {
    return true;
  }

  return role === "manager" && decisionUserId === currentUserId;
}

decisionRoutes.use(isAuthenticated);

decisionRoutes.get(
  "/",
  asyncHandler(async (request, response) => {
    const { status, search, includeInactive } = listDecisionQuerySchema.parse(
      request.query,
    );
    const decisions = await prisma.decision.findMany({
      where: {
        ...(includeInactive ? {} : { active: true }),
        ...(status ? { status } : {}),
        ...(search
          ? {
              OR: [
                { title: { contains: search } },
                { context: { contains: search } },
                { decision: { contains: search } },
                { reason: { contains: search } },
                { department: { contains: search } },
              ],
            }
          : {}),
      },
      orderBy: {
        createdAt: "desc",
      },
      include: decisionInclude,
    });

    void logActivity(
      "DECISIONS_VIEWED",
      {
        total: decisions.length,
        filters: {
          status,
          search,
          includeInactive: Boolean(includeInactive),
        },
      },
      request.user?.id,
    );

    response.json(decisions);
  }),
);

decisionRoutes.post(
  "/",
  requireRole(["admin", "manager"]),
  asyncHandler(async (request, response) => {
    const { title, context, decision, reason, department, departmentId, impact } =
      createDecisionSchema.parse(request.body);
    let departmentName = department;

    if (departmentId) {
      const selectedDepartment = await prisma.department.findUnique({
        where: {
          id: departmentId,
        },
      });

      if (!selectedDepartment || !selectedDepartment.active) {
        throw new AppError("Departamento não encontrado ou inativo.", 400);
      }

      departmentName = selectedDepartment.name;
    }

    const newDecision = await prisma.decision.create({
      data: {
        title,
        context,
        decision,
        reason,
        department: departmentName,
        departmentId,
        impact,
        userId: request.user?.id,
      },
      include: decisionInclude,
    });

    void logActivity(
      "DECISION_CREATED",
      {
        decisionId: newDecision.id,
        title: newDecision.title,
        estadoNovo: newDecision,
      },
      request.user?.id,
    );
    void publishDomainEvent("decision.created", {
      decisionId: newDecision.id,
      title: newDecision.title,
      userId: request.user?.id,
    });

    response.status(201).json(newDecision);
  }),
);

decisionRoutes.put(
  "/:id",
  requireRole(["admin", "manager"]),
  asyncHandler(async (request, response) => {
    const data = updateDecisionSchema.parse(request.body);
    const decisionId = getDecisionId(request.params.id);
    let updateData = data;

    if (!decisionId) {
      throw new AppError("ID da decisão ausente.", 400);
    }

    const currentDecision = await prisma.decision.findUnique({
      where: {
        id: decisionId,
      },
    });

    if (!currentDecision || !currentDecision.active) {
      throw new AppError("Decisão não encontrada.", 404);
    }

    if (
      !canManageDecision(
        request.user?.role,
        request.user?.id,
        currentDecision.userId,
      )
    ) {
      throw new AppError("Você não pode alterar esta decisão.", 403);
    }

    if (currentDecision.status === "approved" && request.user?.role !== "admin") {
      throw new AppError(
        "Apenas administradores podem editar decisões concluídas.",
        403,
      );
    }

    if (data.departmentId) {
      const selectedDepartment = await prisma.department.findUnique({
        where: {
          id: data.departmentId,
        },
      });

      if (!selectedDepartment || !selectedDepartment.active) {
        throw new AppError("Departamento não encontrado ou inativo.", 400);
      }

      updateData = {
        ...data,
        department: selectedDepartment.name,
      };
    }

    const updatedDecision = await prisma.decision.update({
      where: {
        id: currentDecision.id,
      },
      data: updateData,
      include: decisionInclude,
    });

    const isArchiving = currentDecision.status !== "archived" && updateData.status === "archived";
    const isUnarchiving = currentDecision.status === "archived" && updateData.status !== "archived";
    const auditAction = isArchiving
      ? "DECISION_ARCHIVED"
      : isUnarchiving
        ? "DECISION_UNARCHIVED"
        : "DECISION_UPDATED";
    const eventName = isArchiving
      ? "decision.archived"
      : isUnarchiving
        ? "decision.unarchived"
        : "decision.updated";

    void logActivity(
      auditAction,
      {
        decisionId: updatedDecision.id,
        title: updatedDecision.title,
        updatedFields: Object.keys(updateData),
        estadoAnterior: currentDecision,
        estadoNovo: updatedDecision,
      },
      request.user?.id,
    );
    void publishDomainEvent(eventName, {
      decisionId: updatedDecision.id,
      title: updatedDecision.title,
      updatedFields: Object.keys(updateData),
      userId: request.user?.id,
    });

    response.json(updatedDecision);
  }),
);

decisionRoutes.delete(
  "/:id",
  requireRole(["admin", "manager"]),
  asyncHandler(async (request, response) => {
    const decisionId = getDecisionId(request.params.id);

    if (!decisionId) {
      throw new AppError("ID da decisão ausente.", 400);
    }

    const currentDecision = await prisma.decision.findUnique({
      where: {
        id: decisionId,
      },
    });

    if (!currentDecision || !currentDecision.active) {
      throw new AppError("Decisão não encontrada.", 404);
    }

    if (
      !canManageDecision(
        request.user?.role,
        request.user?.id,
        currentDecision.userId,
      )
    ) {
      throw new AppError("Você não pode inativar esta decisão.", 403);
    }

    const inactiveDecision = await prisma.decision.update({
      where: {
        id: currentDecision.id,
      },
      data: {
        active: false,
        status: "inactive",
        deletedAt: new Date(),
      },
      include: decisionInclude,
    });

    void logActivity(
      "DECISION_DELETED",
      {
        decisionId: currentDecision.id,
        title: currentDecision.title,
        estadoAnterior: currentDecision,
        estadoNovo: inactiveDecision,
      },
      request.user?.id,
    );
    void publishDomainEvent("decision.inactivated", {
      decisionId: currentDecision.id,
      title: currentDecision.title,
      userId: request.user?.id,
    });

    response.json(inactiveDecision);
  }),
);

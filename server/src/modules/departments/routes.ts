import { Router } from "express";
import { AppError } from "../../errors/AppError";
import { logActivity } from "../../lib/mongodb";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../middlewares/asyncHandler";
import { isAuthenticated } from "../../middlewares/isAuthenticated";
import { requireRole } from "../../middlewares/requireRole";
import {
  createDepartmentSchema,
  updateDepartmentSchema,
} from "../../schemas/department";

export const departmentRoutes = Router();

function getParamId(id: string | string[] | undefined) {
  return Array.isArray(id) ? id[0] : id;
}

departmentRoutes.use(isAuthenticated);

departmentRoutes.get(
  "/",
  asyncHandler(async (request, response) => {
    const includeInactive = request.query.includeInactive === "true";
    const departments = await prisma.department.findMany({
      where: {
        companyId: request.user?.companyId,
        deletedAt: null,
        ...(includeInactive ? {} : { active: true }),
      },
      include: {
        _count: {
          select: {
            users: true,
            decisions: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    response.json(
      departments.map((department) => ({
        ...department,
        userCount: department._count.users,
        decisionCount: department._count.decisions,
      })),
    );
  }),
);

departmentRoutes.post(
  "/",
  requireRole(["admin"]),
  asyncHandler(async (request, response) => {
    const data = createDepartmentSchema.parse(request.body);
    const existingDepartment = await prisma.department.findFirst({
      where: {
        name: data.name,
        companyId: request.user?.companyId,
      },
    });

    if (existingDepartment && !existingDepartment.deletedAt) {
      if (!existingDepartment.active) {
        const department = await prisma.department.update({
          where: {
            id: existingDepartment.id,
          },
          data: {
            active: true,
          },
          include: {
            _count: {
              select: {
                users: true,
                decisions: true,
              },
            },
          },
        });

        response.status(200).json(department);
        return;
      }

      throw new AppError("Departamento já cadastrado.", 409);
    }

    const department = await prisma.department.create({
      data: {
        ...data,
        companyId: request.user?.companyId || "",
      },
      include: {
        _count: {
          select: {
            users: true,
            decisions: true,
          },
        },
      },
    });

    void logActivity(
      "DEPARTMENT_CREATED",
      { departmentId: department.id, companyId: department.companyId, estadoNovo: department },
      request.user?.id,
      request.user?.companyId,
    );

    response.status(201).json(department);
  }),
);

departmentRoutes.patch(
  "/:id",
  requireRole(["admin"]),
  asyncHandler(async (request, response) => {
    const departmentId = getParamId(request.params.id);

    if (!departmentId) {
      throw new AppError("ID do departamento ausente.", 400);
    }

    const data = updateDepartmentSchema.parse(request.body);
    const currentDepartment = await prisma.department.findFirst({
      where: {
        id: departmentId,
        companyId: request.user?.companyId,
      },
    });

    if (!currentDepartment) {
      throw new AppError("Departamento não encontrado.", 404);
    }

    const department = await prisma.department.update({
      where: {
        id: departmentId,
      },
      data,
      include: {
        _count: {
          select: {
            users: true,
            decisions: true,
          },
        },
      },
    });

    void logActivity(
      "DEPARTMENT_UPDATED",
      {
        departmentId: department.id,
        companyId: department.companyId,
        estadoAnterior: currentDepartment,
        estadoNovo: department,
      },
      request.user?.id,
      request.user?.companyId,
    );

    response.json(department);
  }),
);

departmentRoutes.delete(
  "/:id",
  requireRole(["admin"]),
  asyncHandler(async (request, response) => {
    const departmentId = getParamId(request.params.id);

    if (!departmentId) {
      throw new AppError("ID do departamento ausente.", 400);
    }

    const currentDepartment = await prisma.department.findFirst({
      where: {
        id: departmentId,
        companyId: request.user?.companyId,
      },
    });

    if (!currentDepartment || currentDepartment.deletedAt) {
      throw new AppError("Departamento não encontrado.", 404);
    }

    const department = await prisma.department.update({
      where: {
        id: departmentId,
      },
      data: {
        active: false,
        deletedAt: new Date(),
        name: `excluido-${departmentId.slice(0, 8)}-${currentDepartment.name}`,
      },
    });

    void logActivity(
      "DEPARTMENT_DELETED",
      {
        departmentId,
        companyId: currentDepartment.companyId,
        estadoAnterior: currentDepartment,
        estadoNovo: department,
      },
      request.user?.id,
      request.user?.companyId,
    );

    response.json(department);
  }),
);

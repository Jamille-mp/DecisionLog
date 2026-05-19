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
      where: includeInactive ? {} : { active: true },
      orderBy: {
        name: "asc",
      },
    });

    response.json(departments);
  }),
);

departmentRoutes.post(
  "/",
  requireRole(["admin"]),
  asyncHandler(async (request, response) => {
    const data = createDepartmentSchema.parse(request.body);
    const department = await prisma.department.create({
      data,
    });

    void logActivity(
      "DEPARTMENT_CREATED",
      { departmentId: department.id, estadoNovo: department },
      request.user?.id,
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
    const currentDepartment = await prisma.department.findUnique({
      where: {
        id: departmentId,
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
    });

    void logActivity(
      "DEPARTMENT_UPDATED",
      {
        departmentId: department.id,
        estadoAnterior: currentDepartment,
        estadoNovo: department,
      },
      request.user?.id,
    );

    response.json(department);
  }),
);

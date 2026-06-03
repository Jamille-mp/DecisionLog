import bcrypt from "bcryptjs";
import { Router } from "express";
import { AppError } from "../../errors/AppError";
import { findCompanyByEmail } from "../../lib/company";
import { logActivity } from "../../lib/mongodb";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../middlewares/asyncHandler";
import { isAuthenticated } from "../../middlewares/isAuthenticated";
import { requireRole } from "../../middlewares/requireRole";
import { updateProfileSchema, updateUserSchema } from "../../schemas/user";

export const userRoutes = Router();

function getParamId(id: string | string[] | undefined) {
  return Array.isArray(id) ? id[0] : id;
}

userRoutes.use(isAuthenticated);

const profileSelect = {
  id: true,
  companyId: true,
  company: true,
  name: true,
  email: true,
  phone: true,
  avatarUrl: true,
  preferredTheme: true,
  departmentId: true,
  department: true,
  role: true,
  active: true,
  termsAcceptedAt: true,
  privacyAcceptedAt: true,
  createdAt: true,
};

userRoutes.get(
  "/me",
  asyncHandler(async (request, response) => {
    const user = await prisma.user.findUnique({
      where: {
        id: request.user?.id,
      },
      select: profileSelect,
    });

    if (!user || !user.active) {
      throw new AppError("Usuário não encontrado.", 404);
    }

    response.json(user);
  }),
);

userRoutes.patch(
  "/me",
  asyncHandler(async (request, response) => {
    const data = updateProfileSchema.parse(request.body);
    const currentUser = await prisma.user.findUnique({
      where: {
        id: request.user?.id,
      },
    });

    if (!currentUser || !currentUser.active) {
      throw new AppError("Usuário não encontrado.", 404);
    }

    const updateData: {
      name?: string;
      email?: string;
      phone?: string | null;
      avatarUrl?: string | null;
      preferredTheme?: string;
      passwordHash?: string;
    } = {};

    if (data.name) updateData.name = data.name;
    if (data.email && data.email !== currentUser.email) {
      const emailCompany = await findCompanyByEmail(data.email);

      if (emailCompany.id !== currentUser.companyId) {
        throw new AppError(
          "O novo e-mail precisa pertencer ao domínio da sua empresa.",
          403,
        );
      }

      const existingEmail = await prisma.user.findUnique({
        where: {
          email: data.email,
        },
      });

      if (existingEmail) {
        throw new AppError("E-mail já cadastrado.", 409);
      }

      updateData.email = data.email;
    }
    if (data.phone !== undefined) updateData.phone = data.phone || null;
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl || null;
    if (data.preferredTheme) updateData.preferredTheme = data.preferredTheme;

    if (data.companyLogoUrl !== undefined && currentUser.role !== "admin") {
      throw new AppError("Apenas administradores podem alterar a foto da empresa.", 403);
    }

    if (data.newPassword) {
      const passwordMatches = await bcrypt.compare(
        data.currentPassword || "",
        currentUser.passwordHash,
      );

      if (!passwordMatches) {
        throw new AppError("Senha atual inválida.", 401);
      }

      updateData.passwordHash = await bcrypt.hash(data.newPassword, 10);
    }

    if (data.companyLogoUrl !== undefined) {
      await prisma.company.update({
        where: {
          id: currentUser.companyId,
        },
        data: {
          logoUrl: data.companyLogoUrl || null,
        },
      });
    }

    const user =
      Object.keys(updateData).length > 0
        ? await prisma.user.update({
            where: {
              id: currentUser.id,
            },
            data: updateData,
            select: profileSelect,
          })
        : await prisma.user.findUnique({
            where: {
              id: currentUser.id,
            },
            select: profileSelect,
          });

    if (!user) {
      throw new AppError("UsuÃ¡rio nÃ£o encontrado.", 404);
    }

    void logActivity(
      "PROFILE_UPDATED",
      {
        userId: currentUser.id,
        companyId: currentUser.companyId,
        campos: [
          ...Object.keys(updateData).filter((key) => key !== "passwordHash"),
          ...(data.companyLogoUrl !== undefined ? ["companyLogoUrl"] : []),
        ],
        senhaAlterada: Boolean(updateData.passwordHash),
      },
      request.user?.id,
      request.user?.companyId,
    );

    response.json(user);
  }),
);

userRoutes.delete(
  "/:id",
  requireRole(["admin"]),
  asyncHandler(async (request, response) => {
    const userId = getParamId(request.params.id);

    if (!userId) {
      throw new AppError("ID do usuário ausente.", 400);
    }

    if (userId === request.user?.id) {
      throw new AppError("Você não pode excluir a própria conta.", 400);
    }

    const currentUser = await prisma.user.findFirst({
      where: {
        id: userId,
        companyId: request.user?.companyId,
      },
    });

    if (!currentUser) {
      throw new AppError("Usuário não encontrado.", 404);
    }

    const deletedUser = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        active: false,
        name: `Usuário excluído ${currentUser.id.slice(0, 8)}`,
        email: `deleted-${currentUser.id}@decisionlog.local`,
        phone: null,
        avatarUrl: null,
        departmentId: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });

    void logActivity(
      "USER_DELETED",
      {
        userId,
        companyId: currentUser.companyId,
        estadoAnterior: {
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          role: currentUser.role,
          active: currentUser.active,
        },
        estadoNovo: deletedUser,
      },
      request.user?.id,
      request.user?.companyId,
    );

    response.json(deletedUser);
  }),
);

userRoutes.use(requireRole(["admin"]));

userRoutes.get(
  "/",
  asyncHandler(async (request, response) => {
    const includeDeleted = request.query.includeDeleted === "true";
    const users = await prisma.user.findMany({
      where: {
        companyId: request.user?.companyId,
        ...(includeDeleted
          ? {}
          : {
              email: {
                not: {
                  startsWith: "deleted-",
                },
              },
            }),
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        companyId: true,
        company: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
        preferredTheme: true,
        departmentId: true,
        department: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });

    response.json(users);
  }),
);

userRoutes.patch(
  "/:id",
  asyncHandler(async (request, response) => {
    const userId = getParamId(request.params.id);

    if (!userId) {
      throw new AppError("ID do usuário ausente.", 400);
    }

    if (userId === request.user?.id && request.body.active === false) {
      throw new AppError("Você não pode inativar a própria conta.", 400);
    }

    const data = updateUserSchema.parse(request.body);
    const currentUser = await prisma.user.findFirst({
      where: {
        id: userId,
        companyId: request.user?.companyId,
      },
    });

    if (!currentUser) {
      throw new AppError("Usuário não encontrado.", 404);
    }

    if (data.departmentId) {
      const department = await prisma.department.findFirst({
        where: {
          id: data.departmentId,
          companyId: request.user?.companyId,
        },
      });

      if (!department || !department.active) {
        throw new AppError("Departamento não encontrado ou inativo.", 400);
      }
    }

    const user = await prisma.user.update({
      where: {
        id: userId,
      },
      data,
      select: {
        id: true,
        companyId: true,
        company: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
        preferredTheme: true,
        departmentId: true,
        department: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });

    void logActivity(
      "USER_UPDATED",
      {
        userId,
        companyId: currentUser.companyId,
        estadoAnterior: {
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          role: currentUser.role,
          active: currentUser.active,
        },
        estadoNovo: user,
      },
      request.user?.id,
      request.user?.companyId,
    );

    response.json(user);
  }),
);

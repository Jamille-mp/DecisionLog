import bcrypt from "bcryptjs";
import { Router } from "express";
import { AppError } from "../../errors/AppError";
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
  name: true,
  email: true,
  phone: true,
  preferredTheme: true,
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
      phone?: string | null;
      preferredTheme?: string;
      passwordHash?: string;
    } = {};

    if (data.name) updateData.name = data.name;
    if (data.phone !== undefined) updateData.phone = data.phone || null;
    if (data.preferredTheme) updateData.preferredTheme = data.preferredTheme;

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

    const user = await prisma.user.update({
      where: {
        id: currentUser.id,
      },
      data: updateData,
      select: profileSelect,
    });

    void logActivity(
      "PROFILE_UPDATED",
      {
        userId: currentUser.id,
        campos: Object.keys(updateData).filter((key) => key !== "passwordHash"),
        senhaAlterada: Boolean(updateData.passwordHash),
      },
      request.user?.id,
    );

    response.json(user);
  }),
);

userRoutes.use(requireRole(["admin"]));

userRoutes.get(
  "/",
  asyncHandler(async (_request, response) => {
    const users = await prisma.user.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        preferredTheme: true,
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
    const currentUser = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!currentUser) {
      throw new AppError("Usuário não encontrado.", 404);
    }

    const user = await prisma.user.update({
      where: {
        id: userId,
      },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        preferredTheme: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });

    void logActivity(
      "USER_UPDATED",
      {
        userId,
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
    );

    response.json(user);
  }),
);

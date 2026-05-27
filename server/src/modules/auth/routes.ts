import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "../../errors/AppError";
import { logActivity } from "../../lib/mongodb";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../middlewares/asyncHandler";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "../../schemas/auth";

export const authRoutes = Router();

authRoutes.post(
  "/register",
  asyncHandler(async (request, response) => {
    const data = registerSchema.parse(request.body);
    const existingUser = await prisma.user.findUnique({
      where: {
        email: data.email,
      },
    });

    if (existingUser) {
      throw new AppError("E-mail já cadastrado.", 409);
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const acceptedAt = new Date();
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role: data.role,
        termsAcceptedAt: acceptedAt,
        privacyAcceptedAt: acceptedAt,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        termsAcceptedAt: true,
        privacyAcceptedAt: true,
        createdAt: true,
      },
    });

    void logActivity(
      "USER_REGISTERED",
      { userId: user.id, email: user.email, role: user.role },
      user.id,
    );

    response.status(201).json(user);
  }),
);

authRoutes.post(
  "/login",
  asyncHandler(async (request, response) => {
    const data = loginSchema.parse(request.body);
    const user = await prisma.user.findUnique({
      where: {
        email: data.email,
      },
    });

    if (!user || !user.active) {
      throw new AppError("Credenciais inválidas.", 401);
    }

    const passwordMatches = await bcrypt.compare(data.password, user.passwordHash);

    if (!passwordMatches) {
      throw new AppError("Credenciais inválidas.", 401);
    }

    const token = jwt.sign(
      {
        email: user.email,
        role: user.role,
        active: user.active,
      },
      process.env.JWT_SECRET || "dev-secret",
      {
        subject: user.id,
        expiresIn: "1d",
      },
    );

    void logActivity(
      "USER_LOGGED_IN",
      { userId: user.id, email: user.email, role: user.role },
      user.id,
    );

    response.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        preferredTheme: user.preferredTheme,
        role: user.role,
      },
    });
  }),
);

authRoutes.post(
  "/forgot-password",
  asyncHandler(async (request, response) => {
    const data = forgotPasswordSchema.parse(request.body);
    const user = await prisma.user.findUnique({
      where: {
        email: data.email,
      },
    });

    const message =
      "Se o e-mail estiver cadastrado, enviaremos as instruções de recuperação.";

    if (!user || !user.active) {
      response.json({ message });
      return;
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const passwordResetTokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    const passwordResetExpiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        passwordResetTokenHash,
        passwordResetExpiresAt,
      },
    });

    void logActivity(
      "PASSWORD_RESET_REQUESTED",
      { userId: user.id, email: user.email },
      user.id,
    );

    response.json({
      message,
      ...(process.env.NODE_ENV === "production" ? {} : { resetToken }),
    });
  }),
);

authRoutes.post(
  "/reset-password",
  asyncHandler(async (request, response) => {
    const data = resetPasswordSchema.parse(request.body);
    const passwordResetTokenHash = crypto
      .createHash("sha256")
      .update(data.token)
      .digest("hex");

    const user = await prisma.user.findFirst({
      where: {
        passwordResetTokenHash,
        passwordResetExpiresAt: {
          gt: new Date(),
        },
        active: true,
      },
    });

    if (!user) {
      throw new AppError("Token de recuperação inválido ou expirado.", 400);
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        passwordHash,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
      },
    });

    void logActivity(
      "PASSWORD_RESET_COMPLETED",
      { userId: user.id, email: user.email },
      user.id,
    );

    response.json({ message: "Senha atualizada com sucesso." });
  }),
);

import bcrypt from "bcryptjs";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "../../errors/AppError";
import { logActivity } from "../../lib/mongodb";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../middlewares/asyncHandler";
import { loginSchema, registerSchema } from "../../schemas/auth";

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
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    void logActivity(
      "USER_REGISTERED",
      { userId: user.id, email: user.email },
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

    if (!user) {
      throw new AppError("Credenciais inválidas.", 401);
    }

    const passwordMatches = await bcrypt.compare(data.password, user.passwordHash);

    if (!passwordMatches) {
      throw new AppError("Credenciais inválidas.", 401);
    }

    const token = jwt.sign(
      {
        email: user.email,
      },
      process.env.JWT_SECRET || "dev-secret",
      {
        subject: user.id,
        expiresIn: "1d",
      },
    );

    void logActivity(
      "USER_LOGGED_IN",
      { userId: user.id, email: user.email },
      user.id,
    );

    response.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  }),
);

import bcrypt from "bcryptjs";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { ZodError } from "zod";
import { logActivity } from "../../lib/mongodb";
import { prisma } from "../../lib/prisma";
import { loginSchema, registerSchema } from "../../schemas/auth";

export const authRoutes = Router();

authRoutes.post("/register", async (request, response) => {
  try {
    const data = registerSchema.parse(request.body);
    const existingUser = await prisma.user.findUnique({
      where: {
        email: data.email,
      },
    });

    if (existingUser) {
      response.status(409).json({ error: "E-mail ja cadastrado." });
      return;
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

    void logActivity("USER_REGISTERED", { userId: user.id, email: user.email }, user.id);

    response.status(201).json(user);
  } catch (error) {
    if (error instanceof ZodError) {
      response.status(400).json({ error: "Dados invalidos.", issues: error.issues });
      return;
    }

    console.error("Error registering user:", error);
    response.status(500).json({ error: "Erro ao cadastrar usuario." });
  }
});

authRoutes.post("/login", async (request, response) => {
  try {
    const data = loginSchema.parse(request.body);
    const user = await prisma.user.findUnique({
      where: {
        email: data.email,
      },
    });

    if (!user) {
      response.status(401).json({ error: "Credenciais invalidas." });
      return;
    }

    const passwordMatches = await bcrypt.compare(data.password, user.passwordHash);

    if (!passwordMatches) {
      response.status(401).json({ error: "Credenciais invalidas." });
      return;
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

    void logActivity("USER_LOGGED_IN", { userId: user.id, email: user.email }, user.id);

    response.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      response.status(400).json({ error: "Dados invalidos.", issues: error.issues });
      return;
    }

    console.error("Error logging in:", error);
    response.status(500).json({ error: "Erro ao fazer login." });
  }
});

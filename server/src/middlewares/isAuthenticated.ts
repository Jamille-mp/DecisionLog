import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

type UserRole = "admin" | "manager" | "auditor";

type TokenPayload = {
  sub: string;
  companyId?: string;
  email: string;
  role?: UserRole;
};

export function isAuthenticated(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const authHeader = request.headers.authorization;

  if (!authHeader) {
    response.status(401).json({ error: "Token ausente." });
    return;
  }

  const [, token] = authHeader.split(" ");

  if (!token) {
    response.status(401).json({ error: "Token inválido." });
    return;
  }

  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET || "dev-secret",
    ) as TokenPayload;

    request.user = {
      id: payload.sub,
      companyId: payload.companyId || "",
      email: payload.email,
      role: payload.role || "manager",
    };

    next();
  } catch {
    response.status(401).json({ error: "Token inválido." });
  }
}

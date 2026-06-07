import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { getJwtSecret } from "../lib/secrets";

type UserRole = "admin" | "manager" | "auditor";

type TokenPayload = {
  active?: boolean;
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

  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    response.status(401).json({ error: "Token inválido." });
    return;
  }

  try {
    const payload = jwt.verify(token, getJwtSecret()) as TokenPayload;

    if (
      !payload.sub ||
      !payload.companyId ||
      !payload.email ||
      !payload.role ||
      payload.active === false
    ) {
      response.status(401).json({ error: "Token inválido." });
      return;
    }

    request.user = {
      id: payload.sub,
      companyId: payload.companyId,
      email: payload.email,
      role: payload.role,
    };

    next();
  } catch {
    response.status(401).json({ error: "Token inválido." });
  }
}

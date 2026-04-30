import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

type TokenPayload = {
  sub: string;
  email: string;
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
    response.status(401).json({ error: "Token invalido." });
    return;
  }

  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET || "dev-secret",
    ) as TokenPayload;

    request.user = {
      id: payload.sub,
      email: payload.email,
    };

    next();
  } catch {
    response.status(401).json({ error: "Token invalido." });
  }
}

import { NextFunction, Request, Response } from "express";

type UserRole = "admin" | "manager" | "auditor";

export function requireRole(allowedRoles: UserRole[]) {
  return (request: Request, response: Response, next: NextFunction) => {
    const role = request.user?.role;

    if (!role || !allowedRoles.includes(role)) {
      response.status(403).json({ error: "Você não tem permissão para esta ação." });
      return;
    }

    next();
  };
}

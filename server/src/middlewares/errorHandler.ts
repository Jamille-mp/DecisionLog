import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../errors/AppError";
import { captureException } from "../config/observability";

export function errorHandler(
  error: Error,
  _request: Request,
  response: Response,
  _next: NextFunction,
) {
  if (error instanceof AppError) {
    response.status(error.statusCode).json({ error: error.message });
    return;
  }

  if (error instanceof ZodError) {
    response.status(400).json({
      error: "Dados inválidos.",
      issues: error.issues,
    });
    return;
  }

  console.error(error);
  captureException(error);
  response.status(500).json({ error: "Erro interno do servidor." });
}

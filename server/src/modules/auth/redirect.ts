import type { Response } from "express";
import { AppError } from "../../errors/AppError";

export function getFrontendRedirectUrl() {
  return (
    process.env.OIDC_FRONTEND_REDIRECT_URL ||
    process.env.CLIENT_URL ||
    "http://localhost:5173"
  );
}

export function redirectWithAuthError(response: Response, error: unknown) {
  const redirectUrl = new URL(getFrontendRedirectUrl());
  const message =
    error instanceof AppError
      ? error.message
      : "Não foi possível validar sua conta institucional.";

  redirectUrl.hash = new URLSearchParams({
    auth_error: "access_denied",
    auth_message: message,
  }).toString();

  response.redirect(redirectUrl.toString());
}

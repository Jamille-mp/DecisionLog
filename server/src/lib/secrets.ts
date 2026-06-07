import { AppError } from "../errors/AppError";

const minimumSecretLength = 32;

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret && process.env.NODE_ENV === "production") {
    throw new AppError("JWT_SECRET precisa estar configurado em produção.", 500);
  }

  if (
    secret &&
    process.env.NODE_ENV === "production" &&
    secret.length < minimumSecretLength
  ) {
    throw new AppError("JWT_SECRET deve ter pelo menos 32 caracteres.", 500);
  }

  return secret || "test-and-development-secret";
}

export function getOidcStateSecret() {
  const secret = process.env.OIDC_STATE_SECRET || process.env.JWT_SECRET;

  if (!secret && process.env.NODE_ENV === "production") {
    throw new AppError(
      "OIDC_STATE_SECRET ou JWT_SECRET precisa estar configurado em produção.",
      500,
    );
  }

  return secret || getJwtSecret();
}

import type { CorsOptions } from "cors";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

function parseOrigins(value?: string) {
  return (value || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const defaultDevelopmentOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

export const helmetMiddleware = helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
});

export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    const allowedOrigins =
      process.env.NODE_ENV === "production"
        ? parseOrigins(process.env.CORS_ORIGIN || process.env.CLIENT_URL)
        : [...defaultDevelopmentOrigins, ...parseOrigins(process.env.CORS_ORIGIN)];

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("Origem não permitida pelo CORS."));
  },
};

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: process.env.NODE_ENV === "test" ? 10_000 : Number(process.env.RATE_LIMIT_MAX || 600),
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit:
    process.env.NODE_ENV === "test"
      ? 10_000
      : Number(process.env.AUTH_RATE_LIMIT_MAX || 30),
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

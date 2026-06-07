import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { initObservability } from "./config/observability";
import {
  apiRateLimiter,
  authRateLimiter,
  corsOptions,
  helmetMiddleware,
} from "./config/security";
import { errorHandler } from "./middlewares/errorHandler";
import { auditRoutes } from "./modules/audit/routes";
import { authRoutes } from "./modules/auth/routes";
import { departmentRoutes } from "./modules/departments/routes";
import { decisionRoutes } from "./modules/decisions/routes";
import { healthRoutes } from "./modules/health/routes";
import { userRoutes } from "./modules/users/routes";

dotenv.config();
initObservability();

const app = express();
const port = Number(process.env.PORT) || 3333;

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(helmetMiddleware);
app.use(cors(corsOptions));
app.use(apiRateLimiter);
app.use(express.json({ limit: "1mb" }));

app.use("/health", healthRoutes);
app.use("/auth", authRateLimiter, authRoutes);
app.use("/decisions", decisionRoutes);
app.use("/departments", departmentRoutes);
app.use("/users", userRoutes);
app.use("/audit-logs", auditRoutes);
app.use(errorHandler);

if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    console.log(`DecisionLog API running on http://localhost:${port}`);
  });
}

export { app };

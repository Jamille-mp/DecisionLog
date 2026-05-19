import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { errorHandler } from "./middlewares/errorHandler";
import { auditRoutes } from "./modules/audit/routes";
import { authRoutes } from "./modules/auth/routes";
import { departmentRoutes } from "./modules/departments/routes";
import { decisionRoutes } from "./modules/decisions/routes";
import { healthRoutes } from "./modules/health/routes";
import { userRoutes } from "./modules/users/routes";

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 3333;

app.use(cors());
app.use(express.json());

app.use("/health", healthRoutes);
app.use("/auth", authRoutes);
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

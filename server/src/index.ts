import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { errorHandler } from "./middlewares/errorHandler";
import { auditRoutes } from "./modules/audit/routes";
import { authRoutes } from "./modules/auth/routes";
import { decisionRoutes } from "./modules/decisions/routes";

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 3333;

app.use(cors());
app.use(express.json());

app.get("/health", (_request, response) => {
  response.json({
    status: "ok",
    service: "DecisionLog API",
  });
});

app.use("/auth", authRoutes);
app.use("/decisions", decisionRoutes);
app.use("/audit-logs", auditRoutes);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`DecisionLog API running on http://localhost:${port}`);
});

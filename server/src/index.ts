import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { ZodError } from "zod";
import { logActivity } from "./lib/mongodb";
import { prisma } from "./lib/prisma";
import { isAuthenticated } from "./middlewares/isAuthenticated";
import { authRoutes } from "./modules/auth/routes";
import { createDecisionSchema } from "./schemas/decision";

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 3333;

app.use(cors());
app.use(express.json());
app.use("/auth", authRoutes);

app.get("/health", (_request, response) => {
  response.json({
    status: "ok",
    service: "DecisionLog API",
  });
});

app.get("/decisions", isAuthenticated, async (request, response) => {
  try {
    const decisions = await prisma.decision.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    void logActivity(
      "DECISIONS_VIEWED",
      {
        total: decisions.length,
      },
      request.user?.id,
    );

    response.json(decisions);
  } catch (error) {
    console.error("Error listing decisions:", error);
    response.status(500).json({ error: "Erro ao listar decisoes" });
  }
});

app.post("/decisions", isAuthenticated, async (request, response) => {
  try {
    const { title, context, decision, reason } = createDecisionSchema.parse(
      request.body,
    );

    const newDecision = await prisma.decision.create({
      data: {
        title,
        context,
        decision,
        reason,
        userId: request.user?.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    void logActivity(
      "DECISION_CREATED",
      {
        decisionId: newDecision.id,
        title: newDecision.title,
        status: newDecision.status,
      },
      request.user?.id,
    );

    response.status(201).json(newDecision);
  } catch (error) {
    if (error instanceof ZodError) {
      response.status(400).json({
        error: "Dados invalidos.",
        issues: error.issues,
      });
      return;
    }

    console.error("Error creating decision:", error);
    response.status(500).json({ error: "Erro ao salvar decisao" });
  }
});

app.listen(port, () => {
  console.log(`DecisionLog API running on http://localhost:${port}`);
});

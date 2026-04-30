import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { logActivity } from "./lib/mongodb";
import { prisma } from "./lib/prisma";

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

app.get("/decisions", async (_request, response) => {
  try {
    const decisions = await prisma.decision.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    void logActivity("DECISIONS_VIEWED", {
      total: decisions.length,
    });

    response.json(decisions);
  } catch (error) {
    console.error("Error listing decisions:", error);
    response.status(500).json({ error: "Erro ao listar decisões" });
  }
});

app.post("/decisions", async (request, response) => {
  const { title, context, decision, reason } = request.body;

  if (!title || !context || !decision || !reason) {
    response.status(400).json({
      error: "Title, context, decision, and reason are required.",
    });
    return;
  }

  try {
    const newDecision = await prisma.decision.create({
      data: {
        title,
        context,
        decision,
        reason,
      },
    });

    void logActivity("DECISION_CREATED", {
      decisionId: newDecision.id,
      title: newDecision.title,
      status: newDecision.status,
    });

    response.status(201).json(newDecision);
  } catch (error) {
    console.error("Error creating decision:", error);
    response.status(500).json({ error: "Erro ao salvar decisão" });
  }
});

app.listen(port, () => {
  console.log(`DecisionLog API running on http://localhost:${port}`);
});

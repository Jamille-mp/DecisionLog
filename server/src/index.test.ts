import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    decision: {
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
  },
  logActivity: vi.fn(),
  listAuditLogs: vi.fn(),
  listAuditLogsByDecision: vi.fn(),
}));

vi.mock("./lib/prisma", () => ({
  prisma: mocks.prisma,
}));

vi.mock("./lib/mongodb", () => ({
  logActivity: mocks.logActivity,
  listAuditLogs: mocks.listAuditLogs,
  listAuditLogsByDecision: mocks.listAuditLogsByDecision,
}));

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret";

import { app } from "./index";

function makeToken(role: "admin" | "manager" | "auditor", userId = "user-1") {
  return jwt.sign(
    {
      email: `${role}@decisionlog.local`,
      role,
    },
    process.env.JWT_SECRET || "test-secret",
    {
      subject: userId,
      expiresIn: "1d",
    },
  );
}

describe("DecisionLog API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("autentica usuário válido e retorna token com perfil", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      name: "Jamille Admin",
      email: "admin@decisionlog.local",
      passwordHash: await bcrypt.hash("123456", 10),
      role: "admin",
    });

    const response = await request(app).post("/auth/login").send({
      email: "admin@decisionlog.local",
      password: "123456",
    });

    expect(response.status).toBe(200);
    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body.user).toMatchObject({
      id: "user-1",
      email: "admin@decisionlog.local",
      role: "admin",
    });
    expect(mocks.logActivity).toHaveBeenCalledWith(
      "USER_LOGGED_IN",
      expect.objectContaining({ role: "admin" }),
      "user-1",
    );
  });

  it("impede auditor de criar decisões", async () => {
    const response = await request(app)
      .post("/decisions")
      .set("Authorization", `Bearer ${makeToken("auditor")}`)
      .send({
        title: "Decisão",
        context: "Contexto",
        decision: "Escolha",
        reason: "Motivo",
        department: "TI",
        impact: "high",
      });

    expect(response.status).toBe(403);
    expect(mocks.prisma.decision.create).not.toHaveBeenCalled();
  });

  it("impede gestor de editar decisão concluída", async () => {
    mocks.prisma.decision.findUnique.mockResolvedValue({
      id: "decision-1",
      title: "Decisão concluída",
      status: "approved",
      active: true,
      userId: "user-1",
    });

    const response = await request(app)
      .put("/decisions/decision-1")
      .set("Authorization", `Bearer ${makeToken("manager")}`)
      .send({
        title: "Novo título",
      });

    expect(response.status).toBe(403);
    expect(mocks.prisma.decision.update).not.toHaveBeenCalled();
  });

  it("inativa decisão por soft delete e registra estado anterior e novo", async () => {
    const currentDecision = {
      id: "decision-1",
      title: "Decisão antiga",
      status: "pending",
      active: true,
      userId: "user-1",
    };
    const inactiveDecision = {
      ...currentDecision,
      status: "inactive",
      active: false,
      deletedAt: new Date(),
    };

    mocks.prisma.decision.findUnique.mockResolvedValue(currentDecision);
    mocks.prisma.decision.update.mockResolvedValue(inactiveDecision);

    const response = await request(app)
      .delete("/decisions/decision-1")
      .set("Authorization", `Bearer ${makeToken("manager")}`);

    expect(response.status).toBe(200);
    expect(mocks.prisma.decision.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          active: false,
          status: "inactive",
          deletedAt: expect.any(Date),
        }),
      }),
    );
    expect(mocks.logActivity).toHaveBeenCalledWith(
      "DECISION_DELETED",
      expect.objectContaining({
        estadoAnterior: currentDecision,
        estadoNovo: inactiveDecision,
      }),
      "user-1",
    );
  });

  it("restringe auditoria a administradores e auditores", async () => {
    const response = await request(app)
      .get("/audit-logs")
      .set("Authorization", `Bearer ${makeToken("manager")}`);

    expect(response.status).toBe(403);
    expect(mocks.listAuditLogs).not.toHaveBeenCalled();
  });
});

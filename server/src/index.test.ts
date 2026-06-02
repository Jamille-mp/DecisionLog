import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    $queryRaw: vi.fn(),
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    companyDomain: {
      findUnique: vi.fn(),
    },
    department: {
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    decision: {
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
  },
  logActivity: vi.fn(),
  listAuditLogs: vi.fn(),
  listAuditLogsByDecision: vi.fn(),
  checkMongoHealth: vi.fn(),
}));

vi.mock("./lib/prisma", () => ({
  prisma: mocks.prisma,
}));

vi.mock("./lib/mongodb", () => ({
  logActivity: mocks.logActivity,
  listAuditLogs: mocks.listAuditLogs,
  listAuditLogsByDecision: mocks.listAuditLogsByDecision,
  checkMongoHealth: mocks.checkMongoHealth,
}));

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret";

import { app } from "./index";

const companyId = "company-decisionlog";

function makeToken(role: "admin" | "manager" | "auditor", userId = "user-1") {
  return jwt.sign(
    {
      email: `${role}@decisionlog.local`,
      companyId,
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
    mocks.prisma.companyDomain.findUnique.mockResolvedValue({
      id: "domain-1",
      domain: "decisionlog.local",
      active: true,
      company: {
        id: companyId,
        name: "DecisionLog",
        slug: "decisionlog",
        active: true,
      },
    });
  });

  it("autentica usuário válido e retorna token com perfil", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      companyId,
      name: "Jamille Admin",
      email: "admin@decisionlog.local",
      passwordHash: await bcrypt.hash("DecisionLog@26", 10),
      role: "admin",
      active: true,
    });

    const response = await request(app).post("/auth/login").send({
      email: "admin@decisionlog.local",
      password: "DecisionLog@26",
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
      companyId,
    );
  });

  it("mantém OpenID Connect desativado quando não há provedor configurado", async () => {
    const response = await request(app).get("/auth/oidc/config");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      enabled: false,
      providerName: expect.any(String),
    });
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

  it("permite gestor criar decisão e registra auditoria e evento", async () => {
    const departmentId = "11111111-1111-4111-8111-111111111111";
    const createdDecision = {
      id: "decision-created",
      title: "Nova política de segurança",
      context: "Contexto",
      decision: "Escolha",
      reason: "Motivo",
      department: "TI",
      departmentId,
      companyId,
      impact: "high",
      status: "pending",
      active: true,
      userId: "user-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mocks.prisma.department.findFirst.mockResolvedValueOnce({
      id: departmentId,
      companyId,
      name: "TI",
      active: true,
    });
    mocks.prisma.decision.create.mockResolvedValue(createdDecision);

    const response = await request(app)
      .post("/decisions")
      .set("Authorization", `Bearer ${makeToken("manager")}`)
      .send({
        title: "Nova política de segurança",
        context: "Contexto",
        decision: "Escolha",
        reason: "Motivo",
        department: "TI",
        departmentId,
        impact: "high",
      });

    expect(response.status).toBe(201);
    expect(mocks.prisma.decision.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Nova política de segurança",
          companyId,
          departmentId,
          userId: "user-1",
        }),
      }),
    );
    expect(mocks.logActivity).toHaveBeenCalledWith(
      "DECISION_CREATED",
      expect.objectContaining({ estadoNovo: createdDecision }),
      "user-1",
      companyId,
    );
  });

  it("lista decisões com filtros de status e busca", async () => {
    mocks.prisma.decision.findMany.mockResolvedValue([]);

    const response = await request(app)
      .get("/decisions?status=approved&search=segurança")
      .set("Authorization", `Bearer ${makeToken("admin")}`);

    expect(response.status).toBe(200);
    expect(mocks.prisma.decision.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          active: true,
          companyId,
          status: "approved",
          AND: expect.any(Array),
        }),
      }),
    );
  });

  it("impede gestor de editar decisão concluída", async () => {
    mocks.prisma.decision.findFirst.mockResolvedValue({
      id: "decision-1",
      companyId,
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

  it("desarquiva decisão e registra ação específica de auditoria", async () => {
    const currentDecision = {
      id: "decision-archived",
      companyId,
      title: "Decisão arquivada",
      status: "archived",
      active: true,
      userId: "user-1",
    };
    const updatedDecision = {
      ...currentDecision,
      status: "pending",
    };

    mocks.prisma.decision.findFirst.mockResolvedValue(currentDecision);
    mocks.prisma.decision.update.mockResolvedValue(updatedDecision);

    const response = await request(app)
      .put("/decisions/decision-archived")
      .set("Authorization", `Bearer ${makeToken("manager")}`)
      .send({ status: "pending" });

    expect(response.status).toBe(200);
    expect(mocks.logActivity).toHaveBeenCalledWith(
      "DECISION_UNARCHIVED",
      expect.objectContaining({
        estadoAnterior: currentDecision,
        estadoNovo: updatedDecision,
      }),
      "user-1",
      companyId,
    );
  });

  it("inativa decisão por soft delete e registra estado anterior e novo", async () => {
    const currentDecision = {
      id: "decision-1",
      companyId,
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

    mocks.prisma.decision.findFirst.mockResolvedValue(currentDecision);
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
      companyId,
    );
  });

  it("restringe auditoria a administradores e auditores", async () => {
    const response = await request(app)
      .get("/audit-logs")
      .set("Authorization", `Bearer ${makeToken("manager")}`);

    expect(response.status).toBe(403);
    expect(mocks.listAuditLogs).not.toHaveBeenCalled();
  });

  it("lista histórico de auditoria de uma decisão específica", async () => {
    mocks.listAuditLogsByDecision.mockResolvedValue([
      {
        _id: { toString: () => "log-1" },
        action: "DECISION_UPDATED",
        userId: "user-1",
        details: { decisionId: "decision-1" },
        timestamp: new Date(),
      },
    ]);

    const response = await request(app)
      .get("/audit-logs/decisions/decision-1")
      .set("Authorization", `Bearer ${makeToken("admin")}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(mocks.listAuditLogsByDecision).toHaveBeenCalledWith(
      "decision-1",
      50,
      companyId,
    );
  });

  it("permite administrador alterar perfil de usuário", async () => {
    mocks.prisma.user.findFirst.mockResolvedValue({
      id: "user-2",
      companyId,
      name: "Auditor",
      email: "auditor@decisionlog.local",
      role: "auditor",
      active: true,
      passwordHash: "hash",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mocks.prisma.user.update.mockResolvedValue({
      id: "user-2",
      companyId,
      name: "Auditor",
      email: "auditor@decisionlog.local",
      role: "manager",
      active: true,
      createdAt: new Date(),
    });

    const response = await request(app)
      .patch("/users/user-2")
      .set("Authorization", `Bearer ${makeToken("admin")}`)
      .send({ role: "manager" });

    expect(response.status).toBe(200);
    expect(response.body.role).toBe("manager");
  });

  it("oculta usuários excluídos da listagem administrativa por padrão", async () => {
    mocks.prisma.user.findMany.mockResolvedValue([]);

    const response = await request(app)
      .get("/users")
      .set("Authorization", `Bearer ${makeToken("admin")}`);

    expect(response.status).toBe(200);
    expect(mocks.prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          email: expect.objectContaining({
            not: expect.objectContaining({
              startsWith: "deleted-",
            }),
          }),
        }),
      }),
    );
  });

  it("cria departamento ativo", async () => {
    mocks.prisma.department.findFirst.mockResolvedValue(null);
    mocks.prisma.department.create.mockResolvedValue({
      id: "department-1",
      companyId,
      name: "Inovação",
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await request(app)
      .post("/departments")
      .set("Authorization", `Bearer ${makeToken("admin")}`)
      .send({ name: "Inovação" });

    expect(response.status).toBe(201);
    expect(response.body.name).toBe("Inovação");
  });

  it("retorna health check completo", async () => {
    mocks.prisma.$queryRaw.mockResolvedValue([{ "1": 1 }]);
    mocks.checkMongoHealth.mockResolvedValue(undefined);

    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body.checks.mysql).toBe("ok");
    expect(response.body.checks.mongodb).toBe("ok");
    expect(response.body.checks.events).toEqual(
      expect.objectContaining({ state: expect.any(String) }),
    );
  });

  it("exige aceite de termos e privacidade no cadastro", async () => {
    const response = await request(app).post("/auth/register").send({
      name: "Nova Usuaria",
      email: "nova@decisionlog.local",
      password: "DecisionLog@26",
    });

    expect(response.status).toBe(400);
    expect(mocks.prisma.user.create).not.toHaveBeenCalled();
  });

  it("rejeita cadastro com senha fraca", async () => {
    const response = await request(app).post("/auth/register").send({
      name: "Nova Usuaria",
      email: "fraca@decisionlog.local",
      password: "12345678",
      acceptedTerms: true,
      acceptedPrivacy: true,
    });

    expect(response.status).toBe(400);
    expect(mocks.prisma.user.create).not.toHaveBeenCalled();
  });

  it("cadastra usuario com consentimento LGPD registrado", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue(null);
    mocks.prisma.user.create.mockResolvedValue({
      id: "user-2",
      companyId,
      name: "Nova Usuaria",
      email: "nova@decisionlog.local",
      role: "manager",
      termsAcceptedAt: new Date(),
      privacyAcceptedAt: new Date(),
      createdAt: new Date(),
    });

    const response = await request(app).post("/auth/register").send({
      name: "Nova Usuaria",
      email: "nova@decisionlog.local",
      password: "DecisionLog@26",
      acceptedTerms: true,
      acceptedPrivacy: true,
    });

    expect(response.status).toBe(201);
    expect(mocks.prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          termsAcceptedAt: expect.any(Date),
          privacyAcceptedAt: expect.any(Date),
        }),
      }),
    );
  });

  it("gera token de recuperacao de senha sem revelar existencia do email", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      name: "Jamille Admin",
      email: "admin@decisionlog.local",
      active: true,
    });
    mocks.prisma.user.update.mockResolvedValue({});

    const response = await request(app).post("/auth/forgot-password").send({
      email: "admin@decisionlog.local",
    });

    expect(response.status).toBe(200);
    expect(response.body.resetToken).toEqual(expect.any(String));
    expect(mocks.prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          passwordResetTokenHash: expect.any(String),
          passwordResetExpiresAt: expect.any(Date),
        }),
      }),
    );
  });

  it("redefine senha com token valido e limpa token usado", async () => {
    const resetToken = "a".repeat(64);
    const passwordResetTokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    mocks.prisma.user.findFirst.mockResolvedValue({
      id: "user-1",
      email: "admin@decisionlog.local",
      active: true,
      passwordResetTokenHash,
      passwordResetExpiresAt: new Date(Date.now() + 30_000),
    });
    mocks.prisma.user.update.mockResolvedValue({});

    const response = await request(app).post("/auth/reset-password").send({
      token: resetToken,
      password: "NovaSenha@26",
    });

    expect(response.status).toBe(200);
    expect(mocks.prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          passwordHash: expect.any(String),
          passwordResetTokenHash: null,
          passwordResetExpiresAt: null,
        }),
      }),
    );
  });
});

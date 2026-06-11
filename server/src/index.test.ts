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
      count: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    company: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    companyDomain: {
      findUnique: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
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
  isPasswordResetEmailConfigured: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
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

vi.mock("./lib/email", () => ({
  isPasswordResetEmailConfigured: mocks.isPasswordResetEmailConfigured,
  sendPasswordResetEmail: mocks.sendPasswordResetEmail,
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
      active: true,
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
        accessCode: "DL-DEMO01",
        active: true,
      },
    });
    mocks.isPasswordResetEmailConfigured.mockReturnValue(false);
    mocks.sendPasswordResetEmail.mockResolvedValue(false);
    mocks.prisma.refreshToken.create.mockResolvedValue({
      id: "refresh-1",
      userId: "user-1",
      tokenHash: "hash",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      revokedAt: null,
      createdAt: new Date(),
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
      company: {
        id: companyId,
        name: "DecisionLog",
        slug: "decisionlog",
        accessCode: "DL-DEMO01",
        active: true,
      },
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
    expect(response.headers["set-cookie"]?.[0]).toContain(
      "decisionlog_refresh=",
    );
    expect(response.headers["set-cookie"]?.[0]).toContain("HttpOnly");
    expect(mocks.prisma.refreshToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: "user-1" }),
      }),
    );
    expect(mocks.logActivity).toHaveBeenCalledWith(
      "USER_LOGGED_IN",
      expect.objectContaining({ role: "admin" }),
      "user-1",
      companyId,
    );
  });

  it("renova sessão com refresh token em cookie HttpOnly", async () => {
    const cookieToken = "refresh-token-test";
    const user = {
      id: "user-1",
      companyId,
      name: "Jamille Admin",
      email: "admin@decisionlog.local",
      phone: null,
      preferredTheme: "light",
      departmentId: null,
      department: null,
      company: {
        id: companyId,
        name: "DecisionLog",
        slug: "decisionlog",
        accessCode: "DL-DEMO01",
        active: true,
      },
      passwordHash: "hash",
      role: "admin",
      active: true,
    };
    const tokenHash = crypto
      .createHash("sha256")
      .update(cookieToken)
      .digest("hex");

    mocks.prisma.refreshToken.findUnique.mockResolvedValue({
      id: "refresh-1",
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      createdAt: new Date(),
      user,
    });
    mocks.prisma.refreshToken.update.mockResolvedValue({
      id: "refresh-1",
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: new Date(),
      createdAt: new Date(),
    });

    const response = await request(app)
      .post("/auth/refresh")
      .set("Cookie", [`decisionlog_refresh=${cookieToken}`]);

    expect(response.status).toBe(200);
    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body.user.email).toBe("admin@decisionlog.local");
    expect(mocks.prisma.refreshToken.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "refresh-1" } }),
    );
    expect(mocks.prisma.refreshToken.create).toHaveBeenCalled();
  });

  it("revoga refresh token no logout", async () => {
    const response = await request(app)
      .post("/auth/logout")
      .set("Cookie", ["decisionlog_refresh=logout-token"]);

    expect(response.status).toBe(204);
    expect(mocks.prisma.refreshToken.updateMany).toHaveBeenCalled();
    expect(response.headers["set-cookie"]?.[0]).toContain(
      "decisionlog_refresh=",
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

  it("permite gestor visualizar todas as decisões da empresa", async () => {
    mocks.prisma.decision.findMany.mockResolvedValue([]);

    const response = await request(app)
      .get("/decisions")
      .set("Authorization", `Bearer ${makeToken("manager")}`);

    expect(response.status).toBe(200);
    expect(mocks.prisma.user.findUnique).not.toHaveBeenCalled();
    expect(mocks.prisma.decision.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          active: true,
          companyId,
        },
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
      departmentId: "department-ti",
    };
    const updatedDecision = {
      ...currentDecision,
      status: "pending",
    };

    mocks.prisma.decision.findFirst.mockResolvedValue(currentDecision);
    mocks.prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      companyId,
      departmentId: "department-ti",
    });
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
      departmentId: "department-ti",
    };
    const inactiveDecision = {
      ...currentDecision,
      status: "inactive",
      active: false,
      deletedAt: new Date(),
    };

    mocks.prisma.decision.findFirst.mockResolvedValue(currentDecision);
    mocks.prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      companyId,
      departmentId: "department-ti",
    });
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

  it("rejeita token sem esquema Bearer", async () => {
    const response = await request(app)
      .get("/audit-logs")
      .set("Authorization", `Token ${makeToken("admin")}`);

    expect(response.status).toBe(401);
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

  it("permite administrador alterar o nome visível da empresa", async () => {
    mocks.prisma.user.findUnique
      .mockResolvedValueOnce({
        id: "user-1",
        companyId,
        name: "Jamille Admin",
        email: "admin@decisionlog.local",
        passwordHash: "hash",
        role: "admin",
        active: true,
      })
      .mockResolvedValueOnce({
        id: "user-1",
        companyId,
        company: {
          id: companyId,
          name: "AESA",
          slug: "decisionlog",
          accessCode: "DL-DEMO01",
          active: true,
        },
        name: "Jamille Admin",
        email: "admin@decisionlog.local",
        role: "admin",
        active: true,
      });
    mocks.prisma.company.update.mockResolvedValue({
      id: companyId,
      name: "AESA",
      slug: "decisionlog",
      accessCode: "DL-DEMO01",
      active: true,
    });

    const response = await request(app)
      .patch("/users/me")
      .set("Authorization", `Bearer ${makeToken("admin")}`)
      .send({ companyName: "AESA" });

    expect(response.status).toBe(200);
    expect(response.body.company.name).toBe("AESA");
    expect(mocks.prisma.company.update).toHaveBeenCalledWith({
      where: {
        id: companyId,
      },
      data: {
        name: "AESA",
      },
    });
  });

  it("bloqueia usuário sem perfil admin de alterar o nome da empresa", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      companyId,
      name: "Gestor",
      email: "manager@decisionlog.local",
      passwordHash: "hash",
      role: "manager",
      active: true,
    });

    const response = await request(app)
      .patch("/users/me")
      .set("Authorization", `Bearer ${makeToken("manager")}`)
      .send({ companyName: "Novo Nome" });

    expect(response.status).toBe(403);
    expect(mocks.prisma.company.update).not.toHaveBeenCalled();
  });

  it("permite usuário excluir o próprio perfil com minimização de dados", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      companyId,
      name: "Jamille Admin",
      email: "admin@decisionlog.local",
      passwordHash: "hash",
      role: "admin",
      active: true,
    });
    mocks.prisma.user.update.mockResolvedValue({
      id: "user-1",
      companyId,
      name: "Usuário excluído user-1",
      email: "deleted-user-1@decisionlog.local",
      role: "admin",
      active: false,
      createdAt: new Date(),
    });
    mocks.prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

    const response = await request(app)
      .delete("/users/me")
      .set("Authorization", `Bearer ${makeToken("admin")}`);

    expect(response.status).toBe(200);
    expect(response.body.active).toBe(false);
    expect(mocks.prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: expect.objectContaining({
          active: false,
          email: "deleted-user-1@decisionlog.local",
          phone: null,
          departmentId: null,
        }),
      }),
    );
    expect(mocks.prisma.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-1",
          revokedAt: null,
        }),
      }),
    );
  });

  it("permite administrador encerrar empresa e revogar acessos", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      companyId,
      name: "Jamille Admin",
      email: "admin@decisionlog.local",
      passwordHash: "hash",
      role: "admin",
      active: true,
      company: {
        id: companyId,
        name: "DecisionLog",
        slug: "decisionlog",
        accessCode: "DL-DEMO01",
        active: true,
      },
    });
    mocks.prisma.company.update.mockResolvedValue({
      id: companyId,
      name: "DecisionLog",
      slug: "decisionlog",
      accessCode: "DL-DEMO01",
      active: false,
    });
    mocks.prisma.companyDomain.updateMany.mockResolvedValue({ count: 1 });
    mocks.prisma.user.updateMany.mockResolvedValue({ count: 3 });
    mocks.prisma.refreshToken.updateMany.mockResolvedValue({ count: 3 });

    const response = await request(app)
      .delete("/users/company")
      .set("Authorization", `Bearer ${makeToken("admin")}`);

    expect(response.status).toBe(200);
    expect(response.body.active).toBe(false);
    expect(mocks.prisma.company.update).toHaveBeenCalledWith({
      where: { id: companyId },
      data: { active: false },
    });
    expect(mocks.prisma.companyDomain.updateMany).toHaveBeenCalledWith({
      where: { companyId },
      data: { active: false },
    });
    expect(mocks.prisma.user.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { companyId },
        data: expect.objectContaining({
          active: false,
        }),
      }),
    );
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

  it("retorna health check público sem detalhes sensíveis", async () => {
    mocks.prisma.$queryRaw.mockResolvedValue([{ "1": 1 }]);
    mocks.checkMongoHealth.mockResolvedValue(undefined);

    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body.checks.mysql).toBe("ok");
    expect(response.body.checks.mongodb).toBe("ok");
    expect(response.body.checks.mongodbError).toBeUndefined();
    expect(response.body.checks.events).toEqual(
      expect.objectContaining({ state: expect.any(String), mode: expect.any(String) }),
    );
  });

  it("protege health check detalhado para administradores", async () => {
    mocks.prisma.$queryRaw.mockResolvedValue([{ "1": 1 }]);
    mocks.checkMongoHealth.mockResolvedValue(undefined);

    const unauthenticated = await request(app).get("/health/details");
    const manager = await request(app)
      .get("/health/details")
      .set("Authorization", `Bearer ${makeToken("manager")}`);
    const admin = await request(app)
      .get("/health/details")
      .set("Authorization", `Bearer ${makeToken("admin")}`);

    expect(unauthenticated.status).toBe(401);
    expect(manager.status).toBe(403);
    expect(admin.status).toBe(200);
    expect(admin.body.checks).toEqual(
      expect.objectContaining({
        mysql: "ok",
        mongodb: "ok",
        events: expect.objectContaining({ failureCount: expect.any(Number) }),
      }),
    );
  });

  it("aplica cabeçalhos básicos de segurança HTTP", async () => {
    mocks.prisma.$queryRaw.mockResolvedValue([{ "1": 1 }]);
    mocks.checkMongoHealth.mockResolvedValue(undefined);

    const response = await request(app).get("/health");

    expect(response.headers["x-powered-by"]).toBeUndefined();
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(response.headers["ratelimit"]).toBeDefined();
  });

  it("mantém resposta estável em carga leve de health check", async () => {
    mocks.prisma.$queryRaw.mockResolvedValue([{ "1": 1 }]);
    mocks.checkMongoHealth.mockResolvedValue(undefined);

    const startedAt = Date.now();
    const responses = await Promise.all(
      Array.from({ length: 40 }, () => request(app).get("/health")),
    );
    const durationMs = Date.now() - startedAt;

    expect(responses.every((response) => response.status === 200)).toBe(true);
    expect(durationMs).toBeLessThan(2_000);
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
    mocks.prisma.company.findUnique.mockResolvedValueOnce({
      id: companyId,
      name: "DecisionLog",
      slug: "decisionlog",
      accessCode: "DL-DEMO01",
      active: true,
    });
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
      companyAccessCode: "DL-DEMO01",
      role: "admin",
      acceptedTerms: true,
      acceptedPrivacy: true,
    });

    expect(response.status).toBe(201);
    expect(mocks.prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: "manager",
          termsAcceptedAt: expect.any(Date),
          privacyAcceptedAt: expect.any(Date),
        }),
      }),
    );
  });

  it("bloqueia cadastro comum com codigo de empresa invalido", async () => {
    mocks.prisma.company.findUnique.mockResolvedValueOnce(null);

    const response = await request(app).post("/auth/register").send({
      name: "Nova Usuaria",
      email: "nova@decisionlog.local",
      password: "DecisionLog@26",
      companyAccessCode: "DL-ERRADO",
      acceptedTerms: true,
      acceptedPrivacy: true,
    });

    expect(response.status).toBe(403);
    expect(mocks.prisma.user.create).not.toHaveBeenCalled();
  });

  it("cadastra empresa e cria primeiro administrador pelo domínio corporativo", async () => {
    mocks.prisma.companyDomain.findUnique.mockResolvedValueOnce(null);
    mocks.prisma.company.findUnique.mockResolvedValue(null);
    mocks.prisma.user.findUnique.mockResolvedValueOnce(null);
    mocks.prisma.company.create.mockResolvedValue({
      id: "company-aesa",
      name: "AESA",
      slug: "aesa",
      accessCode: "DL-AESA01",
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mocks.prisma.companyDomain.create.mockResolvedValue({
      id: "domain-aesa",
      companyId: "company-aesa",
      domain: "aesa-cesa.br",
      active: true,
    });
    mocks.prisma.user.create.mockResolvedValue({
      id: "admin-aesa",
      companyId: "company-aesa",
      company: { id: "company-aesa", name: "AESA", slug: "aesa" },
      name: "Jamille AESA",
      email: "2024130015@aesa-cesa.br",
      role: "admin",
      termsAcceptedAt: new Date(),
      privacyAcceptedAt: new Date(),
      createdAt: new Date(),
    });

    const response = await request(app).post("/auth/register-company").send({
      companyName: "AESA",
      name: "Jamille AESA",
      email: "2024130015@aesa-cesa.br",
      password: "DecisionLog@26",
      acceptedTerms: true,
      acceptedPrivacy: true,
    });

    expect(response.status).toBe(201);
    expect(mocks.prisma.company.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "AESA",
          slug: "aesa",
        }),
      }),
    );
    expect(mocks.prisma.companyDomain.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          domain: "aesa-cesa.br",
        }),
      }),
    );
    expect(mocks.prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: "admin",
          email: "2024130015@aesa-cesa.br",
        }),
      }),
    );
  });

  it("gera token de recuperacao e avisa quando email nao esta configurado", async () => {
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
    expect(response.body.emailConfigured).toBe(false);
    expect(response.body.emailSent).toBe(false);
    expect(response.body.resetToken).toEqual(expect.any(String));
    expect(mocks.prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          passwordResetTokenHash: expect.any(String),
          passwordResetExpiresAt: expect.any(Date),
        }),
      }),
    );
    expect(mocks.sendPasswordResetEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "admin@decisionlog.local",
        token: expect.any(String),
      }),
    );
  });

  it("envia email de recuperacao quando provedor esta configurado", async () => {
    mocks.isPasswordResetEmailConfigured.mockReturnValue(true);
    mocks.sendPasswordResetEmail.mockResolvedValue(true);
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
    expect(response.body.emailConfigured).toBe(true);
    expect(response.body.emailSent).toBe(true);
    expect(mocks.sendPasswordResetEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "admin@decisionlog.local",
        name: "Jamille Admin",
        token: expect.any(String),
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

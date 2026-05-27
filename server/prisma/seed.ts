import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

const seedUsers = [
  {
    name: "Jamille Admin",
    email: "admin@decisionlog.local",
    password: "123456",
    role: "admin",
  },
  {
    name: "Analista DecisionLog",
    email: "analista@decisionlog.local",
    password: "123456",
    role: "manager",
  },
  {
    name: "Auditor DecisionLog",
    email: "auditor@decisionlog.local",
    password: "123456",
    role: "auditor",
  },
];

const seedDepartments = [
  "Financeiro",
  "RH",
  "Operações",
  "TI",
  "Comercial",
  "Jurídico",
  "Compliance",
  "Gestão",
  "Segurança",
];

const seedDecisions = [
  {
    title: "Adotar MySQL para dados principais",
    context:
      "O sistema precisa manter usuários, decisões e status com integridade relacional.",
    decision:
      "Usar MySQL como banco principal e Prisma como camada de acesso aos dados.",
    reason:
      "Relacionamentos, migrations e consistência são essenciais para auditoria das decisões.",
    department: "TI",
    impact: "high",
    status: "approved",
    userEmail: "admin@decisionlog.local",
  },
  {
    title: "Registrar auditoria em MongoDB",
    context:
      "Os eventos de auditoria possuem estrutura flexível e podem crescer rapidamente.",
    decision:
      "Usar MongoDB para armazenar logs de criação, consulta, atualização e inativação.",
    reason:
      "Separar trilhas de auditoria do banco relacional reduz acoplamento e facilita consulta histórica.",
    department: "Compliance",
    impact: "high",
    status: "approved",
    userEmail: "admin@decisionlog.local",
  },
  {
    title: "Criar dashboard de indicadores",
    context:
      "A demonstração do projeto precisa mostrar rapidamente a situação das decisões.",
    decision:
      "Exibir totais por status e indicadores por departamento e impacto na tela principal.",
    reason:
      "Indicadores ajudam o usuário a entender o estado do sistema sem ler todos os registros.",
    department: "Gestão",
    impact: "medium",
    status: "pending",
    userEmail: "analista@decisionlog.local",
  },
  {
    title: "Arquivar proposta de planilha manual",
    context:
      "No início foi considerada uma planilha para registrar as decisões do projeto.",
    decision:
      "Arquivar a proposta e manter o registro em uma aplicação web autenticada.",
    reason:
      "Planilhas dificultam rastreabilidade, controle de acesso e auditoria futura.",
    department: "Operações",
    impact: "medium",
    status: "archived",
    userEmail: "analista@decisionlog.local",
  },
  {
    title: "Proteger rotas com JWT",
    context:
      "As decisões precisam ser associadas ao usuário que executou cada ação.",
    decision:
      "Exigir token JWT para listar, criar, atualizar e inativar decisões.",
    reason:
      "Autenticação permite vincular userId no MySQL e nos logs de auditoria.",
    department: "Segurança",
    impact: "high",
    status: "approved",
    userEmail: "admin@decisionlog.local",
  },
];

async function main() {
  const passwordHash = await bcrypt.hash("123456", 10);
  const consentAcceptedAt = new Date();

  const users = await Promise.all(
    seedUsers.map((user) =>
      prisma.user.upsert({
        where: {
          email: user.email,
        },
        update: {
          name: user.name,
          passwordHash,
          role: user.role,
          termsAcceptedAt: consentAcceptedAt,
          privacyAcceptedAt: consentAcceptedAt,
        },
        create: {
          name: user.name,
          email: user.email,
          passwordHash,
          role: user.role,
          termsAcceptedAt: consentAcceptedAt,
          privacyAcceptedAt: consentAcceptedAt,
        },
      }),
    ),
  );

  const userByEmail = new Map(users.map((user) => [user.email, user]));
  const departments = await Promise.all(
    seedDepartments.map((name) =>
      prisma.department.upsert({
        where: {
          name,
        },
        update: {
          active: true,
        },
        create: {
          name,
        },
      }),
    ),
  );
  const departmentByName = new Map(
    departments.map((department) => [department.name, department]),
  );

  await prisma.decision.deleteMany({
    where: {
      userId: {
        in: users.map((user) => user.id),
      },
    },
  });

  await prisma.decision.createMany({
    data: seedDecisions.map((decision) => ({
      title: decision.title,
      context: decision.context,
      decision: decision.decision,
      reason: decision.reason,
      department: decision.department,
      departmentId: departmentByName.get(decision.department)?.id,
      impact: decision.impact,
      status: decision.status,
      active: true,
      userId: userByEmail.get(decision.userEmail)?.id,
    })),
  });

  console.log("Seed concluído com usuários e decisões de demonstração.");
  console.log("Login admin: admin@decisionlog.local / 123456");
  console.log("Login auditor: auditor@decisionlog.local / 123456");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

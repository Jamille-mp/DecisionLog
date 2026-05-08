import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

const seedUsers = [
  {
    name: "Jamille Admin",
    email: "admin@decisionlog.local",
    password: "123456",
  },
  {
    name: "Analista DecisionLog",
    email: "analista@decisionlog.local",
    password: "123456",
  },
];

const seedDecisions = [
  {
    title: "Adotar MySQL para dados principais",
    context:
      "O sistema precisa manter usuarios, decisoes e status com integridade relacional.",
    decision:
      "Usar MySQL como banco principal e Prisma como camada de acesso aos dados.",
    reason:
      "Relacionamentos, migrations e consistencia sao essenciais para auditoria das decisoes.",
    status: "approved",
    userEmail: "admin@decisionlog.local",
  },
  {
    title: "Registrar auditoria em MongoDB",
    context:
      "Os eventos de auditoria possuem estrutura flexivel e podem crescer rapidamente.",
    decision:
      "Usar MongoDB para armazenar logs de criacao, consulta, atualizacao e exclusao.",
    reason:
      "Separar trilhas de auditoria do banco relacional reduz acoplamento e facilita consulta historica.",
    status: "approved",
    userEmail: "admin@decisionlog.local",
  },
  {
    title: "Criar dashboard de indicadores",
    context:
      "A demonstracao do projeto precisa mostrar rapidamente a situacao das decisoes.",
    decision:
      "Exibir totais por status e ultimas decisoes na tela principal do React.",
    reason:
      "Indicadores ajudam o usuario a entender o estado do sistema sem ler todos os registros.",
    status: "pending",
    userEmail: "analista@decisionlog.local",
  },
  {
    title: "Arquivar proposta de planilha manual",
    context:
      "No inicio foi considerada uma planilha para registrar as decisoes do projeto.",
    decision:
      "Arquivar a proposta e manter o registro em uma aplicacao web autenticada.",
    reason:
      "Planilhas dificultam rastreabilidade, controle de acesso e auditoria futura.",
    status: "archived",
    userEmail: "analista@decisionlog.local",
  },
  {
    title: "Proteger rotas com JWT",
    context:
      "As decisoes precisam ser associadas ao usuario que executou cada acao.",
    decision:
      "Exigir token JWT para listar, criar, atualizar e excluir decisoes.",
    reason:
      "Autenticacao permite vincular userId no MySQL e nos logs de auditoria.",
    status: "approved",
    userEmail: "admin@decisionlog.local",
  },
];

async function main() {
  const passwordHash = await bcrypt.hash("123456", 10);

  const users = await Promise.all(
    seedUsers.map((user) =>
      prisma.user.upsert({
        where: {
          email: user.email,
        },
        update: {
          name: user.name,
          passwordHash,
        },
        create: {
          name: user.name,
          email: user.email,
          passwordHash,
        },
      }),
    ),
  );

  const userByEmail = new Map(users.map((user) => [user.email, user]));

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
      status: decision.status,
      userId: userByEmail.get(decision.userEmail)?.id,
    })),
  });

  console.log("Seed concluido com usuarios e decisoes de demonstracao.");
  console.log("Login demo: admin@decisionlog.local / 123456");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

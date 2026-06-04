import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

const seedCompanies = [
  {
    name: "DecisionLog",
    slug: "decisionlog",
    accessCode: "DL-DEMO01",
    domains: ["decisionlog.local"],
  },
  {
    name: "AESA",
    slug: "aesa",
    accessCode: "DL-AESA01",
    domains: ["aesa-cesa.br"],
  },
];

const seedDepartments = [
  "Diretoria",
  "Financeiro",
  "Recursos Humanos",
  "Operações",
  "Tecnologia",
  "Comercial",
  "Jurídico",
  "Compliance",
  "Segurança da Informação",
];

const seedUsers = [
  {
    name: "Marina Costa",
    email: "admin@decisionlog.local",
    password: "DecisionLog@26",
    phone: "(11) 98888-1001",
    role: "admin",
    company: "decisionlog",
    department: "Diretoria",
  },
  {
    name: "Rafael Almeida",
    email: "analista@decisionlog.local",
    password: "DecisionLog@26",
    phone: "(11) 97777-2202",
    role: "manager",
    company: "decisionlog",
    department: "Operações",
  },
  {
    name: "Beatriz Nogueira",
    email: "auditor@decisionlog.local",
    password: "DecisionLog@26",
    phone: "(11) 96666-3303",
    role: "auditor",
    company: "decisionlog",
    department: "Compliance",
  },
  {
    name: "Jamille AESA",
    email: "2024130015@aesa-cesa.br",
    password: "DecisionLog@26",
    phone: "(82) 98888-2026",
    role: "admin",
    company: "aesa",
    department: "Diretoria",
  },
];

const seedDecisions = [
  {
    title: "Padronizar aprovação de contratos acima de R$ 50 mil",
    context:
      "A organização precisa reduzir decisões informais em contratações de maior impacto financeiro.",
    decision:
      "Toda contratação acima de R$ 50 mil passará por aprovação da Diretoria e validação do Jurídico.",
    reason:
      "A medida aumenta controle, rastreabilidade e governança sobre compromissos financeiros relevantes.",
    department: "Financeiro",
    impact: "high",
    status: "approved",
    company: "decisionlog",
    userEmail: "admin@decisionlog.local",
  },
  {
    title: "Implantar revisão trimestral de acessos",
    context:
      "Usuários mudam de função e alguns acessos permanecem ativos sem necessidade operacional.",
    decision:
      "Realizar revisão trimestral de permissões com validação de gestores e auditoria posterior.",
    reason:
      "A revisão reduz risco de acesso indevido e melhora conformidade com boas práticas de segurança.",
    department: "Segurança da Informação",
    impact: "high",
    status: "approved",
    company: "decisionlog",
    userEmail: "admin@decisionlog.local",
  },
  {
    title: "Criar fluxo único para decisões de operação",
    context:
      "As decisões operacionais estavam distribuídas em reuniões, mensagens e planilhas isoladas.",
    decision:
      "Centralizar decisões operacionais no DecisionLog com responsável, impacto e status definidos.",
    reason:
      "A centralização facilita acompanhamento, auditoria e comunicação entre áreas.",
    department: "Operações",
    impact: "medium",
    status: "pending",
    company: "decisionlog",
    userEmail: "analista@decisionlog.local",
  },
  {
    title: "Arquivar política antiga de aprovações por e-mail",
    context:
      "A política anterior permitia aprovações por e-mail sem trilha padronizada de auditoria.",
    decision:
      "Arquivar a política antiga e manter aprovações críticas registradas em sistema autenticado.",
    reason:
      "A prática antiga dificultava consulta histórica e identificação de responsáveis.",
    department: "Compliance",
    impact: "medium",
    status: "archived",
    company: "decisionlog",
    userEmail: "admin@decisionlog.local",
  },
  {
    title: "Definir indicadores mínimos do dashboard executivo",
    context:
      "A diretoria precisa visualizar rapidamente volume, pendências e impactos das decisões.",
    decision:
      "Exibir total de decisões, pendências, concluídas, arquivadas, alto impacto e distribuição por área.",
    reason:
      "Indicadores objetivos permitem acompanhamento gerencial sem exposição excessiva de detalhes.",
    department: "Diretoria",
    impact: "medium",
    status: "approved",
    company: "decisionlog",
    userEmail: "admin@decisionlog.local",
  },
  {
    title: "Revisar processo de onboarding de colaboradores",
    context:
      "Novos colaboradores recebem orientações diferentes dependendo da área responsável.",
    decision:
      "Criar checklist único de onboarding com aceite de políticas internas e validação de acesso.",
    reason:
      "Padronização reduz falhas de entrada, melhora segurança e acelera integração.",
    department: "Recursos Humanos",
    impact: "medium",
    status: "pending",
    company: "decisionlog",
    userEmail: "analista@decisionlog.local",
  },
  {
    title: "Aprovar política de retenção de logs",
    context:
      "A auditoria precisa manter histórico suficiente sem armazenar dados além do necessário.",
    decision:
      "Manter logs de auditoria pelo período definido no relatório técnico e revisar retenção anualmente.",
    reason:
      "A decisão equilibra rastreabilidade, finalidade e minimização de dados.",
    department: "Compliance",
    impact: "high",
    status: "approved",
    company: "decisionlog",
    userEmail: "auditor@decisionlog.local",
  },
  {
    title: "Avaliar integração com provedor institucional de identidade",
    context:
      "A aplicação já possui autenticação local e suporte opcional a OpenID Connect.",
    decision:
      "Preparar ativação do login institucional após definição da URL final de deploy.",
    reason:
      "O callback do provedor depende da URL real da API em homologação.",
    department: "Tecnologia",
    impact: "medium",
    status: "pending",
    company: "decisionlog",
    userEmail: "admin@decisionlog.local",
  },
  {
    title: "Consolidar exportação de histórico para auditoria",
    context:
      "Auditores precisam extrair evidências de decisões para anexar ao relatório de acompanhamento.",
    decision:
      "Disponibilizar exportação do histórico em CSV e PDF em um único controle de download.",
    reason:
      "A exportação facilita análise externa sem dar acesso administrativo ao banco de dados.",
    department: "Compliance",
    impact: "low",
    status: "approved",
    company: "decisionlog",
    userEmail: "auditor@decisionlog.local",
  },
  {
    title: "Suspender uso de planilha paralela de decisões",
    context:
      "Algumas áreas mantinham planilhas locais sem controle de versão e sem responsáveis formais.",
    decision:
      "Encerrar novas inclusões em planilhas paralelas e migrar registros relevantes para o sistema.",
    reason:
      "A medida reduz duplicidade e aumenta confiança no histórico oficial.",
    department: "Operações",
    impact: "medium",
    status: "archived",
    company: "decisionlog",
    userEmail: "analista@decisionlog.local",
  },
  {
    title: "Priorizar melhorias de responsividade antes da homologação",
    context:
      "A apresentação será visualizada em diferentes resoluções e pode ser avaliada em notebook ou projetor.",
    decision:
      "Revisar telas críticas em desktop e mobile antes de publicar a versão de homologação.",
    reason:
      "Boa responsividade melhora a experiência e atende aos critérios de avaliação da disciplina.",
    department: "Tecnologia",
    impact: "medium",
    status: "approved",
    company: "decisionlog",
    userEmail: "admin@decisionlog.local",
  },
  {
    title: "Definir política de revisão de departamentos inativos",
    context:
      "Departamentos podem ser inativados temporariamente sem perder o histórico relacionado.",
    decision:
      "Permitir ativação, inativação e exclusão lógica controlada pelo administrador.",
    reason:
      "A abordagem preserva histórico e evita recriação inconsistente de áreas.",
    department: "Diretoria",
    impact: "low",
    status: "pending",
    company: "decisionlog",
    userEmail: "admin@decisionlog.local",
  },
  {
    title: "Formalizar comitê acadêmico para decisões estratégicas",
    context:
      "A AESA precisa registrar decisões institucionais com responsáveis e justificativas centralizadas.",
    decision:
      "Criar um comitê para registrar decisões acadêmicas relevantes no DecisionLog.",
    reason:
      "A prática melhora transparência, rastreabilidade e acompanhamento entre departamentos.",
    department: "Diretoria",
    impact: "high",
    status: "pending",
    company: "aesa",
    userEmail: "2024130015@aesa-cesa.br",
  },
  {
    title: "Padronizar registro de decisões de tecnologia educacional",
    context:
      "Ferramentas acadêmicas são aprovadas em momentos diferentes e precisam de histórico consultável.",
    decision:
      "Registrar decisões sobre plataformas educacionais com impacto, contexto e responsável.",
    reason:
      "O registro facilita auditoria interna e evita perda de histórico institucional.",
    department: "Tecnologia",
    impact: "medium",
    status: "approved",
    company: "aesa",
    userEmail: "2024130015@aesa-cesa.br",
  },
];

async function main() {
  const consentAcceptedAt = new Date();

  const companies = await Promise.all(
    seedCompanies.map((company) =>
      prisma.company.upsert({
        where: {
          slug: company.slug,
        },
        update: {
          name: company.name,
          accessCode: company.accessCode,
          active: true,
        },
        create: {
          name: company.name,
          slug: company.slug,
          accessCode: company.accessCode,
          active: true,
        },
      }),
    ),
  );
  const companyBySlug = new Map(companies.map((company) => [company.slug, company]));

  await Promise.all(
    seedCompanies.flatMap((company) => {
      const savedCompany = companyBySlug.get(company.slug);

      return company.domains.map((domain) =>
        prisma.companyDomain.upsert({
          where: {
            domain,
          },
          update: {
            companyId: savedCompany?.id || "",
            active: true,
          },
          create: {
            companyId: savedCompany?.id || "",
            domain,
            active: true,
          },
        }),
      );
    }),
  );

  const departments = await Promise.all(
    seedCompanies.flatMap((company) =>
      seedDepartments.map((name) => {
        const savedCompany = companyBySlug.get(company.slug);

        return prisma.department.upsert({
          where: {
            companyId_name: {
              companyId: savedCompany?.id || "",
              name,
            },
          },
          update: {
            active: true,
            deletedAt: null,
          },
          create: {
            companyId: savedCompany?.id || "",
            name,
          },
        });
      }),
    ),
  );
  const departmentByName = new Map(
    departments.map((department) => [
      `${department.companyId}:${department.name}`,
      department,
    ]),
  );

  const users = await Promise.all(
    seedUsers.map(async (user) => {
      const passwordHash = await bcrypt.hash(user.password, 10);

      return prisma.user.upsert({
        where: {
          email: user.email,
        },
        update: {
          name: user.name,
          phone: user.phone,
          passwordHash,
          role: user.role,
          active: true,
          companyId: companyBySlug.get(user.company)?.id || "",
          departmentId: departmentByName.get(`${companyBySlug.get(user.company)?.id}:${user.department}`)?.id,
          preferredTheme: "light",
          termsAcceptedAt: consentAcceptedAt,
          privacyAcceptedAt: consentAcceptedAt,
        },
        create: {
          name: user.name,
          email: user.email,
          phone: user.phone,
          passwordHash,
          role: user.role,
          active: true,
          companyId: companyBySlug.get(user.company)?.id || "",
          departmentId: departmentByName.get(`${companyBySlug.get(user.company)?.id}:${user.department}`)?.id,
          preferredTheme: "light",
          termsAcceptedAt: consentAcceptedAt,
          privacyAcceptedAt: consentAcceptedAt,
        },
      });
    }),
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
      department: decision.department,
      companyId: companyBySlug.get(decision.company)?.id || "",
      departmentId: departmentByName.get(`${companyBySlug.get(decision.company)?.id}:${decision.department}`)?.id,
      impact: decision.impact,
      status: decision.status,
      active: true,
      userId: userByEmail.get(decision.userEmail)?.id,
    })),
  });

  console.log("Seed concluído com ambiente corporativo de demonstração.");
  console.log("Administrador: admin@decisionlog.local / DecisionLog@26");
  console.log("Gestor: analista@decisionlog.local / DecisionLog@26");
  console.log("Auditor: auditor@decisionlog.local / DecisionLog@26");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

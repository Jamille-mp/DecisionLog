import crypto from "node:crypto";
import { AppError } from "../errors/AppError";
import { prisma } from "./prisma";

export const defaultCompanyDomain = "decisionlog.local";
const accessCodePrefix = "DL";

export function getEmailDomain(email: string) {
  const [, domain] = email.toLowerCase().split("@");
  return domain || "";
}

export function createCompanySlug(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function normalizeCompanyAccessCode(code: string) {
  return code.trim().replace(/\s+/g, "").toUpperCase();
}

export function generateCompanyAccessCode() {
  const randomCode = crypto.randomBytes(4).toString("hex").slice(0, 6).toUpperCase();
  return `${accessCodePrefix}-${randomCode}`;
}

export async function generateUniqueCompanyAccessCode() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const accessCode = generateCompanyAccessCode();
    const existingCompany = await prisma.company.findUnique({
      where: {
        accessCode,
      },
    });

    if (!existingCompany) return accessCode;
  }

  throw new AppError("Não foi possível gerar o código da empresa.", 500);
}

export async function findCompanyByAccessCode(accessCode: string) {
  const company = await prisma.company.findUnique({
    where: {
      accessCode: normalizeCompanyAccessCode(accessCode),
    },
  });

  if (!company?.active) {
    throw new AppError("Código da empresa inválido.", 403);
  }

  return company;
}

export async function assertCompanyAccessCode(companyId: string, accessCode: string) {
  const company = await findCompanyByAccessCode(accessCode);

  if (company.id !== companyId) {
    throw new AppError("Código da empresa não corresponde ao e-mail informado.", 403);
  }

  return company;
}

export async function findCompanyByEmail(email: string) {
  const domain = getEmailDomain(email);

  if (!domain) {
    throw new AppError("E-mail corporativo inválido.", 400);
  }

  const companyDomain = await prisma.companyDomain.findUnique({
    where: {
      domain,
    },
    include: {
      company: true,
    },
  });

  if (!companyDomain?.active || !companyDomain.company.active) {
    throw new AppError(
      "Domínio corporativo não autorizado para acesso ao DecisionLog.",
      403,
    );
  }

  return companyDomain.company;
}

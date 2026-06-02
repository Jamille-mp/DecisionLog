import { AppError } from "../errors/AppError";
import { prisma } from "./prisma";

export const defaultCompanyDomain = "decisionlog.local";

export function getEmailDomain(email: string) {
  const [, domain] = email.toLowerCase().split("@");
  return domain || "";
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

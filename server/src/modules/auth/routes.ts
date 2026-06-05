import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { Router, type Response } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "../../errors/AppError";
import {
  assertCompanyAccessCode,
  createCompanySlug,
  findCompanyByEmail,
  generateUniqueCompanyAccessCode,
  getEmailDomain,
} from "../../lib/company";
import { logActivity } from "../../lib/mongodb";
import {
  buildAuthorizationUrl,
  exchangeAuthorizationCode,
  getOidcPublicConfig,
  isOidcEnabled,
  verifyIdToken,
  verifyOidcState,
} from "../../lib/oidc";
import { prisma } from "../../lib/prisma";
import { exposeCompanyAccessCodeForAdmin } from "../../lib/userResponse";
import { asyncHandler } from "../../middlewares/asyncHandler";
import {
  forgotPasswordSchema,
  registerCompanySchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "../../schemas/auth";

export const authRoutes = Router();

function signAppToken(user: {
  active: boolean;
  companyId: string;
  email: string;
  id: string;
  role: string;
}) {
  return jwt.sign(
    {
      email: user.email,
      companyId: user.companyId,
      role: user.role,
      active: user.active,
    },
    process.env.JWT_SECRET || "dev-secret",
    {
      subject: user.id,
      expiresIn: "1d",
    },
  );
}

function getFrontendRedirectUrl() {
  return (
    process.env.OIDC_FRONTEND_REDIRECT_URL ||
    process.env.CLIENT_URL ||
    "http://localhost:5173"
  );
}

function redirectWithAuthError(response: Response, error: unknown) {
  const redirectUrl = new URL(getFrontendRedirectUrl());
  const message =
    error instanceof AppError
      ? error.message
      : "Não foi possível validar sua conta institucional.";

  redirectUrl.hash = new URLSearchParams({
    auth_error: "access_denied",
    auth_message: message,
  }).toString();

  response.redirect(redirectUrl.toString());
}

authRoutes.get("/oidc/config", (_request, response) => {
  response.json(getOidcPublicConfig());
});

authRoutes.get(
  "/oidc/start",
  asyncHandler(async (request, response) => {
    if (!isOidcEnabled()) {
      throw new AppError("Login institucional não configurado.", 503);
    }

    const returnTo =
      typeof request.query.returnTo === "string" ? request.query.returnTo : "/";
    const companyAccessCode =
      typeof request.query.companyAccessCode === "string"
        ? request.query.companyAccessCode
        : undefined;
    const authorizationUrl = await buildAuthorizationUrl(returnTo, companyAccessCode);

    response.redirect(authorizationUrl);
  }),
);

authRoutes.get(
  "/oidc/callback",
  asyncHandler(async (request, response) => {
    try {
    if (!isOidcEnabled()) {
      throw new AppError("Login institucional não configurado.", 503);
    }

    const code = typeof request.query.code === "string" ? request.query.code : "";
    const state =
      typeof request.query.state === "string" ? request.query.state : "";

    if (!code || !state) {
      throw new AppError("Retorno OpenID incompleto.", 400);
    }

    const verifiedState = verifyOidcState(state);
    const idToken = await exchangeAuthorizationCode(code);
    const profile = await verifyIdToken(idToken, verifiedState.nonce);
    let user = await prisma.user.findUnique({
      where: {
        email: profile.email,
      },
      include: {
        company: true,
        department: true,
      },
    });
    const company = await findCompanyByEmail(profile.email);

    if (user && !user.active) {
      throw new AppError("Usuário inativo.", 403);
    }

    if (user && user.companyId !== company.id) {
      throw new AppError("Usuário não pertence à empresa deste domínio.", 403);
    }

    if (!user) {
      if (!verifiedState.companyAccessCode) {
        throw new AppError("Informe o cÃ³digo da empresa para o primeiro acesso institucional.", 403);
      }

      await assertCompanyAccessCode(company.id, verifiedState.companyAccessCode);

      const acceptedAt = new Date();
      const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);
      const companyUsers = await prisma.user.count({
        where: {
          companyId: company.id,
        },
      });

      user = await prisma.user.create({
        data: {
          companyId: company.id,
          name: profile.name,
          email: profile.email,
          passwordHash,
          role: companyUsers === 0 ? "admin" : "manager",
          termsAcceptedAt: acceptedAt,
          privacyAcceptedAt: acceptedAt,
        },
        include: {
          company: true,
          department: true,
        },
      });
    }

    const token = signAppToken(user);

    void logActivity(
      "USER_LOGGED_IN_OIDC",
      { userId: user.id, companyId: user.companyId, email: user.email, providerSubject: profile.sub },
      user.id,
      user.companyId,
    );

    const redirectUrl = new URL(getFrontendRedirectUrl());
    redirectUrl.hash = new URLSearchParams({
      oidc_token: token,
    }).toString();

    response.redirect(redirectUrl.toString());
    } catch (error) {
      redirectWithAuthError(response, error);
    }
  }),
);

authRoutes.post(
  "/register-company",
  asyncHandler(async (request, response) => {
    const data = registerCompanySchema.parse(request.body);
    const domain = getEmailDomain(data.email);

    if (!domain) {
      throw new AppError("E-mail corporativo inválido.", 400);
    }

    const existingDomain = await prisma.companyDomain.findUnique({
      where: {
        domain,
      },
    });

    if (existingDomain) {
      throw new AppError("Este domínio corporativo já está cadastrado.", 409);
    }

    const slug = createCompanySlug(data.companyName);

    if (!slug) {
      throw new AppError("Nome da empresa inválido.", 400);
    }

    const existingCompany = await prisma.company.findUnique({
      where: {
        slug,
      },
    });

    if (existingCompany) {
      throw new AppError("Empresa já cadastrada.", 409);
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        email: data.email,
      },
    });

    if (existingUser) {
      throw new AppError("E-mail já cadastrado.", 409);
    }

    const acceptedAt = new Date();
    const passwordHash = await bcrypt.hash(data.password, 10);
    const accessCode = await generateUniqueCompanyAccessCode();
    const company = await prisma.company.create({
      data: {
        name: data.companyName,
        slug,
        accessCode,
        active: true,
      },
    });

    await prisma.companyDomain.create({
      data: {
        companyId: company.id,
        domain,
        active: true,
      },
    });

    const user = await prisma.user.create({
      data: {
        companyId: company.id,
        name: data.name,
        email: data.email,
        passwordHash,
        role: "admin",
        active: true,
        termsAcceptedAt: acceptedAt,
        privacyAcceptedAt: acceptedAt,
      },
      select: {
        id: true,
        companyId: true,
        company: true,
        name: true,
        email: true,
        avatarUrl: true,
        role: true,
        termsAcceptedAt: true,
        privacyAcceptedAt: true,
        createdAt: true,
      },
    });

    void logActivity(
      "COMPANY_REGISTERED",
      {
        companyId: company.id,
        companyName: company.name,
        domain,
        accessCode: company.accessCode,
        adminUserId: user.id,
        adminEmail: user.email,
      },
      user.id,
      company.id,
    );

    response.status(201).json({
      company,
      user,
      message: "Empresa cadastrada. Faça login com o administrador criado.",
    });
  }),
);

authRoutes.post(
  "/register",
  asyncHandler(async (request, response) => {
    const data = registerSchema.parse(request.body);
    const company = await findCompanyByEmail(data.email);
    await assertCompanyAccessCode(company.id, data.companyAccessCode);
    const existingUser = await prisma.user.findUnique({
      where: {
        email: data.email,
      },
    });

    if (existingUser) {
      throw new AppError("E-mail já cadastrado.", 409);
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const acceptedAt = new Date();
    const user = await prisma.user.create({
      data: {
        companyId: company.id,
        name: data.name,
        email: data.email,
        passwordHash,
        role: "manager",
        termsAcceptedAt: acceptedAt,
        privacyAcceptedAt: acceptedAt,
      },
      select: {
        id: true,
        companyId: true,
        company: true,
        name: true,
        email: true,
        avatarUrl: true,
        role: true,
        termsAcceptedAt: true,
        privacyAcceptedAt: true,
        createdAt: true,
      },
    });

    void logActivity(
      "USER_REGISTERED",
      { userId: user.id, companyId: user.companyId, email: user.email, role: user.role },
      user.id,
      user.companyId,
    );

    response.status(201).json(exposeCompanyAccessCodeForAdmin(user));
  }),
);

authRoutes.post(
  "/login",
  asyncHandler(async (request, response) => {
    const data = loginSchema.parse(request.body);
    const user = await prisma.user.findUnique({
      where: {
        email: data.email,
      },
      include: {
        company: true,
        department: true,
      },
    });

    if (!user || !user.active) {
      throw new AppError("Credenciais inválidas.", 401);
    }

    const passwordMatches = await bcrypt.compare(data.password, user.passwordHash);

    if (!passwordMatches) {
      throw new AppError("Credenciais inválidas.", 401);
    }

    const token = signAppToken(user);

    void logActivity(
      "USER_LOGGED_IN",
      { userId: user.id, companyId: user.companyId, email: user.email, role: user.role },
      user.id,
      user.companyId,
    );

    const responseUser = exposeCompanyAccessCodeForAdmin(user);

    response.json({
      token,
      user: {
        id: responseUser.id,
        companyId: responseUser.companyId,
        company: responseUser.company,
        name: responseUser.name,
        email: responseUser.email,
        phone: responseUser.phone,
        avatarUrl: responseUser.avatarUrl,
        preferredTheme: responseUser.preferredTheme,
        departmentId: responseUser.departmentId,
        department: responseUser.department,
        role: responseUser.role,
      },
    });
  }),
);

authRoutes.post(
  "/forgot-password",
  asyncHandler(async (request, response) => {
    const data = forgotPasswordSchema.parse(request.body);
    const user = await prisma.user.findUnique({
      where: {
        email: data.email,
      },
    });

    const message =
      "Se o e-mail estiver cadastrado, enviaremos as instruções de recuperação.";

    if (!user || !user.active) {
      response.json({ message });
      return;
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const passwordResetTokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    const passwordResetExpiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        passwordResetTokenHash,
        passwordResetExpiresAt,
      },
    });

    void logActivity(
      "PASSWORD_RESET_REQUESTED",
      { userId: user.id, companyId: user.companyId, email: user.email },
      user.id,
      user.companyId,
    );

    response.json({
      message,
      ...(process.env.NODE_ENV === "production" ? {} : { resetToken }),
    });
  }),
);

authRoutes.post(
  "/reset-password",
  asyncHandler(async (request, response) => {
    const data = resetPasswordSchema.parse(request.body);
    const passwordResetTokenHash = crypto
      .createHash("sha256")
      .update(data.token)
      .digest("hex");

    const user = await prisma.user.findFirst({
      where: {
        passwordResetTokenHash,
        passwordResetExpiresAt: {
          gt: new Date(),
        },
        active: true,
      },
    });

    if (!user) {
      throw new AppError("Token de recuperação inválido ou expirado.", 400);
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        passwordHash,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
      },
    });

    void logActivity(
      "PASSWORD_RESET_COMPLETED",
      { userId: user.id, companyId: user.companyId, email: user.email },
      user.id,
      user.companyId,
    );

    response.json({ message: "Senha atualizada com sucesso." });
  }),
);

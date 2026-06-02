import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "../../errors/AppError";
import { findCompanyByEmail } from "../../lib/company";
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
import { asyncHandler } from "../../middlewares/asyncHandler";
import {
  forgotPasswordSchema,
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
    const authorizationUrl = await buildAuthorizationUrl(returnTo);

    response.redirect(authorizationUrl);
  }),
);

authRoutes.get(
  "/oidc/callback",
  asyncHandler(async (request, response) => {
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
  }),
);

authRoutes.post(
  "/register",
  asyncHandler(async (request, response) => {
    const data = registerSchema.parse(request.body);
    const company = await findCompanyByEmail(data.email);
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
        role: data.role,
        termsAcceptedAt: acceptedAt,
        privacyAcceptedAt: acceptedAt,
      },
      select: {
        id: true,
        companyId: true,
        company: true,
        name: true,
        email: true,
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

    response.status(201).json(user);
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

    response.json({
      token,
      user: {
        id: user.id,
        companyId: user.companyId,
        company: user.company,
        name: user.name,
        email: user.email,
        phone: user.phone,
        preferredTheme: user.preferredTheme,
        departmentId: user.departmentId,
        department: user.department,
        role: user.role,
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

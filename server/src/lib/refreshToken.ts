import crypto from "node:crypto";
import type { Request, Response } from "express";
import { prisma } from "./prisma";

const refreshCookieName = "decisionlog_refresh";
const refreshTokenDays = Number(process.env.REFRESH_TOKEN_DAYS || 7);

function getCookieValue(request: Request, name: string) {
  const cookieHeader = request.headers.cookie;
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
  const cookie = cookies.find((item) => item.startsWith(`${name}=`));

  return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : null;
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    maxAge: refreshTokenDays * 24 * 60 * 60 * 1000,
    sameSite: isProduction ? ("none" as const) : ("lax" as const),
    secure: isProduction,
  };
}

export async function issueRefreshToken(response: Response, userId: string) {
  const rawToken = crypto.randomBytes(48).toString("base64url");
  const expiresAt = new Date(Date.now() + refreshTokenDays * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(rawToken),
      expiresAt,
    },
  });

  response.cookie(refreshCookieName, rawToken, getCookieOptions());
}

export async function rotateRefreshToken(request: Request, response: Response) {
  const rawToken = getCookieValue(request, refreshCookieName);
  if (!rawToken) return null;

  const storedToken = await prisma.refreshToken.findUnique({
    where: {
      tokenHash: hashToken(rawToken),
    },
    include: {
      user: {
        include: {
          company: true,
          department: true,
        },
      },
    },
  });

  if (
    !storedToken ||
    storedToken.revokedAt ||
    storedToken.expiresAt <= new Date() ||
    !storedToken.user.active
  ) {
    clearRefreshCookie(response);
    return null;
  }

  await prisma.refreshToken.update({
    where: {
      id: storedToken.id,
    },
    data: {
      revokedAt: new Date(),
    },
  });
  await issueRefreshToken(response, storedToken.userId);

  return storedToken.user;
}

export async function revokeRefreshToken(request: Request, response: Response) {
  const rawToken = getCookieValue(request, refreshCookieName);

  if (rawToken) {
    await prisma.refreshToken.updateMany({
      where: {
        tokenHash: hashToken(rawToken),
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  clearRefreshCookie(response);
}

export function clearRefreshCookie(response: Response) {
  response.clearCookie(refreshCookieName, getCookieOptions());
}

import { Router } from "express";
import { z } from "zod";
import { problem } from "@fulltech/shared";
import { env } from "../env";
import { prisma } from "../prisma";
import { sendProblem, zodToProblem } from "../http";
import { verifyPassword } from "../auth/password";
import { signAccessToken } from "../auth/tokens";
import { hashRefreshToken, newRefreshTokenRaw } from "../auth/refresh";
import { auditLog } from "../audit";

const router = Router();

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: "lax" as const,
    path: "/",
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  };
}

router.post("/login", async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) return sendProblem(res, zodToProblem(parsed.error));

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
    include: {
      role: { include: { permissions: { include: { permission: true } } } },
    },
  });

  if (!user || !user.isActive) {
    return sendProblem(res, problem(401, "Credenciales inválidas"));
  }

  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) return sendProblem(res, problem(401, "Credenciales inválidas"));

  const permissions = user.role.permissions.map((rp) => rp.permission.key);

  const accessToken = await signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role.name,
    permissions,
  });

  const refreshRaw = newRefreshTokenRaw();
  const refreshHash = hashRefreshToken(refreshRaw);
  const expiresAt = new Date(Date.now() + env.AUTH_REFRESH_TTL_DAYS * 86400 * 1000);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: refreshHash,
      expiresAt,
      ip: req.ip,
      userAgent: req.headers["user-agent"] ?? null,
    },
  });

  const csrfToken = newRefreshTokenRaw();

  res.cookie("refresh_token", refreshRaw, cookieOptions());
  res.cookie("csrf_token", csrfToken, {
    httpOnly: false,
    secure: env.COOKIE_SECURE,
    sameSite: "lax",
    path: "/",
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  });

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  await auditLog({
    req,
    actorUserId: user.id,
    actorEmail: user.email,
    action: "auth.login",
    entityType: "user",
    entityId: user.id,
  });

  res.json({
    accessToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role.name,
      permissions,
    },
  });
});

const RefreshSchema = z.object({
  csrf: z.string().min(10),
});

router.post("/refresh", async (req, res) => {
  const refreshRaw = req.cookies?.refresh_token;
  const csrfCookie = req.cookies?.csrf_token;
  const csrfHeader = req.headers["x-csrf-token"];

  const parsed = RefreshSchema.safeParse({ csrf: csrfHeader });
  if (!parsed.success) return sendProblem(res, problem(400, "CSRF requerido"));
  if (!csrfCookie || csrfCookie !== csrfHeader) {
    return sendProblem(res, problem(403, "CSRF inválido"));
  }

  if (!refreshRaw) return sendProblem(res, problem(401, "No autenticado"));

  const refreshHash = hashRefreshToken(String(refreshRaw));
  const tokenRow = await prisma.refreshToken.findUnique({ where: { tokenHash: refreshHash }, include: { user: { include: { role: { include: { permissions: { include: { permission: true } } } } } } } });

  if (!tokenRow || tokenRow.revokedAt || tokenRow.expiresAt < new Date()) {
    return sendProblem(res, problem(401, "Refresh token inválido"));
  }

  const user = tokenRow.user;
  if (!user.isActive) return sendProblem(res, problem(401, "Usuario inactivo"));

  // Rotate refresh token
  const newRefreshRaw = newRefreshTokenRaw();
  const newRefreshHash = hashRefreshToken(newRefreshRaw);
  const expiresAt = new Date(Date.now() + env.AUTH_REFRESH_TTL_DAYS * 86400 * 1000);

  await prisma.refreshToken.update({
    where: { id: tokenRow.id },
    data: { revokedAt: new Date(), replacedByTokenId: undefined },
  });

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: newRefreshHash,
      expiresAt,
      ip: req.ip,
      userAgent: req.headers["user-agent"] ?? null,
    },
  });

  res.cookie("refresh_token", newRefreshRaw, cookieOptions());

  const permissions = user.role.permissions.map((rp) => rp.permission.key);
  const accessToken = await signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role.name,
    permissions,
  });

  res.json({ accessToken });
});

router.post("/logout", async (req, res) => {
  const refreshRaw = req.cookies?.refresh_token;
  if (refreshRaw) {
    const refreshHash = hashRefreshToken(String(refreshRaw));
    await prisma.refreshToken.updateMany({
      where: { tokenHash: refreshHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  res.clearCookie("refresh_token", cookieOptions());
  res.clearCookie("csrf_token", { path: "/" });
  res.status(204).send();
});

export default router;

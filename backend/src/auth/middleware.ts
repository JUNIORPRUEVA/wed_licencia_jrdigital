import type { NextFunction, Request, Response } from "express";
import { problem } from "@fulltech/shared";
import { sendProblem } from "../http";
import { prisma } from "../prisma";
import { verifyAccessToken } from "./tokens";

export type AuthedRequest = Request & {
  auth?: {
    userId: string;
    email: string;
    role: string;
    permissions: string[];
  };
};

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
    if (!token) return sendProblem(res, problem(401, "No autenticado"));

    const payload = await verifyAccessToken(token);
    const userId = payload.sub;
    if (!userId) return sendProblem(res, problem(401, "Token inválido"));

    const user = await prisma.user.findUnique({
      where: { id: String(userId) },
      include: {
        role: { include: { permissions: { include: { permission: true } } } },
      },
    });

    if (!user || !user.isActive) return sendProblem(res, problem(401, "Usuario inactivo"));

    const permissions = user.role.permissions.map((rp) => rp.permission.key);

    req.auth = {
      userId: user.id,
      email: user.email,
      role: user.role.name,
      permissions,
    };

    next();
  } catch {
    return sendProblem(res, problem(401, "Token inválido"));
  }
}

export function requirePermission(key: string) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.auth) return sendProblem(res, problem(401, "No autenticado"));
    if (!req.auth.permissions.includes(key)) {
      return sendProblem(res, problem(403, "No autorizado", `Falta permiso: ${key}`));
    }
    next();
  };
}

import type { Request } from "express";
import { prisma } from "./prisma";

export async function auditLog(params: {
  req: Request;
  actorUserId?: string | null;
  actorEmail?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  diff?: unknown;
}) {
  const ip =
    (typeof params.req.headers["x-forwarded-for"] === "string"
      ? params.req.headers["x-forwarded-for"].split(",")[0]
      : undefined) ??
    params.req.ip;

  const userAgent = params.req.headers["user-agent"];

  await prisma.auditLog.create({
    data: {
      actorUserId: params.actorUserId ?? null,
      actorEmail: params.actorEmail ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      diff: params.diff as any,
      ip: ip ?? null,
      userAgent: userAgent ?? null,
    },
  });
}

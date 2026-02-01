import { Router } from "express";
import { z } from "zod";
import { OfflineRequestFileSchema, OnlineActivationRequestSchema, problem } from "@fulltech/shared";
import { sha256Hex, ed25519VerifyBase64 } from "@fulltech/crypto";
import { prisma } from "../prisma";
import { sendProblem, zodToProblem } from "../http";
import { stableStringify } from "../utils/json";
import { semverGte, semverLte } from "../utils/semver";
import { signActivationToken, verifyActivationToken } from "../auth/tokens";

const router = Router();

type AttemptResult =
  | "SUCCESS"
  | "INVALID_KEY"
  | "APP_MISMATCH"
  | "EXPIRED"
  | "REVOKED"
  | "SUSPENDED"
  | "DEVICE_LIMIT"
  | "VERSION_BLOCKED"
  | "OFFLINE_NOT_ALLOWED"
  | "ERROR";

async function logAttempt(data: {
  productId: string;
  result: AttemptResult;
  reason?: string | null;
  licenseId?: string | null;
  licenseKey?: string | null;
  deviceIdHash?: string | null;
  ip?: string | null;
}) {
  try {
    await prisma.activationAttempt.create({
      data: {
        productId: data.productId,
        licenseId: data.licenseId ?? null,
        licenseKey: data.licenseKey ?? null,
        deviceIdHash: data.deviceIdHash ?? null,
        ip: data.ip ?? null,
        result: data.result,
        reason: data.reason ?? null,
      },
    });
  } catch {
    // best-effort only
  }
}

router.post("/online", async (req, res) => {
  const parsed = OnlineActivationRequestSchema.safeParse(req.body);
  if (!parsed.success) return sendProblem(res, zodToProblem(parsed.error));

  const { licenseKey, productId, deviceFingerprint, appVersion } = parsed.data;
  const deviceIdHash = sha256Hex(deviceFingerprint);

  try {
    const lic = await prisma.license.findFirst({
      where: { key: licenseKey, productId },
    });

    if (!lic) {
      await logAttempt({ productId, result: "INVALID_KEY", reason: "Licencia no encontrada", licenseKey, deviceIdHash, ip: req.ip });
      return sendProblem(res, problem(404, "Licencia no encontrada"));
    }

    if (lic.status !== "ACTIVE") {
      const result: AttemptResult =
        lic.status === "SUSPENDED" ? "SUSPENDED" : lic.status === "REVOKED" ? "REVOKED" : "ERROR";
      await logAttempt({ productId, result, reason: `Estado: ${lic.status}`, licenseId: lic.id, licenseKey, deviceIdHash, ip: req.ip });
      return sendProblem(res, problem(403, "Licencia no activa", `Estado: ${lic.status}`));
    }

    if (lic.expiresAt && lic.expiresAt < new Date()) {
      await prisma.license.update({ where: { id: lic.id }, data: { status: "EXPIRED" } });
      await logAttempt({ productId, result: "EXPIRED", reason: "Licencia expirada", licenseId: lic.id, licenseKey, deviceIdHash, ip: req.ip });
      return sendProblem(res, problem(403, "Licencia expirada"));
    }

    if (lic.allowedVersionMin && !semverGte(appVersion, lic.allowedVersionMin)) {
      await logAttempt({
        productId,
        result: "VERSION_BLOCKED",
        reason: `Mínima: ${lic.allowedVersionMin}`,
        licenseId: lic.id,
        licenseKey,
        deviceIdHash,
        ip: req.ip,
      });
      return sendProblem(res, problem(403, "Versión no permitida", `Mínima: ${lic.allowedVersionMin}`));
    }

    if (lic.allowedVersionMax && !semverLte(appVersion, lic.allowedVersionMax)) {
      await logAttempt({
        productId,
        result: "VERSION_BLOCKED",
        reason: `Máxima: ${lic.allowedVersionMax}`,
        licenseId: lic.id,
        licenseKey,
        deviceIdHash,
        ip: req.ip,
      });
      return sendProblem(res, problem(403, "Versión no permitida", `Máxima: ${lic.allowedVersionMax}`));
    }

    const [existingAny, activeDevices, totalDevices] = await Promise.all([
      prisma.deviceActivation.findUnique({ where: { licenseId_deviceIdHash: { licenseId: lic.id, deviceIdHash } } }),
      prisma.deviceActivation.count({ where: { licenseId: lic.id, revokedAt: null } }),
      prisma.deviceActivation.count({ where: { licenseId: lic.id } }),
    ]);

    const isNewDevice = !existingAny;
    if (isNewDevice && activeDevices >= lic.maxDevices) {
      await logAttempt({ productId, result: "DEVICE_LIMIT", reason: "Límite de dispositivos alcanzado", licenseId: lic.id, licenseKey, deviceIdHash, ip: req.ip });
      return sendProblem(res, problem(403, "Límite de dispositivos alcanzado"));
    }

    if (isNewDevice && totalDevices >= lic.maxActivations) {
      await logAttempt({ productId, result: "DEVICE_LIMIT", reason: "Límite de activaciones alcanzado", licenseId: lic.id, licenseKey, deviceIdHash, ip: req.ip });
      return sendProblem(res, problem(403, "Límite de activaciones alcanzado"));
    }

    await prisma.deviceActivation.upsert({
      where: { licenseId_deviceIdHash: { licenseId: lic.id, deviceIdHash } },
      create: {
        licenseId: lic.id,
        deviceIdHash,
        appVersion,
        ip: req.ip,
        userAgent: req.headers["user-agent"] ?? null,
      },
      update: {
        appVersion,
        lastSeenAt: new Date(),
        ip: req.ip,
        userAgent: req.headers["user-agent"] ?? null,
        revokedAt: null,
      },
    });

    const revalSetting = await prisma.setting.findUnique({ where: { key: "revalidation" } });
    const offlineDays =
      typeof (revalSetting?.valueJson as any)?.offlineDays === "number"
        ? Number((revalSetting?.valueJson as any).offlineDays)
        : 7;

    const ttlDays = lic.revalidateDays ?? offlineDays;
    const expiresAt = lic.expiresAt ?? new Date(Date.now() + ttlDays * 86400 * 1000);

    const token = await signActivationToken(
      {
        licenseId: lic.id,
        tenantId: lic.tenantId,
        productId: lic.productId,
        deviceIdHash,
        modules: lic.modules,
        features: lic.features,
        licenseType: lic.type,
        licenseStatus: lic.status,
        expiry: expiresAt.toISOString(),
        issuedAt: new Date().toISOString(),
        offlineDays: ttlDays,
      },
      `${ttlDays}d`
    );

    await logAttempt({ productId, result: "SUCCESS", reason: null, licenseId: lic.id, licenseKey, deviceIdHash, ip: req.ip });

    res.json({
      activationToken: token,
      offlineDays: ttlDays,
      expiry: expiresAt.toISOString(),
    });
  } catch (e) {
    await logAttempt({ productId, result: "ERROR", reason: String(e), licenseKey, deviceIdHash, ip: req.ip });
    return sendProblem(res, problem(500, "Error de servidor"));
  }
});

router.post("/revalidate", async (req, res) => {
  const Body = z.object({
    activationToken: z.string().min(10),
    deviceFingerprint: z.string().min(8),
    appVersion: z.string().min(1),
  });
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) return sendProblem(res, zodToProblem(parsed.error));

  const deviceIdHash = sha256Hex(parsed.data.deviceFingerprint);

  const payload = await verifyActivationToken(parsed.data.activationToken).catch(() => null);
  if (!payload) return sendProblem(res, problem(401, "Activation token inválido"));

  const licenseId = String(payload.licenseId ?? "");
  const productId = String(payload.productId ?? "");

  const lic = await prisma.license.findUnique({ where: { id: licenseId } });
  if (!lic) {
    await logAttempt({ productId, result: "INVALID_KEY", reason: "Licencia no encontrada (revalidate)", licenseId, deviceIdHash, ip: req.ip });
    return sendProblem(res, problem(404, "Licencia no encontrada"));
  }
  if (lic.status !== "ACTIVE") {
    const result: AttemptResult =
      lic.status === "SUSPENDED" ? "SUSPENDED" : lic.status === "REVOKED" ? "REVOKED" : "ERROR";
    await logAttempt({ productId: lic.productId, result, reason: `Estado: ${lic.status}`, licenseId: lic.id, deviceIdHash, ip: req.ip });
    return sendProblem(res, problem(403, "Licencia no activa", `Estado: ${lic.status}`));
  }
  if (lic.expiresAt && lic.expiresAt < new Date()) {
    await prisma.license.update({ where: { id: lic.id }, data: { status: "EXPIRED" } });
    await logAttempt({ productId: lic.productId, result: "EXPIRED", reason: "Licencia expirada (revalidate)", licenseId: lic.id, deviceIdHash, ip: req.ip });
    return sendProblem(res, problem(403, "Licencia expirada"));
  }

  const activation = await prisma.deviceActivation.findUnique({
    where: { licenseId_deviceIdHash: { licenseId: lic.id, deviceIdHash } },
  });
  if (!activation || activation.revokedAt) {
    await logAttempt({ productId: lic.productId, result: "ERROR", reason: "Dispositivo no activo (revalidate)", licenseId: lic.id, deviceIdHash, ip: req.ip });
    return sendProblem(res, problem(403, "Dispositivo no activo"));
  }

  const revalSetting = await prisma.setting.findUnique({ where: { key: "revalidation" } });
  const offlineDays =
    typeof (revalSetting?.valueJson as any)?.offlineDays === "number"
      ? Number((revalSetting?.valueJson as any).offlineDays)
      : 7;
  const ttlDays = lic.revalidateDays ?? offlineDays;
  const expiresAt = lic.expiresAt ?? new Date(Date.now() + ttlDays * 86400 * 1000);

  await prisma.deviceActivation.update({
    where: { licenseId_deviceIdHash: { licenseId: lic.id, deviceIdHash } },
    data: { lastSeenAt: new Date(), appVersion: parsed.data.appVersion },
  });

  const token = await signActivationToken(
    {
      licenseId: lic.id,
      tenantId: lic.tenantId,
      productId: lic.productId,
      deviceIdHash,
      modules: lic.modules,
      features: lic.features,
      licenseType: lic.type,
      licenseStatus: lic.status,
      expiry: expiresAt.toISOString(),
      issuedAt: new Date().toISOString(),
      offlineDays: ttlDays,
    },
    `${ttlDays}d`
  );

  await logAttempt({ productId: lic.productId, result: "SUCCESS", reason: null, licenseId: lic.id, deviceIdHash, ip: req.ip });
  res.json({ activationToken: token, offlineDays: ttlDays, expiry: expiresAt.toISOString() });
});

// OFFLINE REQUEST VALIDATION (admin will use these endpoints later; kept public for now to help tooling)
router.post("/offline/request/validate", async (req, res) => {
  const parsed = OfflineRequestFileSchema.safeParse(req.body);
  if (!parsed.success) return sendProblem(res, zodToProblem(parsed.error));

  const payloadStr = stableStringify(parsed.data.payload);
  const checksum = sha256Hex(payloadStr);

  if (checksum !== parsed.data.checksumSha256) {
    return sendProblem(res, problem(400, "Request file inválido", "Checksum no coincide"));
  }

  const product = await prisma.product.findUnique({ where: { id: parsed.data.payload.productId } });
  if (!product) return sendProblem(res, problem(400, "Producto inválido"));

  if (parsed.data.signatureEd25519 && product.offlineRequestVerifyKey) {
    const ok = await ed25519VerifyBase64(
      new TextEncoder().encode(payloadStr),
      parsed.data.signatureEd25519,
      product.offlineRequestVerifyKey
    );

    if (!ok) return sendProblem(res, problem(400, "Request file inválido", "Firma inválida"));
  }

  const exists = await prisma.offlineRequest.findUnique({ where: { nonce: parsed.data.payload.nonce } });
  if (exists && exists.status === "USED") {
    return sendProblem(res, problem(409, "Nonce ya fue usado"));
  }

  res.json({ ok: true, product: { id: product.id, name: product.name, slug: product.slug } });
});

export default router;

import { Router } from "express";
import { z } from "zod";
import {
  AdminUpsertLicenseSchema,
  AdminUpsertProductSchema,
  AdminUpsertTenantSchema,
  problem,
} from "@fulltech/shared";
import { prisma } from "../prisma";
import { sendProblem, zodToProblem } from "../http";
import { requireAuth, requirePermission, type AuthedRequest } from "../auth/middleware";
import { auditLog } from "../audit";
import { generateLicenseKey } from "../utils/licenseKey";
import { env } from "../env";
import { customAlphabet } from "nanoid";

const router = Router();

const voucherCodePart = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 4);
function newVoucherCode() {
  return `FT-${voucherCodePart()}-${voucherCodePart()}-${voucherCodePart()}`.toUpperCase();
}

router.use(requireAuth);

// DASHBOARD
router.get("/dashboard", async (_req, res) => {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const in30 = new Date(now.getTime() + 30 * 86400 * 1000);

  const [paidOrders, activeLicenses, expiringSoon, activationsToday, demoLicenses, fullLicenses] =
    await Promise.all([
      prisma.order.count({ where: { status: "PAID" } }),
      prisma.license.count({ where: { status: "ACTIVE" } }),
      prisma.license.count({
        where: { status: "ACTIVE", expiresAt: { not: null, lte: in30, gt: now } },
      }),
      prisma.deviceActivation.count({ where: { activatedAt: { gte: startOfDay } } }),
      prisma.license.count({ where: { type: "DEMO" } }),
      prisma.license.count({ where: { type: "FULL" } }),
    ]);

  res.json({
    paidOrders,
    activeLicenses,
    expiringSoon,
    activationsToday,
    demoLicenses,
    fullLicenses,
  });
});

// ACTIVATIONS
router.get("/activations", requirePermission("activations:read"), async (req, res) => {
  const Query = z.object({ licenseId: z.string().uuid().optional(), tenantId: z.string().uuid().optional(), limit: z.coerce.number().int().positive().max(200).default(100) });
  const parsed = Query.safeParse(req.query);
  if (!parsed.success) return sendProblem(res, zodToProblem(parsed.error));

  const items = await prisma.deviceActivation.findMany({
    where: {
      ...(parsed.data.licenseId ? { licenseId: parsed.data.licenseId } : {}),
      ...(parsed.data.tenantId
        ? { license: { tenantId: parsed.data.tenantId } }
        : {}),
    },
    include: { license: { include: { tenant: true, product: true } } },
    orderBy: { activatedAt: "desc" },
    take: parsed.data.limit,
  });

  res.json(items);
});

router.post("/activations/revoke", requirePermission("activations:write"), async (req: AuthedRequest, res) => {
  const Body = z.object({ licenseId: z.string().uuid(), deviceIdHash: z.string().min(64).max(64) });
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) return sendProblem(res, zodToProblem(parsed.error));

  const updated = await prisma.deviceActivation.update({
    where: { licenseId_deviceIdHash: { licenseId: parsed.data.licenseId, deviceIdHash: parsed.data.deviceIdHash } },
    data: { revokedAt: new Date() },
  });

  await auditLog({
    req,
    actorUserId: req.auth!.userId,
    actorEmail: req.auth!.email,
    action: "activation.revoke",
    entityType: "device_activation",
    entityId: updated.id,
    diff: parsed.data,
  });

  res.json({ ok: true });
});

// OFFLINE REQUESTS + FILES
router.get("/offline/requests", requirePermission("activations:read"), async (req, res) => {
  const Query = z.object({ status: z.enum(["RECEIVED", "USED", "REJECTED"]).optional(), limit: z.coerce.number().int().positive().max(200).default(100) });
  const parsed = Query.safeParse(req.query);
  if (!parsed.success) return sendProblem(res, zodToProblem(parsed.error));

  const items = await prisma.offlineRequest.findMany({
    where: { ...(parsed.data.status ? { status: parsed.data.status } : {}) },
    include: { product: true, tenant: true, license: true, licenseFiles: true },
    orderBy: { createdAt: "desc" },
    take: parsed.data.limit,
  });
  res.json(items);
});

router.get("/offline/files", requirePermission("activations:read"), async (req, res) => {
  const Query = z.object({ licenseId: z.string().uuid().optional(), limit: z.coerce.number().int().positive().max(200).default(100) });
  const parsed = Query.safeParse(req.query);
  if (!parsed.success) return sendProblem(res, zodToProblem(parsed.error));

  const items = await prisma.offlineLicenseFile.findMany({
    where: { ...(parsed.data.licenseId ? { licenseId: parsed.data.licenseId } : {}) },
    include: { license: { include: { tenant: true, product: true } }, offlineRequest: true },
    orderBy: { createdAt: "desc" },
    take: parsed.data.limit,
  });
  res.json(items);
});

router.get("/offline/files/:id/download", requirePermission("activations:read"), async (req, res) => {
  const file = await prisma.offlineLicenseFile.findUnique({ where: { id: req.params.id } });
  if (!file) return sendProblem(res, problem(404, "Archivo no encontrado"));

  const body = {
    payload: file.payloadJson,
    signatureEd25519: file.signature,
    publicKeyEd25519: file.publicKey,
  };

  res.setHeader("Content-Disposition", `attachment; filename=\"${file.fileName}\"`);
  res.json(body);
});

router.post("/offline/license/generate", requirePermission("activations:write"), async (req: AuthedRequest, res) => {
  const { OfflineRequestFileSchema, OfflineLicenseFilePayloadSchema } = await import("@fulltech/shared");
  const { sha256Hex, ed25519GetPublicKeyBase64, ed25519SignBase64 } = await import("@fulltech/crypto");
  const { env } = await import("../env");
  const { stableStringify } = await import("../utils/json");

  const Body = z.object({ requestFile: OfflineRequestFileSchema, licenseId: z.string().uuid() });
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) return sendProblem(res, zodToProblem(parsed.error));

  const payloadStr = stableStringify(parsed.data.requestFile.payload);
  const checksum = sha256Hex(payloadStr);
  if (checksum !== parsed.data.requestFile.checksumSha256) {
    return sendProblem(res, problem(400, "Request file inválido", "Checksum no coincide"));
  }

  const license = await prisma.license.findUnique({ where: { id: parsed.data.licenseId } });
  if (!license) return sendProblem(res, problem(404, "Licencia no encontrada"));
  if (!license.offlineAllowed) return sendProblem(res, problem(403, "Licencia no permite offline"));

  const existing = await prisma.offlineRequest.findUnique({ where: { nonce: parsed.data.requestFile.payload.nonce } });
  if (existing && existing.status === "USED") return sendProblem(res, problem(409, "Nonce ya fue usado"));

  const deviceIdHash = sha256Hex(parsed.data.requestFile.payload.deviceFingerprint);
  const expiry = (license.expiresAt ?? new Date(Date.now() + 3650 * 86400 * 1000)).toISOString();

  const licenseFilePayload = OfflineLicenseFilePayloadSchema.parse({
    licenseId: license.id,
    tenantId: license.tenantId,
    productId: license.productId,
    features: license.features,
    modules: license.modules,
    expiry,
    deviceIdHash,
    issuedAt: new Date().toISOString(),
    requestNonce: parsed.data.requestFile.payload.nonce,
  });

  const payloadBytes = new TextEncoder().encode(stableStringify(licenseFilePayload));
  const signature = await ed25519SignBase64(payloadBytes, env.OFFLINE_ED25519_PRIVATE_KEY_B64);
  const publicKey = await ed25519GetPublicKeyBase64(env.OFFLINE_ED25519_PRIVATE_KEY_B64);

  const offlineReq = await prisma.offlineRequest.upsert({
    where: { nonce: parsed.data.requestFile.payload.nonce },
    create: {
      nonce: parsed.data.requestFile.payload.nonce,
      productId: parsed.data.requestFile.payload.productId,
      tenantId: license.tenantId,
      licenseId: license.id,
      payloadJson: parsed.data.requestFile.payload as any,
      payloadHash: checksum,
      status: "USED",
      usedAt: new Date(),
      createdByUserId: req.auth!.userId,
    },
    update: {
      tenantId: license.tenantId,
      licenseId: license.id,
      payloadJson: parsed.data.requestFile.payload as any,
      payloadHash: checksum,
      status: "USED",
      usedAt: new Date(),
      createdByUserId: req.auth!.userId,
    },
  });

  const fileName = `license-${license.id}-${offlineReq.nonce}.json`;

  const licenseFile = await prisma.offlineLicenseFile.create({
    data: {
      offlineRequestId: offlineReq.id,
      licenseId: license.id,
      fileName,
      payloadJson: licenseFilePayload as any,
      signature,
      publicKey,
      createdByUserId: req.auth!.userId,
    },
  });

  await auditLog({
    req,
    actorUserId: req.auth!.userId,
    actorEmail: req.auth!.email,
    action: "offline_license.generate",
    entityType: "offline_license_file",
    entityId: licenseFile.id,
    diff: { licenseId: license.id, nonce: offlineReq.nonce },
  });

  res.json({
    id: licenseFile.id,
    fileName,
    payload: licenseFilePayload,
    signatureEd25519: signature,
    publicKeyEd25519: publicKey,
  });
});

router.get("/crypto/offline-public-key", requirePermission("activations:read"), async (_req, res) => {
  const { ed25519GetPublicKeyBase64 } = await import("@fulltech/crypto");
  const pub = await ed25519GetPublicKeyBase64(env.OFFLINE_ED25519_PRIVATE_KEY_B64);
  res.json({ publicKeyEd25519: pub });
});

// ORDERS (manual, payments phase 2)
router.get("/orders", requirePermission("orders:read"), async (_req, res) => {
  const items = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { tenant: true, items: { include: { product: true } } },
  });
  res.json(items);
});

router.post("/orders", requirePermission("orders:write"), async (req: AuthedRequest, res) => {
  const Body = z.object({
    tenantId: z.string().uuid(),
    notes: z.string().optional().nullable(),
    items: z
      .array(
        z.object({
          productId: z.string().uuid(),
          quantity: z.number().int().positive().default(1),
          unitPriceCents: z.number().int().nonnegative(),
          licenseType: z.enum(["DEMO", "FULL"]),
        })
      )
      .min(1),
  });

  const parsed = Body.safeParse(req.body);
  if (!parsed.success) return sendProblem(res, zodToProblem(parsed.error));

  const totalCents = parsed.data.items.reduce(
    (sum, it) => sum + it.unitPriceCents * it.quantity,
    0
  );

  const created = await prisma.order.create({
    data: {
      tenantId: parsed.data.tenantId,
      status: "PENDING_PAYMENT",
      totalCents,
      notes: parsed.data.notes ?? null,
      createdByUserId: req.auth!.userId,
      items: {
        create: parsed.data.items.map((it) => ({
          productId: it.productId,
          quantity: it.quantity,
          unitPriceCents: it.unitPriceCents,
          licenseType: it.licenseType,
        })),
      },
    },
    include: { items: true },
  });

  await auditLog({
    req,
    actorUserId: req.auth!.userId,
    actorEmail: req.auth!.email,
    action: "order.create",
    entityType: "order",
    entityId: created.id,
    diff: { ...parsed.data, totalCents },
  });

  res.status(201).json(created);
});

router.post("/orders/:id/mark-paid", requirePermission("orders:write"), async (req: AuthedRequest, res) => {
  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: { status: "PAID", paidAt: new Date() },
  });

  await auditLog({
    req,
    actorUserId: req.auth!.userId,
    actorEmail: req.auth!.email,
    action: "order.mark_paid",
    entityType: "order",
    entityId: order.id,
  });

  res.json(order);
});

// PRODUCTS
router.get("/products", requirePermission("products:read"), async (_req, res) => {
  const items = await prisma.product.findMany({ orderBy: { createdAt: "desc" } });
  res.json(items);
});

router.post("/products", requirePermission("products:write"), async (req: AuthedRequest, res) => {
  const parsed = AdminUpsertProductSchema.safeParse(req.body);
  if (!parsed.success) return sendProblem(res, zodToProblem(parsed.error));

  const created = await prisma.product.create({
    data: {
      ...parsed.data,
      features: parsed.data.features,
      images: parsed.data.images,
    } as any,
  });

  await auditLog({
    req,
    actorUserId: req.auth!.userId,
    actorEmail: req.auth!.email,
    action: "product.create",
    entityType: "product",
    entityId: created.id,
    diff: parsed.data,
  });

  res.status(201).json(created);
});

router.put(
  "/products/:id",
  requirePermission("products:write"),
  async (req: AuthedRequest, res) => {
    const parsed = AdminUpsertProductSchema.safeParse(req.body);
    if (!parsed.success) return sendProblem(res, zodToProblem(parsed.error));

    const updated = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        ...parsed.data,
        features: parsed.data.features,
        images: parsed.data.images,
      } as any,
    });

    await auditLog({
      req,
      actorUserId: req.auth!.userId,
      actorEmail: req.auth!.email,
      action: "product.update",
      entityType: "product",
      entityId: updated.id,
      diff: parsed.data,
    });

    res.json(updated);
  }
);

router.delete(
  "/products/:id",
  requirePermission("products:write"),
  async (req: AuthedRequest, res) => {
    const updated = await prisma.product.update({
      where: { id: req.params.id },
      data: { status: "ARCHIVED" },
    });

    await auditLog({
      req,
      actorUserId: req.auth!.userId,
      actorEmail: req.auth!.email,
      action: "product.archive",
      entityType: "product",
      entityId: updated.id,
    });

    res.status(204).send();
  }
);

// PRODUCT ASSETS (descargas/demo)
router.get(
  "/products/:id/assets",
  requirePermission("products:read"),
  async (req, res) => {
    const assets = await prisma.productAsset.findMany({
      where: { productId: req.params.id, isActive: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(assets);
  }
);

router.post(
  "/products/:id/assets",
  requirePermission("products:write"),
  async (req: AuthedRequest, res) => {
    const Body = z.object({
      platform: z.string().min(2),
      version: z.string().min(1),
      url: z.string().url(),
      sha256: z.string().min(64).max(64).optional().nullable(),
      fileSize: z.number().int().positive().optional().nullable(),
      isDemo: z.boolean().default(false),
    });

    const parsed = Body.safeParse(req.body);
    if (!parsed.success) return sendProblem(res, zodToProblem(parsed.error));

    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) return sendProblem(res, problem(404, "Producto no encontrado"));

    const created = await prisma.productAsset.create({
      data: {
        productId: product.id,
        platform: parsed.data.platform,
        version: parsed.data.version,
        url: parsed.data.url,
        sha256: parsed.data.sha256 ?? null,
        fileSize: parsed.data.fileSize ?? null,
        isDemo: parsed.data.isDemo,
        isActive: true,
      },
    });

    await auditLog({
      req,
      actorUserId: req.auth!.userId,
      actorEmail: req.auth!.email,
      action: "product.asset.create",
      entityType: "product_asset",
      entityId: created.id,
      diff: { productId: product.id, platform: created.platform, version: created.version, url: created.url },
    });

    res.status(201).json(created);
  }
);

// TENANTS
router.get("/tenants", requirePermission("tenants:read"), async (_req, res) => {
  const items = await prisma.tenant.findMany({ orderBy: { createdAt: "desc" } });
  res.json(items);
});

router.post("/tenants", requirePermission("tenants:write"), async (req: AuthedRequest, res) => {
  const parsed = AdminUpsertTenantSchema.safeParse(req.body);
  if (!parsed.success) return sendProblem(res, zodToProblem(parsed.error));

  const created = await prisma.tenant.create({ data: parsed.data as any });

  await auditLog({
    req,
    actorUserId: req.auth!.userId,
    actorEmail: req.auth!.email,
    action: "tenant.create",
    entityType: "tenant",
    entityId: created.id,
    diff: parsed.data,
  });

  res.status(201).json(created);
});

router.put("/tenants/:id", requirePermission("tenants:write"), async (req: AuthedRequest, res) => {
  const parsed = AdminUpsertTenantSchema.safeParse(req.body);
  if (!parsed.success) return sendProblem(res, zodToProblem(parsed.error));

  const updated = await prisma.tenant.update({ where: { id: req.params.id }, data: parsed.data as any });

  await auditLog({
    req,
    actorUserId: req.auth!.userId,
    actorEmail: req.auth!.email,
    action: "tenant.update",
    entityType: "tenant",
    entityId: updated.id,
    diff: parsed.data,
  });

  res.json(updated);
});

// LICENSES
router.get("/licenses", requirePermission("licenses:read"), async (req, res) => {
  const Query = z.object({
    q: z.string().optional(),
    status: z.enum(["ACTIVE", "SUSPENDED", "EXPIRED", "REVOKED"]).optional(),
    productId: z.string().uuid().optional(),
    tenantId: z.string().uuid().optional(),
    limit: z.coerce.number().int().positive().max(500).default(100),
  });
  const parsed = Query.safeParse(req.query);
  if (!parsed.success) return sendProblem(res, zodToProblem(parsed.error));

  const items = await prisma.license.findMany({
    where: {
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
      ...(parsed.data.productId ? { productId: parsed.data.productId } : {}),
      ...(parsed.data.tenantId ? { tenantId: parsed.data.tenantId } : {}),
      ...(parsed.data.q
        ? {
            OR: [
              { key: { contains: parsed.data.q, mode: "insensitive" } },
              { notes: { contains: parsed.data.q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { tenant: true, product: true },
    take: parsed.data.limit,
  });
  res.json(items);
});

router.get("/licenses/:id", requirePermission("licenses:read"), async (req, res) => {
  const lic = await prisma.license.findUnique({
    where: { id: req.params.id },
    include: { activations: true, tenant: true, product: true, offlineLicenseFiles: true },
  });
  if (!lic) return sendProblem(res, problem(404, "Licencia no encontrada"));
  res.json(lic);
});

router.post("/licenses", requirePermission("licenses:write"), async (req: AuthedRequest, res) => {
  const parsed = AdminUpsertLicenseSchema.safeParse(req.body);
  if (!parsed.success) return sendProblem(res, zodToProblem(parsed.error));

  const product = await prisma.product.findUnique({ where: { id: parsed.data.productId } });
  if (!product) return sendProblem(res, problem(400, "Producto inválido"));

  const key = generateLicenseKey(product.slug, parsed.data.type);

  const created = await prisma.license.create({
    data: {
      ...parsed.data,
      key,
      modules: parsed.data.modules,
      features: parsed.data.features,
      createdByUserId: req.auth!.userId,
    } as any,
  });

  await auditLog({
    req,
    actorUserId: req.auth!.userId,
    actorEmail: req.auth!.email,
    action: "license.create",
    entityType: "license",
    entityId: created.id,
    diff: { ...parsed.data, key },
  });

  res.status(201).json(created);
});

router.put("/licenses/:id", requirePermission("licenses:write"), async (req: AuthedRequest, res) => {
  const parsed = AdminUpsertLicenseSchema.safeParse(req.body);
  if (!parsed.success) return sendProblem(res, zodToProblem(parsed.error));

  const updated = await prisma.license.update({
    where: { id: req.params.id },
    data: {
      ...parsed.data,
      modules: parsed.data.modules,
      features: parsed.data.features,
    } as any,
  });

  await auditLog({
    req,
    actorUserId: req.auth!.userId,
    actorEmail: req.auth!.email,
    action: "license.update",
    entityType: "license",
    entityId: updated.id,
    diff: parsed.data,
  });

  res.json(updated);
});

router.post("/licenses/:id/suspend", requirePermission("licenses:write"), async (req: AuthedRequest, res) => {
  const updated = await prisma.license.update({ where: { id: req.params.id }, data: { status: "SUSPENDED" } });
  await auditLog({ req, actorUserId: req.auth!.userId, actorEmail: req.auth!.email, action: "license.suspend", entityType: "license", entityId: updated.id });
  res.json(updated);
});

router.post("/licenses/:id/revoke", requirePermission("licenses:write"), async (req: AuthedRequest, res) => {
  const updated = await prisma.license.update({ where: { id: req.params.id }, data: { status: "REVOKED" } });
  await auditLog({ req, actorUserId: req.auth!.userId, actorEmail: req.auth!.email, action: "license.revoke", entityType: "license", entityId: updated.id });
  res.json(updated);
});

router.post("/licenses/:id/renew", requirePermission("licenses:write"), async (req: AuthedRequest, res) => {
  const Body = z.object({ addDays: z.number().int().positive().max(3650) });
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) return sendProblem(res, zodToProblem(parsed.error));

  const lic = await prisma.license.findUnique({ where: { id: req.params.id } });
  if (!lic) return sendProblem(res, problem(404, "Licencia no encontrada"));

  const base = lic.expiresAt && lic.expiresAt > new Date() ? lic.expiresAt : new Date();
  const expiresAt = new Date(base.getTime() + parsed.data.addDays * 86400 * 1000);

  const updated = await prisma.license.update({ where: { id: lic.id }, data: { expiresAt, status: "ACTIVE" } });

  await auditLog({
    req,
    actorUserId: req.auth!.userId,
    actorEmail: req.auth!.email,
    action: "license.renew",
    entityType: "license",
    entityId: updated.id,
    diff: { addDays: parsed.data.addDays, expiresAt },
  });

  res.json(updated);
});

// VOUCHERS (licencias fisicas)
router.get("/vouchers", requirePermission("vouchers:read"), async (req, res) => {
  const Query = z.object({
    q: z.string().optional(),
    status: z.enum(["UNUSED", "USED", "CANCELLED", "EXPIRED"]).optional(),
    productId: z.string().uuid().optional(),
    limit: z.coerce.number().int().positive().max(500).default(100),
  });
  const parsed = Query.safeParse(req.query);
  if (!parsed.success) return sendProblem(res, zodToProblem(parsed.error));

  const items = await prisma.voucher.findMany({
    where: {
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
      ...(parsed.data.productId ? { productId: parsed.data.productId } : {}),
      ...(parsed.data.q
        ? {
            OR: [
              { code: { contains: parsed.data.q, mode: "insensitive" } },
              { usedByEmail: { contains: parsed.data.q, mode: "insensitive" } },
              { batchName: { contains: parsed.data.q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { product: true, tenant: true, license: true },
    orderBy: { createdAt: "desc" },
    take: parsed.data.limit,
  });

  res.json(items);
});

router.post("/vouchers/batch", requirePermission("vouchers:write"), async (req: AuthedRequest, res) => {
  const Body = z.object({
    productId: z.string().uuid(),
    count: z.number().int().positive().max(5000),
    batchName: z.string().min(2).max(200).optional().nullable(),
    licenseType: z.enum(["DEMO", "FULL"]),
    planType: z.enum(["SUBSCRIPTION", "PERPETUAL"]),
    licenseDurationDays: z.number().int().positive().max(3650).optional().nullable(),

    maxDevices: z.number().int().positive().max(1000).default(1),
    maxActivations: z.number().int().positive().max(10000).default(1),
    offlineAllowed: z.boolean().default(true),
    revalidateDays: z.number().int().positive().max(365).optional().nullable(),
    allowedVersionMin: z.string().optional().nullable(),
    allowedVersionMax: z.string().optional().nullable(),
    modules: z.record(z.string(), z.boolean()).default({}),
    features: z.record(z.string(), z.any()).default({}),
    notes: z.string().optional().nullable(),
  });
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) return sendProblem(res, zodToProblem(parsed.error));

  const product = await prisma.product.findUnique({ where: { id: parsed.data.productId } });
  if (!product) return sendProblem(res, problem(400, "Producto inválido"));

  const created: Array<{ id: string; code: string }> = [];

  for (let i = 0; i < parsed.data.count; i++) {
    let attempts = 0;
    while (attempts < 6) {
      attempts++;
      const code = newVoucherCode();
      try {
        const row = await prisma.voucher.create({
          data: {
            code,
            status: "UNUSED",
            productId: parsed.data.productId,
            licenseType: parsed.data.licenseType,
            planType: parsed.data.planType,
            licenseDurationDays: parsed.data.licenseDurationDays ?? null,
            maxDevices: parsed.data.maxDevices,
            maxActivations: parsed.data.maxActivations,
            offlineAllowed: parsed.data.offlineAllowed,
            revalidateDays: parsed.data.revalidateDays ?? null,
            allowedVersionMin: parsed.data.allowedVersionMin ?? null,
            allowedVersionMax: parsed.data.allowedVersionMax ?? null,
            modules: parsed.data.modules,
            features: parsed.data.features,
            notes: parsed.data.notes ?? null,
            batchName: parsed.data.batchName ?? null,
            createdByUserId: req.auth!.userId,
          } as any,
          select: { id: true, code: true },
        });

        created.push(row);
        break;
      } catch (e: any) {
        const msg = String(e?.message ?? e);
        if (msg.includes("Unique constraint") || msg.includes("Voucher_code_key")) continue;
        throw e;
      }
    }
  }

  await auditLog({
    req,
    actorUserId: req.auth!.userId,
    actorEmail: req.auth!.email,
    action: "voucher.batch_create",
    entityType: "voucher_batch",
    entityId: parsed.data.productId,
    diff: { ...parsed.data, created: created.length, productSlug: product.slug },
  });

  res.status(201).json({ product: { id: product.id, name: product.name, slug: product.slug }, count: created.length, vouchers: created });
});

router.post("/vouchers/:id/cancel", requirePermission("vouchers:write"), async (req: AuthedRequest, res) => {
  const v = await prisma.voucher.findUnique({ where: { id: req.params.id } });
  if (!v) return sendProblem(res, problem(404, "Voucher no encontrado"));
  if (v.status !== "UNUSED") return sendProblem(res, problem(409, "Solo se puede cancelar si está UNUSED"));

  const updated = await prisma.voucher.update({ where: { id: v.id }, data: { status: "CANCELLED" } });

  await auditLog({
    req,
    actorUserId: req.auth!.userId,
    actorEmail: req.auth!.email,
    action: "voucher.cancel",
    entityType: "voucher",
    entityId: updated.id,
    diff: { code: updated.code },
  });

  res.json(updated);
});

// SETTINGS
router.get("/settings", requirePermission("products:read"), async (_req, res) => {
  const items = await prisma.setting.findMany();
  res.json(Object.fromEntries(items.map((s) => [s.key, s.valueJson])));
});

router.put("/settings/:key", requirePermission("settings:write"), async (req: AuthedRequest, res) => {
  const key = req.params.key;
  const Body = z.object({ value: z.any() });
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) return sendProblem(res, zodToProblem(parsed.error));

  const updated = await prisma.setting.upsert({
    where: { key },
    create: { key, valueJson: parsed.data.value, updatedByUserId: req.auth!.userId },
    update: { valueJson: parsed.data.value, updatedByUserId: req.auth!.userId },
  });

  await auditLog({
    req,
    actorUserId: req.auth!.userId,
    actorEmail: req.auth!.email,
    action: "settings.update",
    entityType: "setting",
    entityId: key,
    diff: parsed.data.value,
  });

  res.json(updated.valueJson);
});

// AUDIT
router.get("/audit", requirePermission("audit:read"), async (req, res) => {
  const Query = z.object({
    q: z.string().optional(),
    entityType: z.string().optional(),
    actorEmail: z.string().optional(),
    limit: z.coerce.number().int().positive().max(200).default(50),
  });

  const parsed = Query.safeParse(req.query);
  if (!parsed.success) return sendProblem(res, zodToProblem(parsed.error));

  const { q, entityType, actorEmail, limit } = parsed.data;

  const items = await prisma.auditLog.findMany({
    where: {
      ...(entityType ? { entityType } : {}),
      ...(actorEmail ? { actorEmail: { contains: actorEmail, mode: "insensitive" } } : {}),
      ...(q
        ? {
            OR: [
              { action: { contains: q, mode: "insensitive" } },
              { entityId: { contains: q, mode: "insensitive" } },
              { entityType: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  res.json(items);
});

// ROLES
router.get("/roles", requirePermission("users:write"), async (_req, res) => {
  const roles = await prisma.role.findMany({
    include: { permissions: { include: { permission: true } } },
    orderBy: { name: "asc" },
  });

  res.json(
    roles.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      permissions: r.permissions.map((rp) => rp.permission.key),
    }))
  );
});

// USERS
router.get("/users", requirePermission("users:write"), async (_req, res) => {
  const users = await prisma.user.findMany({ include: { role: true }, orderBy: { createdAt: "desc" } });
  res.json(users.map((u) => ({ id: u.id, email: u.email, name: u.name, role: u.role.name, isActive: u.isActive, lastLoginAt: u.lastLoginAt, createdAt: u.createdAt })));
});

router.post("/users", requirePermission("users:write"), async (req: AuthedRequest, res) => {
  const Body = z.object({ email: z.string().email(), name: z.string().min(2), password: z.string().min(8), roleId: z.string().uuid() });
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) return sendProblem(res, zodToProblem(parsed.error));

  const bcrypt = await import("bcryptjs");
  const passwordHash = await bcrypt.default.hash(parsed.data.password, 12);

  const created = await prisma.user.create({
    data: {
      email: parsed.data.email.toLowerCase(),
      name: parsed.data.name,
      passwordHash,
      roleId: parsed.data.roleId,
    },
  });

  await auditLog({
    req,
    actorUserId: req.auth!.userId,
    actorEmail: req.auth!.email,
    action: "user.create",
    entityType: "user",
    entityId: created.id,
    diff: { email: created.email, roleId: created.roleId },
  });

  res.status(201).json({ id: created.id });
});

export default router;

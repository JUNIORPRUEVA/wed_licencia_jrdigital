import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { problem } from "@fulltech/shared";
import { sendProblem, zodToProblem } from "../http";
import { generateLicenseKey } from "../utils/licenseKey";

const router = Router();

router.get("/branding", async (_req, res) => {
  const setting = await prisma.setting.findUnique({ where: { key: "branding" } });
  res.json(setting?.valueJson ?? { siteName: "FULLTECH Licensing" });
});

router.get("/products", async (_req, res) => {
  const products = await prisma.product.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ publicOrder: "asc" }, { createdAt: "desc" }],
    include: { assets: { where: { isActive: true } } },
  });

  res.json(
    products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      shortDescription: p.shortDescription,
      longDescription: p.longDescription,
      features: p.features,
      priceCents: p.priceCents,
      currency: p.currency,
      licenseModel: p.licenseModel,
      demoAvailable: p.demoAvailable,
      currentVersion: p.currentVersion,
      images: p.images,
      publicOrder: p.publicOrder,
      promoVideoUrl: p.promoVideoUrl,
      manualFileUrl: p.manualFileUrl,
      faq: p.faq,
      updatedAt: p.updatedAt,
      assets: p.assets,
    }))
  );
});

router.get("/products/:slug", async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { slug: req.params.slug },
    include: { assets: { where: { isActive: true } } },
  });

  if (!product || product.status !== "PUBLISHED") {
    return sendProblem(res, problem(404, "Producto no encontrado"));
  }

  res.json({
    id: product.id,
    name: product.name,
    slug: product.slug,
    shortDescription: product.shortDescription,
    longDescription: product.longDescription,
    features: product.features,
    priceCents: product.priceCents,
    currency: product.currency,
    licenseModel: product.licenseModel,
    demoAvailable: product.demoAvailable,
    demoDays: product.demoDays,
    currentVersion: product.currentVersion,
    images: product.images,
    publicOrder: product.publicOrder,
    promoVideoUrl: product.promoVideoUrl,
    manualFileUrl: product.manualFileUrl,
    faq: product.faq,
    updatedAt: product.updatedAt,
    assets: product.assets,
  });
});

router.get("/downloads", async (_req, res) => {
  const assets = await prisma.productAsset.findMany({
    where: { isActive: true, isDemo: true },
    include: { product: true },
    orderBy: { createdAt: "desc" },
  });

  res.json(
    assets.map((a) => ({
      id: a.id,
      product: { id: a.product.id, name: a.product.name, slug: a.product.slug },
      platform: a.platform,
      version: a.version,
      url: a.url,
      sha256: a.sha256,
      fileSize: a.fileSize,
    }))
  );
});

router.post("/redeem", async (req, res) => {
  const Body = z.object({
    code: z.string().min(6).max(64),
    tradeName: z.string().min(2).max(200),
    contactEmail: z.string().email().optional().nullable(),
    contactPhone: z.string().min(7).max(30).optional().nullable(),
  });
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) return sendProblem(res, zodToProblem(parsed.error));

  const code = parsed.data.code.trim().toUpperCase();
  const now = new Date();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const voucher = await tx.voucher.findUnique({
        where: { code },
        include: { product: true },
      });

      if (!voucher) return { kind: "not_found" as const };
      if (voucher.status !== "UNUSED") return { kind: "invalid_state" as const, status: voucher.status };

      if (voucher.licenseDurationDays && voucher.licenseDurationDays > 0) {
        // ok, computed later
      }

      const email = parsed.data.contactEmail?.toLowerCase() ?? null;
      const existingTenant =
        email
          ? await tx.tenant.findFirst({ where: { contactEmail: { equals: email, mode: "insensitive" } } })
          : null;

      const tenant =
        existingTenant ??
        (await tx.tenant.create({
          data: {
            tradeName: parsed.data.tradeName,
            legalName: parsed.data.tradeName,
            contactEmail: email,
            contactPhone: parsed.data.contactPhone ?? null,
            status: "ACTIVE",
          },
        }));

      const licenseKey = generateLicenseKey(voucher.product.slug, voucher.licenseType);
      const expiresAt = voucher.licenseDurationDays
        ? new Date(now.getTime() + voucher.licenseDurationDays * 86400 * 1000)
        : null;

      const license = await tx.license.create({
        data: {
          tenantId: tenant.id,
          productId: voucher.productId,
          key: licenseKey,
          type: voucher.licenseType,
          planType: voucher.planType,
          status: "ACTIVE",
          startsAt: now,
          expiresAt,
          maxDevices: voucher.maxDevices,
          maxActivations: voucher.maxActivations,
          offlineAllowed: voucher.offlineAllowed,
          revalidateDays: voucher.revalidateDays,
          allowedVersionMin: voucher.allowedVersionMin,
          allowedVersionMax: voucher.allowedVersionMax,
          modules: voucher.modules as any,
          features: voucher.features as any,
          notes: voucher.notes,
        } as any,
        select: { id: true, key: true, expiresAt: true },
      });

      await tx.voucher.update({
        where: { id: voucher.id },
        data: {
          status: "USED",
          usedAt: now,
          usedByEmail: email,
          tenantId: tenant.id,
          licenseId: license.id,
        },
      });

      return {
        kind: "ok" as const,
        product: { id: voucher.product.id, name: voucher.product.name, slug: voucher.product.slug },
        tenant: { id: tenant.id, tradeName: tenant.tradeName, contactEmail: tenant.contactEmail },
        license,
      };
    });

    if (result.kind === "not_found") return sendProblem(res, problem(404, "Código no encontrado"));
    if (result.kind === "invalid_state") return sendProblem(res, problem(409, "Código no disponible", `Estado: ${result.status}`));

    res.json({
      ok: true,
      product: result.product,
      tenant: result.tenant,
      license: result.license,
    });
  } catch (e) {
    return sendProblem(res, problem(500, "Error de servidor"));
  }
});

export default router;

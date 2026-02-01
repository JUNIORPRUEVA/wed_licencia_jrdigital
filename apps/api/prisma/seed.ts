import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function requireEnv(key: string) {
  const v = process.env[key];
  if (!v) {
    throw new Error(`Missing env var: ${key}. Copy apps/api/.env.example to apps/api/.env and fill values.`);
  }
  return v;
}

function licenseKey(productSlug: string, type: "DEMO" | "FULL") {
  const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `${productSlug.toUpperCase()}-${type}-${rand.slice(0, 4)}-${rand.slice(4, 8)}`;
}

type SeedProductAsset = {
  platform: string;
  version: string;
  url: string;
  sha256?: string;
  fileSize?: number;
  isDemo?: boolean;
};

type SeedProduct = {
  name: string;
  slug: string;
  shortDescription: string;
  longDescription: string;
  features: string[];
  priceCents: number;
  currency: string;
  licenseModel: "SUBSCRIPTION" | "PERPETUAL";
  demoAvailable: boolean;
  demoDays?: number;
  currentVersion: string;
  images: string[];
  publicOrder?: number | null;
  promoVideoUrl?: string | null;
  manualFileUrl?: string | null;
  faq?: Array<{ q: string; a: string }>;
  status: "PUBLISHED" | "DRAFT" | "ARCHIVED";
  assets?: SeedProductAsset[];
};

async function main() {
  const adminEmail = requireEnv("ADMIN_EMAIL").toLowerCase();
  const adminPassword = requireEnv("ADMIN_PASSWORD");
  requireEnv("AUTH_JWT_SECRET");
  requireEnv("ACTIVATION_JWT_SECRET");
  requireEnv("OFFLINE_ED25519_PRIVATE_KEY_B64");

  const permissions = [
    { key: "products:read", description: "Ver productos" },
    { key: "products:write", description: "Crear/editar productos" },
    { key: "orders:read", description: "Ver órdenes" },
    { key: "orders:write", description: "Crear/editar órdenes" },
    { key: "tenants:read", description: "Ver tenants" },
    { key: "tenants:write", description: "Crear/editar tenants" },
    { key: "licenses:read", description: "Ver licencias" },
    { key: "licenses:write", description: "Crear/editar licencias" },
    { key: "vouchers:read", description: "Ver vouchers/canjes" },
    { key: "vouchers:write", description: "Crear/editar vouchers/canjes" },
    { key: "activations:read", description: "Ver activaciones" },
    { key: "activations:write", description: "Revocar / generar offline files" },
    { key: "audit:read", description: "Ver auditoría" },
    { key: "settings:write", description: "Editar settings" },
    { key: "users:write", description: "Gestionar usuarios/roles" },
  ];

  for (const p of permissions) {
    await prisma.permission.upsert({
      where: { key: p.key },
      create: p,
      update: { description: p.description },
    });
  }

  const allPerms: Array<{ id: string; key: string }> = await prisma.permission.findMany({
    select: { id: true, key: true },
  });
  const permByKey = new Map<string, string>(allPerms.map((p) => [p.key, p.id]));

  const roles: Array<{ code: "ADMIN" | "SALES" | "SUPPORT" | "VIEWER"; name: string; permKeys: string[] }> = [
    { code: "ADMIN", name: "Admin", permKeys: allPerms.map((p) => p.key) },
    {
      code: "SALES",
      name: "Ventas",
      permKeys: ["products:read", "tenants:read", "tenants:write", "licenses:read", "licenses:write", "orders:write", "vouchers:read", "vouchers:write"],
    },
    {
      code: "SUPPORT",
      name: "Soporte",
      permKeys: ["products:read", "tenants:read", "licenses:read", "activations:read", "activations:write", "audit:read", "vouchers:read"],
    },
    {
      code: "VIEWER",
      name: "Lectura",
      permKeys: ["products:read", "tenants:read", "licenses:read", "activations:read", "audit:read", "vouchers:read"],
    },
  ];

  for (const r of roles) {
    const role = await prisma.role.upsert({
      where: { code: r.code },
      create: { code: r.code, name: r.name },
      update: { name: r.name },
    });

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: r.permKeys.map((k) => ({
        roleId: role.id,
        permissionId: permByKey.get(k)!,
      })),
    });
  }

  const adminRole = await prisma.role.findUnique({ where: { code: "ADMIN" } });
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      name: "Administrador",
      passwordHash,
      roleId: adminRole!.id,
    },
    update: {
      name: "Administrador",
      passwordHash,
      roleId: adminRole!.id,
      isActive: true,
    },
  });

  const tenant =
    (await prisma.tenant.findFirst({ where: { tradeName: "FULLTECH DEMO" } })) ??
    (await prisma.tenant.create({
      data: {
        tradeName: "FULLTECH DEMO",
        legalName: "FULLTECH DEMO",
        contactEmail: "demo@fulltech.local",
        status: "ACTIVE",
      },
    }));

  const products: SeedProduct[] = [
    {
      name: "FULLPOS",
      slug: "fullpos",
      shortDescription: "POS y facturación con inventario y reportes ejecutivos.",
      longDescription:
        "Punto de venta rápido, control de inventario, cajas y reportes en tiempo real. Diseñado para retail y restaurantes.",
      features: ["POS rápido", "Inventario multialmacén", "Reportes de ventas"],
      priceCents: 9900,
      currency: "USD",
      licenseModel: "SUBSCRIPTION" as const,
      demoAvailable: true,
      demoDays: 14,
      currentVersion: "1.0.0",
      images: [],
      publicOrder: 1,
      promoVideoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      manualFileUrl: "https://example.com/fullpos-manual.pdf",
      faq: [
        { q: "¿Incluye instalación?", a: "Sí. Coordinamos instalación y configuración inicial." },
        { q: "¿Hay soporte?", a: "Soporte por WhatsApp y actualizaciones según el plan." },
      ],
      status: "PUBLISHED" as const,
      assets: [
        {
          platform: "windows-x64",
          version: "1.0.0",
          url: "https://example.com/fullpos-demo.exe",
          isDemo: true,
        },
      ],
    },
    {
      name: "FULLCRM",
      slug: "fullcrm",
      shortDescription: "CRM con embudos, contactos y reportes.",
      longDescription:
        "Gestiona clientes, embudos, tareas y reportes para equipos comerciales. Integrado con licencias online/offline.",
      features: ["Pipelines", "Automatizaciones", "Reportes"],
      priceCents: 12900,
      currency: "USD",
      licenseModel: "SUBSCRIPTION" as const,
      demoAvailable: true,
      demoDays: 14,
      currentVersion: "1.0.0",
      images: [],
      publicOrder: 2,
      status: "PUBLISHED" as const,
      assets: [
        {
          platform: "windows-x64",
          version: "1.0.0",
          url: "https://example.com/fullcrm-demo.exe",
          isDemo: true,
        },
      ],
    },
  ];

  const productRecords = [];
  for (const p of products) {
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      create: {
        ...p,
        assets: {
          create: p.assets?.map((a) => ({
            platform: a.platform,
            version: a.version,
            url: a.url,
            sha256: a.sha256 ?? null,
            fileSize: a.fileSize ?? null,
            isDemo: a.isDemo ?? false,
          })),
        },
      },
      update: {
        name: p.name,
        shortDescription: p.shortDescription,
        longDescription: p.longDescription,
        features: p.features,
        priceCents: p.priceCents,
        currency: p.currency,
        licenseModel: p.licenseModel,
        demoAvailable: p.demoAvailable,
        demoDays: p.demoDays,
        currentVersion: p.currentVersion,
        images: p.images,
        publicOrder: p.publicOrder ?? null,
        promoVideoUrl: p.promoVideoUrl ?? null,
        manualFileUrl: p.manualFileUrl ?? null,
        faq: p.faq ? (p.faq as any) : undefined,
        status: p.status,
      },
    });

    if (p.assets?.length) {
      await prisma.productAsset.deleteMany({ where: { productId: product.id } });
      await prisma.productAsset.createMany({
        data: p.assets.map((a) => ({
          productId: product.id,
          platform: a.platform,
          version: a.version,
          url: a.url,
          sha256: a.sha256 ?? null,
          fileSize: a.fileSize ?? null,
          isDemo: a.isDemo ?? false,
        })),
      });
    }

    productRecords.push(product);
  }

  const demoDays = 14;
  const expiresAt = new Date(Date.now() + demoDays * 86400 * 1000);

  for (const product of productRecords) {
    const seedKey = `${product.slug.toUpperCase()}-DEMO-SEED`;

    await prisma.license.upsert({
      where: { key: seedKey },
      create: {
        key: seedKey,
        tenantId: tenant.id,
        productId: product.id,
        type: "DEMO",
        planType: product.licenseModel,
        status: "ACTIVE",
        expiresAt,
        maxDevices: 1,
        maxActivations: 2,
        offlineAllowed: true,
        modules: { core: true },
        features: { seats: 1, support: "standard" },
      },
      update: {
        tenantId: tenant.id,
        productId: product.id,
        type: "DEMO",
        planType: product.licenseModel,
        status: "ACTIVE",
        expiresAt,
        maxDevices: 1,
        maxActivations: 2,
        offlineAllowed: true,
      },
    });
  }

  await prisma.setting.upsert({
    where: { key: "core" },
    create: {
      key: "core",
      valueJson: {
        jwtIssuer: "license-core",
      },
    },
    update: {
      valueJson: {
        jwtIssuer: "license-core",
      },
    },
  });

  await prisma.setting.upsert({
    where: { key: "revalidation" },
    create: { key: "revalidation", valueJson: { offlineDays: 7 } },
    update: { valueJson: { offlineDays: 7 } },
  });

  await prisma.setting.upsert({
    where: { key: "branding" },
    create: { key: "branding", valueJson: { siteName: "FULLTECH Licensing" } },
    update: { valueJson: { siteName: "FULLTECH Licensing" } },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Seed completed.");
  })
  .catch(async (e) => {
    console.error(String(e));
    await prisma.$disconnect();
    process.exit(1);
  });

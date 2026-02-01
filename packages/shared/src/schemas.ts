import { z } from "zod";

export const PermissionKeySchema = z.string().min(3);

export const ProductStatusSchema = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);
export const LicenseModelSchema = z.enum(["SUBSCRIPTION", "PERPETUAL"]);
export const LicenseTypeSchema = z.enum(["DEMO", "FULL"]);
export const LicenseStatusSchema = z.enum([
  "ACTIVE",
  "SUSPENDED",
  "EXPIRED",
  "REVOKED",
]);

export const ProductAssetTypeSchema = z.enum([
  "DEMO_INSTALLER",
  "FULL_INSTALLER",
  "SCREENSHOT",
  "DOCUMENTATION",
]);

export const OrderStatusSchema = z.enum([
  "DRAFT",
  "PENDING_PAYMENT",
  "PAID",
  "CANCELLED",
  "REFUNDED",
]);

export const TenantStatusSchema = z.enum(["ACTIVE", "INACTIVE"]);

export const PublicProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2),
  slug: z.string().min(2),
  shortDescription: z.string().min(10),
  longDescription: z.string().min(10),
  features: z.array(z.string()).default([]),
  priceCents: z.number().int().nonnegative(),
  currency: z.string().min(3).max(3).default("USD"),
  licenseModel: LicenseModelSchema,
  demoAvailable: z.boolean(),
  currentVersion: z.string().min(1),
  images: z.array(z.string().url()).default([]),
  publicOrder: z.number().int().nonnegative().max(100000).optional().nullable(),
  promoVideoUrl: z.string().url().optional().nullable(),
  manualFileUrl: z.string().url().optional().nullable(),
  faq: z.array(z.object({ q: z.string().min(2), a: z.string().min(2) })).optional().nullable(),
  status: ProductStatusSchema,
});

export const AdminUpsertProductSchema = z.object({
  name: z.string().min(2),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug inválido"),
  shortDescription: z.string().min(10),
  longDescription: z.string().min(10),
  features: z.array(z.string()).default([]),
  priceCents: z.number().int().nonnegative(),
  currency: z.string().min(3).max(3).default("USD"),
  licenseModel: LicenseModelSchema,
  demoAvailable: z.boolean(),
  demoDays: z.number().int().positive().max(365).optional(),
  currentVersion: z.string().min(1),
  images: z.array(z.string().url()).default([]),
  publicOrder: z.number().int().nonnegative().max(100000).optional().nullable(),
  promoVideoUrl: z.string().url().optional().nullable(),
  manualFileUrl: z.string().url().optional().nullable(),
  faq: z.array(z.object({ q: z.string().min(2), a: z.string().min(2) })).optional().nullable(),
  status: ProductStatusSchema,
  offlineRequestVerifyKey: z.string().min(10).optional().nullable(),
});

export const AdminUpsertTenantSchema = z.object({
  tradeName: z.string().min(2),
  legalName: z.string().min(2).optional().nullable(),
  rnc: z.string().min(5).optional().nullable(),
  address: z.string().min(3).optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  contactPhone: z.string().min(7).optional().nullable(),
  status: TenantStatusSchema.default("ACTIVE"),
});

export const AdminUpsertLicenseSchema = z.object({
  tenantId: z.string().uuid(),
  productId: z.string().uuid(),
  type: LicenseTypeSchema,
  planType: LicenseModelSchema,
  status: LicenseStatusSchema.default("ACTIVE"),
  startsAt: z.coerce.date().optional().nullable(),
  expiresAt: z.coerce.date().optional().nullable(),
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

export const OnlineActivationRequestSchema = z.object({
  licenseKey: z.string().min(8),
  productId: z.string().uuid(),
  appVersion: z.string().min(1),
  deviceFingerprint: z.string().min(8),
});

export const OfflineRequestPayloadSchema = z.object({
  productId: z.string().uuid(),
  appVersion: z.string().min(1),
  deviceFingerprint: z.string().min(8),
  tenantName: z.string().optional().nullable(),
  timestamp: z.number().int().positive(),
  nonce: z.string().min(8),
});

export const OfflineRequestFileSchema = z.object({
  payload: OfflineRequestPayloadSchema,
  checksumSha256: z.string().min(64).max(64),
  signatureEd25519: z.string().optional().nullable(),
});

export const OfflineLicenseFilePayloadSchema = z.object({
  licenseId: z.string().uuid(),
  tenantId: z.string().uuid(),
  productId: z.string().uuid(),
  features: z.record(z.string(), z.any()).default({}),
  modules: z.record(z.string(), z.boolean()).default({}),
  expiry: z.string().datetime(),
  deviceIdHash: z.string().min(64).max(64),
  issuedAt: z.string().datetime(),
  requestNonce: z.string().min(8),
});

export type OnlineActivationRequest = z.infer<typeof OnlineActivationRequestSchema>;
export type OfflineRequestFile = z.infer<typeof OfflineRequestFileSchema>;
export type OfflineLicenseFilePayload = z.infer<typeof OfflineLicenseFilePayloadSchema>;

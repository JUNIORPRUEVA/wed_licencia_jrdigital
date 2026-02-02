-- CreateEnum
CREATE TYPE "VoucherStatus" AS ENUM ('UNUSED', 'USED', 'CANCELLED', 'EXPIRED');

-- CreateTable
CREATE TABLE "Voucher" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "VoucherStatus" NOT NULL DEFAULT 'UNUSED',

    "productId" TEXT NOT NULL,
    "licenseType" "LicenseType" NOT NULL,
    "planType" "LicenseModel" NOT NULL,
    "licenseDurationDays" INTEGER,

    "maxDevices" INTEGER NOT NULL DEFAULT 1,
    "maxActivations" INTEGER NOT NULL DEFAULT 1,
    "offlineAllowed" BOOLEAN NOT NULL DEFAULT true,
    "revalidateDays" INTEGER,
    "allowedVersionMin" TEXT,
    "allowedVersionMax" TEXT,
    "modules" JSONB NOT NULL DEFAULT '{}',
    "features" JSONB NOT NULL DEFAULT '{}',
    "notes" TEXT,

    "batchName" TEXT,

    "tenantId" TEXT,
    "licenseId" TEXT,
    "usedAt" TIMESTAMP(3),
    "usedByEmail" TEXT,

    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Voucher_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Voucher_code_key" ON "Voucher"("code");

-- CreateIndex
CREATE INDEX "Voucher_status_createdAt_idx" ON "Voucher"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Voucher_productId_createdAt_idx" ON "Voucher"("productId", "createdAt");

-- AddForeignKey
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "License"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

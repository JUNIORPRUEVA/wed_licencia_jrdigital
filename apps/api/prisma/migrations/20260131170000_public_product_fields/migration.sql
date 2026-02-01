-- Add public-facing optional fields to Product
ALTER TABLE "Product"
  ADD COLUMN "publicOrder" INTEGER,
  ADD COLUMN "promoVideoUrl" TEXT,
  ADD COLUMN "manualFileUrl" TEXT,
  ADD COLUMN "faq" JSONB;


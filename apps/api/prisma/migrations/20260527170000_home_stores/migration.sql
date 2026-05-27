-- HOME STORES — Boutique showcase del storefront
--
-- CRUD ilimitado de tiendas físicas administradas desde SUPERADMIN.
-- Separado del modelo `inventory_locations` (operacional POS) para que la
-- presentación editorial del home no contamine el dominio de stock.

-- CreateTable
CREATE TABLE "home_stores" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "reference" TEXT,
    "whatsapp" TEXT,
    "schedule" TEXT,
    "mapsUrl" TEXT,
    "imageDesktop" TEXT,
    "imageMobile" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "home_stores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "home_stores_active_sortOrder_idx" ON "home_stores"("active", "sortOrder");

-- HOME CATEGORIES — Carrusel editorial del storefront
--
-- 3 slots fijos editables desde SUPERADMIN: JEWELRY, PERFUME, RAFFLE.
-- Separado del modelo `Category` del catálogo porque RAFFLE no es una
-- categoría de producto y la presentación editorial del home tiene su
-- propio set de assets (imagen desktop/mobile, overlay) independiente.

-- CreateEnum
CREATE TYPE "HomeCategorySlot" AS ENUM ('JEWELRY', 'PERFUME', 'RAFFLE');

-- CreateTable
CREATE TABLE "home_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slot" "HomeCategorySlot" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "eyebrow" TEXT,
    "label" TEXT NOT NULL,
    "ctaHref" TEXT NOT NULL,
    "imageDesktop" TEXT,
    "imageMobile" TEXT,
    "overlayColor" TEXT NOT NULL DEFAULT '#0A0A0A',
    "overlayOpacity" INTEGER NOT NULL DEFAULT 35,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "home_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "home_categories_slot_key" ON "home_categories"("slot");

-- CreateIndex
CREATE INDEX "home_categories_active_sortOrder_idx" ON "home_categories"("active", "sortOrder");

-- Seed inicial: 3 slots con placeholders editables, todos visibles por default.
INSERT INTO "home_categories" ("slot", "sortOrder", "active", "eyebrow", "label", "ctaHref", "overlayColor", "overlayOpacity", "updatedAt")
VALUES
  ('JEWELRY', 1, true, 'Joyería', 'Joyas',    '/shop?category=joyas',    '#0A0A0A', 35, CURRENT_TIMESTAMP),
  ('PERFUME', 2, true, 'Perfumería', 'Perfumes', '/shop?category=perfumes', '#0A0A0A', 35, CURRENT_TIMESTAMP),
  ('RAFFLE',  3, true, 'Club Púrpura', 'Sorteos',  '/sorteos',                '#0A0A0A', 40, CURRENT_TIMESTAMP);

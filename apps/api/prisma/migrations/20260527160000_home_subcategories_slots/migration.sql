-- HOME CATEGORIES — Migración a 6 subcategorías editoriales
--
-- Cambia el enum HomeCategorySlot de 3 categorías genéricas (JEWELRY/PERFUME/RAFFLE)
-- a 6 subcategorías específicas del catálogo. PostgreSQL no permite eliminar
-- valores de un enum en uso, así que la ruta limpia es:
--   1. DROP TABLE home_categories (perdemos solo el seed editorial, no produce data crítica).
--   2. DROP TYPE HomeCategorySlot.
--   3. Recrear ambos con los 6 nuevos slots.
--   4. Re-seed con destinos /shop?subcategory=...

-- 1. DROP table + type
DROP TABLE IF EXISTS "home_categories";
DROP TYPE  IF EXISTS "HomeCategorySlot";

-- 2. CreateEnum
CREATE TYPE "HomeCategorySlot" AS ENUM (
  'PERFUMES_HOMBRE',
  'PERFUMES_MUJER',
  'JOYAS_ACERO_DORADO',
  'JOYAS_ACERO_PLATEADO',
  'JOYAS_BANADAS_ORO',
  'JOYAS_PLATA'
);

-- 3. CreateTable (misma estructura que antes)
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

-- 4. Seed editorial con los 6 destinos /shop?subcategory=...
INSERT INTO "home_categories" ("slot", "sortOrder", "active", "eyebrow", "label", "ctaHref", "overlayColor", "overlayOpacity", "updatedAt")
VALUES
  ('PERFUMES_HOMBRE',      1, true, 'Perfumería',  'Perfumes para hombre',     '/shop?subcategory=perfumes-hombre',       '#0A0A0A', 38, CURRENT_TIMESTAMP),
  ('PERFUMES_MUJER',       2, true, 'Perfumería',  'Perfumes para mujer',      '/shop?subcategory=perfumes-mujer',        '#0A0A0A', 38, CURRENT_TIMESTAMP),
  ('JOYAS_ACERO_DORADO',   3, true, 'Joyería',     'Joyas en acero dorado',    '/shop?subcategory=joyas-acero-dorado',    '#0A0A0A', 35, CURRENT_TIMESTAMP),
  ('JOYAS_ACERO_PLATEADO', 4, true, 'Joyería',     'Joyas en acero plateado',  '/shop?subcategory=joyas-acero-plateado',  '#0A0A0A', 35, CURRENT_TIMESTAMP),
  ('JOYAS_BANADAS_ORO',    5, true, 'Joyería',     'Joyas bañadas en oro',     '/shop?subcategory=joyas-banadas-en-oro',  '#0A0A0A', 35, CURRENT_TIMESTAMP),
  ('JOYAS_PLATA',          6, true, 'Joyería',     'Joyas de plata',           '/shop?subcategory=joyas-plata',           '#0A0A0A', 35, CURRENT_TIMESTAMP);

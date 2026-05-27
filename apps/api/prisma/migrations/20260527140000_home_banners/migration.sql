-- HOME BANNERS — CMS editorial (storefront hero)
--
-- 4 slots fijos editables desde SUPERADMIN: JEWELRY, PERFUME, RAFFLE, FLEXIBLE.
-- Cada slot es único; el slot FLEXIBLE puede desactivarse (active=false) para
-- ocultar la franja en el storefront. Imágenes desktop/mobile separadas para
-- evitar recortes pobres en mobile.

-- CreateEnum
CREATE TYPE "HomeBannerSlot" AS ENUM ('JEWELRY', 'PERFUME', 'RAFFLE', 'FLEXIBLE');

-- CreateEnum
CREATE TYPE "HomeBannerAlign" AS ENUM ('LEFT', 'CENTER', 'RIGHT');

-- CreateTable
CREATE TABLE "home_banners" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slot" "HomeBannerSlot" NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "eyebrow" TEXT,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "ctaLabel" TEXT NOT NULL,
    "ctaHref" TEXT NOT NULL,
    "imageDesktop" TEXT,
    "imageMobile" TEXT,
    "overlayColor" TEXT NOT NULL DEFAULT '#0A0A0A',
    "overlayOpacity" INTEGER NOT NULL DEFAULT 40,
    "align" "HomeBannerAlign" NOT NULL DEFAULT 'LEFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "home_banners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "home_banners_slot_key" ON "home_banners"("slot");

-- CreateIndex
CREATE INDEX "home_banners_active_order_idx" ON "home_banners"("active", "order");

-- Seed inicial: los 4 slots se crean con valores placeholder editables.
-- El slot FLEXIBLE arranca inactivo para no mostrarse en el storefront
-- hasta que el admin lo configure.
INSERT INTO "home_banners" ("slot", "order", "active", "eyebrow", "title", "subtitle", "ctaLabel", "ctaHref", "overlayColor", "overlayOpacity", "align", "updatedAt")
VALUES
  ('JEWELRY',  1, true,  'Joyería atemporal',  'El detalle que distingue',   'Piezas en acero quirúrgico, plata 925 y baño de oro 18k. Hipoalergénicas y duraderas.', 'Ver productos', '/shop?category=joyas',    '#0A0A0A', 45, 'LEFT',  CURRENT_TIMESTAMP),
  ('PERFUME',  2, true,  'Perfumería de autor','El aroma que te distingue',  'Composiciones premium con jazmín, vainilla y maderas blancas, listas para envío en todo el Perú.', 'Ver productos', '/shop?category=perfumes', '#0A0A0A', 45, 'RIGHT', CURRENT_TIMESTAMP),
  ('RAFFLE',   3, true,  'Club Púrpura',       'Participa y gana experiencias', 'Cada compra te acerca a premios exclusivos: viajes, joyas, perfumes y más.', 'Ir a sorteos',  '/sorteos',                '#0A0A0A', 50, 'LEFT',  CURRENT_TIMESTAMP),
  ('FLEXIBLE', 4, false, 'Edición especial',   'Tu próxima campaña',         'Banner flexible — configúralo desde el panel cuando lo necesites.', 'Descubrir',     '/shop',                   '#0A0A0A', 45, 'CENTER', CURRENT_TIMESTAMP);

"use client";

import { motion } from "framer-motion";
import { ArrowRight, Heart, ImageOff, ShoppingBag, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/shared/lib/cn";
import { formatCurrency } from "@/shared/lib/format";
import { useCartStore } from "@/stores/cart.store";
import { toast } from "@/stores/toast.store";
import {
  selectIsFavorite,
  useWishlistStore,
} from "@/stores/wishlist.store";
import type { ProductEntity } from "@/types/api";

interface ProductCardProps {
  product: ProductEntity;
  /** Forzar layout vertical (default) o horizontal compacto. */
  variant?: "vertical" | "compact";
  /**
   * Densidad visual del card vertical. "default" para la grilla principal
   * de catálogo; "sm" para related products / recomendaciones (aspect cuadrado,
   * tipografía y botones más chicos, feel más editorial).
   */
  size?: "default" | "sm";
  /** Hint para optimizar `sizes` cuando la card vive en un row específico. */
  imageSizes?: string;
  /**
   * Tratamiento del CTA de la card:
   *  - "overlay" (default): pill flotante sobre la imagen — visible siempre
   *    en mobile, fade-in en hover desktop. Pensado para grillas densas.
   *  - "reveal": sin botón visible. La card completa es clickable y al
   *    hacer hover (solo desktop) se revela un overlay editorial con
   *    "Ver producto →". Estética luxury Zara/COS/Acne, pensada para
   *    showcase del home donde la calma visual gana sobre el quick-add.
   */
  quickAdd?: "overlay" | "reveal";
}

/**
 * REGLA VISUAL GLOBAL — siempre que un producto tenga oferta vigente
 * (`discountActive` + `salePrice<price` ⇒ hay `discountPct`), la card
 * renderiza dos badges en fila arriba-izquierda:
 *
 *   [−15%]   [✦ +10% Club]
 *
 * El segundo refuerza el upside de la membresía: "obtienes un 10% más por
 * encima de la oferta". Este % es espejo del `MEMBER_EXTRA_DISCOUNT = 0.10`
 * del backend (`apps/api/src/common/utils/pricing.util.ts`). No es
 * opt-in por sección — vive en ProductCard porque ahí concentramos la
 * mayoría de surfaces (home, carruseles, shop, search, related, ofertas).
 */
const CLUB_BENEFIT_PCT = 10;

const DEFAULT_SIZES =
  "(min-width: 1280px) 22vw, (min-width: 1024px) 25vw, 50vw";

export function ProductCard({
  product,
  variant = "vertical",
  size = "default",
  imageSizes,
  quickAdd = "overlay",
}: ProductCardProps) {
  const isSm = size === "sm" && variant === "vertical";
  const add = useCartStore((s) => s.add);
  const toggleFavorite = useWishlistStore((s) => s.toggle);
  const isFavorite = useWishlistStore(selectIsFavorite(product.id));

  const primary = product.images[0]?.url ?? null;
  const secondary = product.images[1]?.url ?? null;
  const [primaryError, setPrimaryError] = useState(false);
  const [secondaryError, setSecondaryError] = useState(false);
  const showPrimary = Boolean(primary) && !primaryError;
  const showSecondary = Boolean(secondary) && !secondaryError && showPrimary;

  const totalStock = product.inventory.totalStock;
  const outOfStock = totalStock <= 0;
  const lowStock = !outOfStock && totalStock <= 5;

  const hasDiscount =
    product.discountActive &&
    product.salePrice !== null &&
    product.salePrice < product.price;
  const finalPrice = hasDiscount
    ? (product.salePrice ?? product.price)
    : product.price;
  const compareAt = hasDiscount ? product.price : null;
  const discountPct =
    hasDiscount && product.discountPercentage
      ? Math.round(product.discountPercentage)
      : null;

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) return;
    add({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      sku: product.sku,
      image: primary,
      unitPrice: finalPrice,
      stock: totalStock,
      category: product.categories[0]?.name ?? null,
    });
    toast.success(`${product.name} agregado al carrito`);
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const wasAdded = toggleFavorite({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      sku: product.sku,
      image: primary,
      unitPrice: finalPrice,
      compareAtPrice: compareAt,
      stock: totalStock,
      category: product.categories[0]?.name ?? null,
    });
    if (wasAdded) {
      toast.success("Guardado en favoritos");
    }
  };

  const sizes =
    variant === "compact" ? "96px" : (imageSizes ?? DEFAULT_SIZES);

  return (
    <Link
      href={`/product/${product.slug}`}
      className={cn(
        "group block",
        variant === "compact" && "flex gap-4 rounded-2xl bg-white p-2",
      )}
    >
      <motion.div
        whileHover={{ y: variant === "vertical" ? (isSm ? -2 : -3) : 0 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "relative overflow-hidden bg-[#f8f8f8] ring-1 ring-black/4 transition-shadow duration-300",
          variant === "vertical"
            ? cn(
                "w-full rounded-2xl group-hover:shadow-[0_24px_48px_-24px_rgba(17,17,17,0.18)] group-hover:ring-black/10",
                // sm: cuadrado más editorial. default: portrait clásico ecommerce.
                isSm ? "aspect-square" : "aspect-4/5",
              )
            : "size-24 shrink-0 rounded-xl",
        )}
      >
        {showPrimary ? (
          <>
            <Image
              src={primary as string}
              alt={product.name}
              fill
              sizes={sizes}
              onError={() => setPrimaryError(true)}
              className={cn(
                "object-cover transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
                variant === "vertical" && "group-hover:scale-[1.05]",
                // Si hay imagen secundaria, escondemos la primaria al hover
                // para que la transición sea de imagen-a-imagen, no doble.
                showSecondary && "group-hover:opacity-0",
              )}
            />
            {showSecondary ? (
              <Image
                src={secondary as string}
                alt={`${product.name} — vista alternativa`}
                fill
                sizes={sizes}
                onError={() => setSecondaryError(true)}
                className="object-cover opacity-0 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.05] group-hover:opacity-100"
              />
            ) : null}
          </>
        ) : (
          <FallbackImage hadUrl={Boolean(primary)} />
        )}

        {variant === "vertical" ? (
          <>
            {/* Badges (esquina superior izquierda) — minimalistas, sin grito.
                Regla global del storefront:
                  · Si el producto tiene oferta vigente → se renderiza el
                    badge de descuento + el badge "+10% Club" en fila
                    horizontal ([−15%] [✦ +10% Club]). Comunica el doble
                    beneficio que obtiene un miembro.
                  · Si no hay oferta y el producto es `featured` → badge
                    "Destacado" suelto en columna.
                sm: padding/text/tracking reducidos para no dominar el card
                chico (random picks, related products). */}
            {(() => {
              const hasDiscountBadge = Boolean(discountPct);
              return (
                <div
                  className={cn(
                    "pointer-events-none absolute flex items-start",
                    hasDiscountBadge ? "flex-row flex-wrap" : "flex-col",
                    isSm
                      ? hasDiscountBadge
                        ? "left-2 top-2 gap-1.5"
                        : "left-2 top-2 gap-1"
                      : hasDiscountBadge
                        ? "left-3 top-3 gap-2"
                        : "left-3 top-3 gap-1.5",
                    // Reservamos espacio para el botón de wishlist (right-3,
                    // size-9) y un respiro adicional. En sm el wishlist es
                    // size-7 (right-2). Así evitamos solape cuando ambos
                    // badges entran en la misma fila.
                    isSm
                      ? "right-10 max-w-[calc(100%-2.75rem)]"
                      : "right-13 max-w-[calc(100%-3.5rem)]",
                  )}
                >
                  {hasDiscountBadge ? (
                    <>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full bg-[#0A0A0A] font-semibold uppercase text-white tabular-nums",
                          isSm
                            ? "px-1.5 py-0.5 text-[9px] tracking-[0.14em]"
                            : "px-2 py-0.75 text-[10px] tracking-[0.16em]",
                        )}
                      >
                        −{discountPct}%
                      </span>
                      <ClubBenefitBadge percent={CLUB_BENEFIT_PCT} isSm={isSm} />
                    </>
                  ) : product.featured ? (
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full bg-white/90 font-medium uppercase text-[#0A0A0A]/75 ring-1 ring-black/6 backdrop-blur",
                        isSm
                          ? "px-1.5 py-0.5 text-[9px] tracking-[0.16em]"
                          : "px-2 py-0.75 text-[10px] tracking-[0.18em]",
                      )}
                    >
                      Destacado
                    </span>
                  ) : null}
                </div>
              );
            })()}

            {/* Out of stock overlay — bloquea el card, lo grayscale-a */}
            {outOfStock ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/55 backdrop-blur-[1px]">
                <span
                  className={cn(
                    "rounded-full bg-[#0A0A0A]/90 font-semibold uppercase text-white",
                    isSm
                      ? "px-2.5 py-0.5 text-[9px] tracking-[0.2em]"
                      : "px-3 py-1 text-[10px] tracking-[0.22em]",
                  )}
                >
                  Agotado
                </span>
              </div>
            ) : null}

            {/* Stock bajo — discreto, abajo izquierda */}
            {lowStock ? (
              <div
                className={cn(
                  "pointer-events-none absolute inline-flex items-center rounded-full bg-white/90 font-medium text-[#0A0A0A]/70 ring-1 ring-black/4 backdrop-blur",
                  isSm
                    ? "left-2 bottom-2 gap-1 px-1.5 py-0.5 text-[9px]"
                    : "left-3 bottom-3 gap-1.5 px-2 py-0.5 text-[10px]",
                )}
              >
                <span className="inline-block size-1.5 rounded-full bg-amber-500" />
                Últimas {totalStock}
              </div>
            ) : null}

            {/* Wishlist — glass, siempre visible (luxury habit) */}
            <button
              type="button"
              onClick={handleFavorite}
              aria-label={
                isFavorite ? "Quitar de favoritos" : "Guardar en favoritos"
              }
              aria-pressed={isFavorite}
              className={cn(
                "absolute inline-flex items-center justify-center rounded-full backdrop-blur-md transition-all duration-300 active:scale-95",
                isSm ? "right-2 top-2 size-7" : "right-3 top-3 size-9",
                isFavorite
                  ? "bg-[#9810FA] text-white shadow-[0_8px_20px_-8px_rgba(152,16,250,0.55)]"
                  : "bg-white/70 text-[#0A0A0A]/80 ring-1 ring-black/6 hover:bg-white hover:text-[#0A0A0A]",
              )}
            >
              <Heart
                className={cn(
                  isSm ? "size-3.5" : "size-4",
                  isFavorite && "fill-current",
                )}
                strokeWidth={1.6}
              />
            </button>

            {/* Reveal overlay editorial — luxury Zara/COS/Acne.
                Solo desktop (touch no tiene hover real, en mobile la card
                completa es el target). Fade suave 400ms con gradient sutil
                al pie y "Ver producto →" en blanco con tracking luxury.
                `pointer-events-none` para que el click siga llegando al
                `<Link>` envolvente — no necesitamos clickear el overlay. */}
            {quickAdd === "reveal" && !outOfStock ? (
              <div
                aria-hidden
                className={cn(
                  "pointer-events-none absolute inset-0 hidden flex-col items-center justify-end pb-4 lg:flex",
                  "opacity-0 transition-opacity duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:opacity-100",
                )}
              >
                {/* Gradient sutil al pie para legibilidad del texto */}
                <div
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-[#0A0A0A]/55 via-[#0A0A0A]/15 to-transparent"
                />
                <span
                  className={cn(
                    "relative inline-flex items-center gap-1.5 font-semibold uppercase text-white",
                    isSm
                      ? "text-[10px] tracking-[0.22em]"
                      : "text-[10.5px] tracking-[0.24em]",
                  )}
                >
                  Ver producto
                  <ArrowRight
                    className={isSm ? "size-3" : "size-3.5"}
                    strokeWidth={1.8}
                  />
                </span>
              </div>
            ) : null}

            {/* Quick-add pill compacto sobre la imagen — modo "overlay" legacy.
                · Mobile: visible siempre (no hay hover en touch).
                · Desktop: oculto por default, fade-in suave en hover del card.
                Usado por shop grid / featured row; el modo "reveal" delega
                a un overlay editorial sin botón. */}
            {quickAdd === "overlay" && !outOfStock ? (
              <button
                type="button"
                onClick={handleAdd}
                aria-label="Agregar al carrito"
                className={cn(
                  "absolute inline-flex items-center rounded-full bg-white/85 font-medium text-[#0A0A0A] ring-1 ring-black/6 backdrop-blur-md transition-all duration-300 ease-out",
                  isSm
                    ? "right-2 bottom-2 h-7 gap-1 px-2.5 text-[10px]"
                    : "right-3 bottom-3 h-8 gap-1.5 px-3 text-[11px]",
                  "hover:bg-[#0A0A0A] hover:text-white hover:ring-transparent active:scale-95",
                  "lg:translate-y-1 lg:opacity-0 lg:group-hover:translate-y-0 lg:group-hover:opacity-100",
                )}
              >
                <ShoppingBag
                  className={isSm ? "size-3" : "size-3.5"}
                  strokeWidth={1.6}
                />
                <span>Agregar</span>
              </button>
            ) : null}
          </>
        ) : null}
      </motion.div>

      {/* ─── Contenido textual ─────────────────────────────────────
          Todos los textos comparten una transición de color suave
          (500ms ease-out) que se dispara cuando el cursor entra al card
          (group-hover). Salir es la misma transición a la inversa, dando
          sensación premium coordinada. Las opacidades por jerarquía se
          conservan en hover (categoría y compare-at quedan en tonos más
          tenues del morado) para no aplanar la lectura.
      */}
      <div
        className={cn(
          "min-w-0",
          variant === "vertical"
            ? cn(isSm ? "mt-3 space-y-1" : "mt-4 space-y-1.5")
            : "flex flex-1 flex-col justify-center gap-1",
        )}
      >
        <p
          className={cn(
            "truncate font-medium uppercase text-[#0A0A0A]/40 transition-colors duration-500 ease-out group-hover:text-[#9810FA]/70",
            isSm ? "text-[9px] tracking-[0.2em]" : "text-[10px] tracking-[0.22em]",
          )}
        >
          {product.categories[0]?.name ?? "Purpura Club"}
        </p>
        <h3
          className={cn(
            "line-clamp-2 font-medium leading-snug text-balance text-[#0A0A0A] transition-colors duration-500 ease-out group-hover:text-[#9810FA]",
            isSm ? "text-[13px]" : "text-[15px]",
          )}
        >
          {product.name}
        </h3>
        <div className={cn("flex items-baseline gap-2", isSm ? "pt-0.5" : "pt-1")}>
          <span
            className={cn(
              "font-semibold tabular-nums tracking-tight text-[#0A0A0A] transition-colors duration-500 ease-out group-hover:text-[#9810FA]",
              isSm ? "text-[14px]" : "text-[17px]",
            )}
          >
            {formatCurrency(finalPrice)}
          </span>
          {compareAt ? (
            <span
              className={cn(
                "text-[#0A0A0A]/40 line-through tabular-nums transition-colors duration-500 ease-out group-hover:text-[#9810FA]/55",
                isSm ? "text-[11px]" : "text-[12px]",
              )}
            >
              {formatCurrency(compareAt)}
            </span>
          ) : null}
        </div>

      </div>
    </Link>
  );
}

/**
 * Badge "✦ +X% CLUB" para la sección de ofertas. Glass morado premium con
 * glow ultra sutil que se intensifica en `group-hover` de la card. El
 * gradient interno + un shimmer diagonal le dan la lectura "luxury membership"
 * sin caer en estilos dashboard.
 *
 * Mantiene `pointer-events-none` heredado del contenedor padre — el target
 * de click es siempre el `<Link>` envolvente de la card.
 */
function ClubBenefitBadge({
  percent,
  isSm,
}: {
  percent: number;
  isSm: boolean;
}) {
  return (
    <span
      aria-label={`Miembros del Club obtienen ${percent}% adicional`}
      className={cn(
        "relative inline-flex items-center overflow-hidden rounded-full font-semibold uppercase",
        "text-white tabular-nums backdrop-blur-md",
        // Base: gradient morado translúcido + ring sutil para definir el borde
        "bg-linear-to-br from-[#9810FA]/85 via-[#7C0CD8]/80 to-[#5B0AAD]/85",
        "ring-1 ring-white/15 ring-inset",
        // Glow sutil que se intensifica en hover del card
        "shadow-[0_6px_18px_-10px_rgba(152,16,250,0.55)]",
        "transition-shadow duration-500 ease-out",
        "group-hover:shadow-[0_10px_28px_-10px_rgba(152,16,250,0.75)]",
        isSm
          ? "gap-0.5 px-1.5 py-0.5 text-[9px] tracking-[0.14em]"
          : "gap-1 px-2 py-0.75 text-[10px] tracking-[0.16em]",
      )}
    >
      {/* Micro shimmer diagonal — corre una vez en hover */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 -translate-x-full",
          "bg-linear-to-r from-transparent via-white/25 to-transparent",
          "transition-transform duration-1100 ease-[cubic-bezier(0.22,1,0.36,1)]",
          "group-hover:translate-x-full",
        )}
      />
      <Sparkles
        className={cn(
          "relative",
          isSm ? "size-2.5" : "size-3",
        )}
        strokeWidth={1.8}
      />
      <span className="relative">+{percent}% Club</span>
    </span>
  );
}

/**
 * Fallback elegante para imágenes que no existen, no cargan o están rotas.
 * Mantiene el aspect ratio del contenedor → cero CLS.
 */
function FallbackImage({ hadUrl }: { hadUrl: boolean }) {
  return (
    <div
      aria-hidden
      className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-[#0A0A0A]/30"
      style={{
        background:
          "linear-gradient(135deg, #f8f8f8 0%, #f1f1f3 60%, #ededef 100%)",
      }}
    >
      {hadUrl ? (
        <ImageOff className="size-7" strokeWidth={1.4} />
      ) : (
        <ShoppingBag className="size-7" strokeWidth={1.4} />
      )}
      <span className="text-[9px] font-medium uppercase tracking-[0.22em] text-[#0A0A0A]/35">
        {hadUrl ? "Sin imagen" : "Próximamente"}
      </span>
    </div>
  );
}

export function ProductCardSkeleton({
  size = "default",
}: {
  size?: "default" | "sm";
} = {}) {
  const isSm = size === "sm";
  return (
    <div aria-hidden>
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-2xl bg-[#f4f4f5] ring-1 ring-black/4",
          isSm ? "aspect-square" : "aspect-4/5",
        )}
      >
        <div className="absolute inset-0 animate-pulse bg-linear-to-br from-[#f8f8f8] via-[#f1f1f3] to-[#ededef]" />
      </div>
      <div className={cn(isSm ? "mt-3 space-y-1.5" : "mt-4 space-y-2")}>
        <div className="h-2 w-1/3 animate-pulse rounded bg-[#1111110a]" />
        <div
          className={cn(
            "w-3/4 animate-pulse rounded bg-[#1111110a]",
            isSm ? "h-3" : "h-3.5",
          )}
        />
        <div
          className={cn(
            "w-1/2 animate-pulse rounded bg-[#1111110a]",
            isSm ? "h-3.5" : "h-4",
          )}
        />
      </div>
    </div>
  );
}

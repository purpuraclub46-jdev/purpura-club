"use client";

import { ChevronRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import { Container } from "@/shared/ui/container";
import { cn } from "@/shared/lib/cn";
import {
  CarouselArrowButton,
  ProductScroller,
  type ProductScrollerHandle,
} from "@/features/catalog/components/product-scroller";
import { useRandomHome } from "@/features/home/hooks/use-random-home";

/**
 * RANDOM PICKS — "Selección curada" del home (luxury editorial discovery).
 *
 * Carrusel horizontal compacto con productos aleatorios traídos desde
 * `/products/random-home`. Cada navegación al home dispara un fetch nuevo
 * (refetchOnMount: "always") así que el feed se siente vivo. NO usa
 * auto-scroll — la sección anterior (subcategorías) ya lo tiene; alternar
 * ritmo evita que el home se sienta repetitivo.
 *
 * El scroll + drag + skeleton + sizing de cards vive en `ProductScroller`
 * (compartido con "Ofertas del momento" y futuras secciones). Esta sección
 * solo aporta el header editorial y la trailing tile "Ver todo".
 */

const FETCH_LIMIT = 12;

export function RandomPicksRow() {
  const { data, isLoading } = useRandomHome(FETCH_LIMIT);
  const products = data ?? [];
  const scrollerRef = useRef<ProductScrollerHandle>(null);

  // No renderizar la sección si no hay productos ni está cargando — evita
  // un bloque vacío en home cuando el catálogo todavía no tiene productos
  // activos en ECOMMERCE.
  if (!isLoading && products.length === 0) return null;

  return (
    <section className="bg-[#FAFAFA] py-14 sm:py-20">
      <Container>
        <header className="mb-8 flex flex-wrap items-end justify-between gap-3 sm:mb-12">
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.32em] text-[#9810FA]">
              <Sparkles className="size-3" /> Descubre
            </p>
            <h2 className="font-serif text-[28px] leading-[1.1] tracking-tight text-[#0A0A0A] sm:text-[36px]">
              Una colección hecha para destacar
            </h2>
          </div>

          <div className="hidden items-center gap-2 sm:flex">
            <CarouselArrowButton
              direction="prev"
              onClick={() => scrollerRef.current?.scrollPrev()}
            />
            <CarouselArrowButton
              direction="next"
              onClick={() => scrollerRef.current?.scrollNext()}
            />
          </div>
        </header>
      </Container>

      <ProductScroller
        ref={scrollerRef}
        products={products}
        isLoading={isLoading}
        ariaLabel="Selección curada"
        trailingTile={<ExploreAllTile />}
      />
    </section>
  );
}

/** Última tile del scroll: "Ver todo →" editorial luxury. Vive como tile y
 *  no como link suelto en el header para que continúe el ritmo del carrusel
 *  y el usuario lo descubra al final del swipe. */
function ExploreAllTile() {
  return (
    <Link
      href="/shop"
      className={cn(
        "group relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl",
        "border border-[#11111118] bg-white transition-all duration-500 ease-out",
        "hover:border-[#0A0A0A] hover:shadow-[0_18px_36px_-18px_rgba(17,17,17,0.16)]",
      )}
    >
      <div className="flex flex-col items-center gap-2 text-[#0A0A0A]/70 transition-colors duration-500 group-hover:text-[#9810FA]">
        <span className="inline-flex size-11 items-center justify-center rounded-full border border-current">
          <ChevronRight className="size-4" strokeWidth={1.6} />
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.26em]">
          Ver todo
        </span>
      </div>
    </Link>
  );
}

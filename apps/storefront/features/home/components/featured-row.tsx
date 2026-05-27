"use client";

import { Flame, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import { Container } from "@/shared/ui/container";
import { EmptyState } from "@/shared/ui/empty-state";
import {
  CarouselArrowButton,
  ProductScroller,
  type ProductScrollerHandle,
} from "@/features/catalog/components/product-scroller";
import { useProducts } from "@/features/catalog/hooks/use-catalog";

/**
 * Sección "Ofertas del momento" — feed editorial de productos con descuento
 * vigente. La lista se construye 100% en backend: `discounted=true` filtra a
 * los productos cuya oferta está activa (discountActive + porcentaje > 0 +
 * ventana de fechas, mismo criterio que `computeProductPricing`).
 *
 * Comparte EL MISMO `ProductScroller` que "Una colección hecha para
 * destacar", así que ambas secciones del home usan idéntico sizing,
 * spacing, hover y comportamiento de scroll. La única diferencia visible
 * son los badges `[−%]` + `[✦ +10% Club]` que ProductCard renderiza
 * automáticamente cuando el producto tiene oferta vigente.
 */
export function FeaturedRow() {
  const { data, isLoading } = useProducts({
    limit: 12,
    discounted: true,
    sort: "newest",
  });
  const products = data?.items ?? [];
  const scrollerRef = useRef<ProductScrollerHandle>(null);

  // Si no hay ofertas activas no tiene sentido mostrar la sección entera
  // (gritar "OFERTAS" con un empty-state debilita el mensaje del home).
  // Mostramos un placeholder honesto solo durante la carga.
  if (!isLoading && products.length === 0) {
    return (
      <section className="bg-[#FAFAFA] py-14 sm:py-20">
        <Container>
          <SectionHeader />
          <EmptyState
            icon={Flame}
            title="Sin ofertas vigentes por ahora"
            description="Estamos preparando la próxima ola de descuentos. Mientras tanto, explora el catálogo completo."
            action={
              <Link
                href="/shop"
                className="text-sm font-medium text-[#9810FA] hover:underline"
              >
                Ir al catálogo →
              </Link>
            }
          />
        </Container>
      </section>
    );
  }

  return (
    <section className="bg-[#FAFAFA] py-14 sm:py-20">
      <Container>
        <header className="mb-8 flex flex-wrap items-end justify-between gap-3 sm:mb-12">
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.32em] text-[#9810FA]">
              <Sparkles className="size-3" /> Ofertas exclusivas
            </p>
            <h2 className="font-serif text-[28px] leading-[1.1] tracking-tight text-[#0A0A0A] sm:text-[36px]">
              Ofertas del momento
            </h2>
            <p className="max-w-md text-sm text-[#0A0A0A]/55">
              Productos seleccionados con descuentos especiales por tiempo
              limitado.
            </p>
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
        ariaLabel="Ofertas del momento"
      />
    </section>
  );
}

function SectionHeader() {
  return (
    <header className="mb-8 space-y-2 sm:mb-12">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.32em] text-[#9810FA]">
        <Sparkles className="size-3" /> Ofertas exclusivas
      </p>
      <h2 className="font-serif text-[28px] leading-[1.1] tracking-tight text-[#0A0A0A] sm:text-[36px]">
        Ofertas del momento
      </h2>
      <p className="max-w-md text-sm text-[#0A0A0A]/55">
        Productos seleccionados con descuentos especiales por tiempo limitado.
      </p>
    </header>
  );
}

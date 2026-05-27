"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ProductCard,
  ProductCardSkeleton,
} from "@/features/catalog/components/product-card";
import { cn } from "@/shared/lib/cn";
import type { ProductEntity } from "@/types/api";

/**
 * Carrusel horizontal reutilizable que envuelve a `ProductCard size="sm"
 * quickAdd="reveal"`. Encapsula el scroll-snap, el drag-to-scroll de
 * desktop, el filtro de click post-drag y los skeletons. Es la base visual
 * compartida por TODOS los rows del home que muestran productos (Random
 * picks, Ofertas, futuras secciones), garantizando que las cards se vean y
 * se comporten exactamente igual en cada sección.
 *
 * La única personalización por consumidor son: el header (que vive afuera),
 * los controles de arrows (vía `ref.scrollPrev/scrollNext`) y una `tailing
 * tile` opcional (ej. "Ver todo" editorial).
 */

const CARD_WIDTH_CLASSES =
  "w-[58vw] sm:w-[220px] lg:w-[240px] xl:w-[260px]";

const DRAG_THRESHOLD_PX = 6;

export interface ProductScrollerHandle {
  scrollPrev: () => void;
  scrollNext: () => void;
}

export interface ProductScrollerProps {
  products: ProductEntity[];
  isLoading: boolean;
  /** Cantidad de skeletons a renderizar mientras `isLoading` está activo. */
  skeletonCount?: number;
  /**
   * Tile editorial opcional que se renderiza como última card del scroll
   * (ej. "Ver todo →" en RandomPicks). Si se pasa, se aplica el mismo
   * sizing que las cards de producto para mantener ritmo visual.
   */
  trailingTile?: ReactNode;
  /** Label accesible del grupo de cards (lo lee el screen reader). */
  ariaLabel?: string;
}

export const ProductScroller = forwardRef<
  ProductScrollerHandle,
  ProductScrollerProps
>(function ProductScroller(
  { products, isLoading, skeletonCount = 6, trailingTile, ariaLabel },
  ref,
) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Drag-to-scroll de desktop. En mobile el scroll nativo se encarga.
  // No usamos React state para `active/startX/startScrollLeft` porque cambian
  // cada pointer-move y no queremos re-renders.
  const dragState = useRef<{
    active: boolean;
    startX: number;
    startScrollLeft: number;
    moved: boolean;
  }>({ active: false, startX: 0, startScrollLeft: 0, moved: false });
  const [isDragging, setIsDragging] = useState(false);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const el = scrollerRef.current;
    if (!el) return;
    dragState.current = {
      active: true,
      startX: e.clientX,
      startScrollLeft: el.scrollLeft,
      moved: false,
    };
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current.active) return;
    const el = scrollerRef.current;
    if (!el) return;
    const dx = e.clientX - dragState.current.startX;
    if (!dragState.current.moved && Math.abs(dx) > DRAG_THRESHOLD_PX) {
      dragState.current.moved = true;
      setIsDragging(true);
      // Captura del puntero: el move/up siguen llegando incluso si el cursor
      // sale del scroller (por ejemplo, sobre una card).
      el.setPointerCapture(e.pointerId);
    }
    if (dragState.current.moved) {
      el.scrollLeft = dragState.current.startScrollLeft - dx;
    }
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollerRef.current;
    if (el && dragState.current.moved) {
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        /* puntero ya liberado por el browser */
      }
    }
    dragState.current.active = false;
    if (dragState.current.moved) {
      // Filtramos el click sintético del navegador post-mouseup en el
      // siguiente tick. Sin esto, soltar el drag sobre una card abre el
      // producto sin querer.
      window.setTimeout(() => setIsDragging(false), 0);
    }
  }, []);

  // Si el usuario soltó el drag SOBRE una card, ese mouseup dispara un click
  // en el Link. Lo prevenimos durante el primer paint post-drag.
  const dragSwallowRef = useRef(false);
  useEffect(() => {
    if (!isDragging) {
      dragSwallowRef.current = false;
      return;
    }
    dragSwallowRef.current = true;
  }, [isDragging]);

  const onClickCapture = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (dragSwallowRef.current) {
      e.preventDefault();
      e.stopPropagation();
      dragSwallowRef.current = false;
    }
  }, []);

  const scrollByCard = useCallback((direction: "prev" | "next") => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-scroller-card]");
    const step = card ? card.offsetWidth + 20 : el.clientWidth * 0.6;
    el.scrollBy({
      left: direction === "next" ? step : -step,
      behavior: "smooth",
    });
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      scrollPrev: () => scrollByCard("prev"),
      scrollNext: () => scrollByCard("next"),
    }),
    [scrollByCard],
  );

  return (
    <div
      ref={scrollerRef}
      role={ariaLabel ? "region" : undefined}
      aria-label={ariaLabel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClickCapture={onClickCapture}
      className={cn(
        "hide-scrollbar flex w-full snap-x snap-proximity gap-3 overflow-x-auto",
        "scroll-px-5 px-5 pb-2 sm:gap-4 sm:scroll-px-8 sm:px-8 lg:scroll-px-10 lg:px-10",
        isDragging ? "cursor-grabbing select-none" : "sm:cursor-grab",
      )}
    >
      {isLoading
        ? Array.from({ length: skeletonCount }).map((_, i) => (
            <div
              key={i}
              data-scroller-card
              className={cn("shrink-0", CARD_WIDTH_CLASSES)}
            >
              <ProductCardSkeleton size="sm" />
            </div>
          ))
        : products.map((p) => (
            <div
              key={p.id}
              data-scroller-card
              className={cn("snap-start shrink-0", CARD_WIDTH_CLASSES)}
            >
              <ProductCard product={p} size="sm" quickAdd="reveal" />
            </div>
          ))}
      {!isLoading && products.length > 0 && trailingTile ? (
        <div
          className={cn(
            "snap-start shrink-0 self-stretch",
            CARD_WIDTH_CLASSES,
          )}
        >
          {trailingTile}
        </div>
      ) : null}
    </div>
  );
});

/**
 * Botón redondo de navegación para el carrusel. Estética luxury minimal:
 * borde fino, micro lift en hover, ring brand en focus visible. Pensado
 * para vivir junto al título de la sección.
 */
export function CarouselArrowButton({
  direction,
  onClick,
}: {
  direction: "prev" | "next";
  onClick: () => void;
}) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === "prev" ? "Anterior" : "Siguiente"}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-full border border-[#11111118]",
        "bg-white text-[#0A0A0A] transition-all duration-300 ease-out",
        "hover:border-[#0A0A0A] hover:-translate-y-px hover:shadow-[0_10px_24px_-12px_rgba(17,17,17,0.25)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9810FA] focus-visible:ring-offset-2",
      )}
    >
      <Icon className="size-3.5" strokeWidth={1.6} />
    </button>
  );
}

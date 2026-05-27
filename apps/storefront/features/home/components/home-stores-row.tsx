"use client";

import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Store,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { Container } from "@/shared/ui/container";
import { EmptyState } from "@/shared/ui/empty-state";
import { cn } from "@/shared/lib/cn";
import { useHomeStores } from "@/features/home/hooks/use-home-stores";
import type { HomeStoreEntity } from "@/types/api";

/**
 * HOME STORES — Luxury boutique showcase (Zara Home / Aesop / Dior / COS).
 *
 * Carrusel horizontal de tiendas físicas administradas desde SUPERADMIN.
 * Cards compactas con imagen dominante, info textual mínima y CTA "Cómo
 * llegar" inline editorial. Drag-to-scroll desktop + swipe nativo mobile.
 */

const DRAG_THRESHOLD_PX = 6;

export function HomeStoresRow() {
  const { data, isLoading } = useHomeStores();
  const stores = data ?? [];

  const scrollerRef = useRef<HTMLDivElement>(null);

  // Drag-to-scroll desktop (mouse only). Mobile usa swipe nativo.
  const dragState = useRef<{
    active: boolean;
    startX: number;
    startScrollLeft: number;
    moved: boolean;
  }>({ active: false, startX: 0, startScrollLeft: 0, moved: false });
  const [isDragging, setIsDragging] = useState(false);
  const dragSwallowRef = useRef(false);

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
      dragSwallowRef.current = true;
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
        /* puntero ya liberado */
      }
    }
    dragState.current.active = false;
    if (dragState.current.moved) {
      window.setTimeout(() => setIsDragging(false), 0);
    }
  }, []);

  // Bloquea clicks accidentales sobre cards/links cuando el mouseup viene
  // de un drag — sin esto, soltar el drag sobre una card abriría su link.
  const onClickCapture = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (dragSwallowRef.current) {
      e.preventDefault();
      e.stopPropagation();
      dragSwallowRef.current = false;
    }
  }, []);

  // Wheel vertical → horizontal en desktop (touchpads horizontales ya lo
  // hacen nativamente con deltaX).
  const onWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    const el = scrollerRef.current;
    if (!el) return;
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    el.scrollBy({ left: e.deltaY, behavior: "auto" });
  }, []);

  const scrollByCard = useCallback((direction: "prev" | "next") => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-store-card]");
    const step = card ? card.offsetWidth + 20 : el.clientWidth * 0.7;
    el.scrollBy({
      left: direction === "next" ? step : -step,
      behavior: "smooth",
    });
  }, []);

  return (
    <section id="tiendas" className="bg-white py-14 sm:py-20">
      <Container>
        <header className="mb-8 flex flex-wrap items-end justify-between gap-3 sm:mb-12">
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#9810FA]">
              Nuestras tiendas
            </p>
            <h2 className="font-serif text-[28px] leading-[1.1] tracking-tight text-[#0A0A0A] sm:text-[36px]">
              Visítanos en persona
            </h2>
          </div>

          {stores.length > 0 ? (
            <div className="hidden items-center gap-2 sm:flex">
              <CarouselButton
                direction="prev"
                onClick={() => scrollByCard("prev")}
              />
              <CarouselButton
                direction="next"
                onClick={() => scrollByCard("next")}
              />
            </div>
          ) : null}
        </header>
      </Container>

      {isLoading ? (
        <div
          className={cn(
            "hide-scrollbar flex w-full gap-3 overflow-x-auto",
            "scroll-px-5 px-5 pb-2 sm:gap-4 sm:scroll-px-8 sm:px-8 lg:scroll-px-10 lg:px-10",
          )}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <StoreCardSkeleton key={i} />
          ))}
        </div>
      ) : stores.length === 0 ? (
        <Container>
          <EmptyState
            icon={Store}
            title="Nuevas boutiques en camino"
            description="Pronto anunciaremos nuestras tiendas físicas. Por ahora compra online con envío seguro a todo el Perú."
          />
        </Container>
      ) : (
        <div
          ref={scrollerRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onClickCapture={onClickCapture}
          onWheel={onWheel}
          className={cn(
            "hide-scrollbar flex w-full snap-x snap-proximity gap-3 overflow-x-auto",
            "scroll-px-5 px-5 pb-2 sm:gap-4 sm:scroll-px-8 sm:px-8 lg:scroll-px-10 lg:px-10",
            isDragging ? "cursor-grabbing select-none" : "sm:cursor-grab",
          )}
        >
          {stores.map((store, i) => (
            <StoreCard key={store.id} store={store} index={i} />
          ))}
          {/* Spacer final para que el último snap respete el padding */}
          <div aria-hidden className="shrink-0 w-px sm:w-2" />
        </div>
      )}
    </section>
  );
}

// ─── Card ────────────────────────────────────────────────────────────────

function StoreCard({ store, index }: { store: HomeStoreEntity; index: number }) {
  // Cuando hay mapsUrl, la card linkea a Google Maps; sino, no hay link
  // (la info textual se muestra igual). Target _blank para no perder la
  // sesión del storefront.
  const hasLink = Boolean(store.mapsUrl);

  const cardInner = (
    <>
      <StoreImage store={store} />

      <div className="space-y-1.5 px-1 pt-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.26em] text-[#9810FA]/80">
          {store.city}
        </p>
        <h3 className="font-serif text-[18px] leading-[1.2] tracking-tight text-[#0A0A0A] sm:text-[20px]">
          {store.name}
        </h3>

        <div className="space-y-1 pt-1 text-[12px] leading-snug text-[#0A0A0A]/65">
          <p className="flex items-start gap-1.5">
            <MapPin
              className="mt-[3px] size-3 shrink-0 text-[#0A0A0A]/35"
              strokeWidth={1.6}
            />
            <span className="truncate">{store.address}</span>
          </p>
          {store.schedule ? (
            <p className="flex items-start gap-1.5">
              <Clock
                className="mt-[3px] size-3 shrink-0 text-[#0A0A0A]/35"
                strokeWidth={1.6}
              />
              <span className="truncate">{store.schedule}</span>
            </p>
          ) : null}
        </div>

        {hasLink ? (
          <p className="pt-2.5 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#0A0A0A]/70 transition-colors duration-300 group-hover:text-[#9810FA]">
            Cómo llegar
            <ArrowUpRight
              className="size-3 transition-transform duration-300 group-hover:translate-x-0.5"
              strokeWidth={1.8}
            />
          </p>
        ) : null}
      </div>
    </>
  );

  const wrapperClasses = cn(
    "group snap-start shrink-0",
    // Mobile: ~70vw — deja ver preview de la siguiente card.
    "w-[70vw]",
    // Desktop: cards compactas, varias visibles parcialmente.
    "sm:w-[280px] lg:w-[300px] xl:w-[320px]",
  );

  const motionStyle = {
    animationDelay: `${index * 60}ms`,
  };

  if (!hasLink) {
    return (
      <article
        data-store-card
        className={cn(wrapperClasses, "animate-fade-up")}
        style={motionStyle}
      >
        {cardInner}
      </article>
    );
  }

  return (
    <Link
      data-store-card
      href={store.mapsUrl as string}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Cómo llegar a ${store.name}, ${store.city}`}
      className={cn(wrapperClasses, "block animate-fade-up")}
      style={motionStyle}
    >
      {cardInner}
    </Link>
  );
}

function StoreImage({ store }: { store: HomeStoreEntity }) {
  const desktop = store.imageDesktop ?? store.imageMobile;
  const mobile = store.imageMobile ?? store.imageDesktop;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl bg-[#0F0A14] ring-1 ring-black/4",
        // Aspect editorial — mismo en todos los breakpoints para consistencia.
        "aspect-[4/5]",
        "transition-shadow duration-500 ease-out",
        "group-hover:shadow-[0_24px_48px_-24px_rgba(17,17,17,0.18)]",
      )}
    >
      {desktop || mobile ? (
        <picture>
          {desktop ? (
            <source media="(min-width: 768px)" srcSet={desktop} />
          ) : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mobile ?? desktop ?? ""}
            alt={`${store.name}, ${store.city}`}
            className={cn(
              "size-full object-cover",
              "transition-transform duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
              "group-hover:scale-[1.04]",
            )}
            loading="lazy"
            draggable={false}
          />
        </picture>
      ) : (
        <FallbackArtwork />
      )}

      {/* Gradient editorial al pie para integrar el badge city + chip */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-[#0A0A0A]/45 to-transparent"
      />

      {/* Chip Boutique en esquina superior izquierda */}
      <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/12 px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.24em] text-white backdrop-blur-md">
        <Store className="size-2.5" strokeWidth={1.8} />
        Boutique
      </span>
    </div>
  );
}

function FallbackArtwork() {
  return (
    <div
      aria-hidden
      className="size-full transition-transform duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
      style={{
        background:
          "radial-gradient(70% 70% at 30% 25%, #2a103e 0%, #0A0A0A 65%), linear-gradient(135deg, #1c0a26 0%, #9810FA 220%)",
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center text-white/40">
        <Store className="size-10" strokeWidth={1.2} />
      </div>
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────

function StoreCardSkeleton() {
  return (
    <div
      data-store-card
      aria-hidden
      className="shrink-0 w-[70vw] sm:w-[280px] lg:w-[300px] xl:w-[320px]"
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-[#f4f4f5] ring-1 ring-black/4">
        <div className="absolute inset-0 animate-pulse bg-linear-to-br from-[#f8f8f8] via-[#f1f1f3] to-[#ededef]" />
      </div>
      <div className="space-y-2 px-1 pt-4">
        <div className="h-2 w-1/3 animate-pulse rounded bg-[#1111110a]" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-[#1111110a]" />
        <div className="h-2.5 w-2/3 animate-pulse rounded bg-[#1111110a]" />
      </div>
    </div>
  );
}

// ─── Carousel button ─────────────────────────────────────────────────────

function CarouselButton({
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

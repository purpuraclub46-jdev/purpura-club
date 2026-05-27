"use client";

import { useReducedMotion } from "framer-motion";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { Container } from "@/shared/ui/container";
import { cn } from "@/shared/lib/cn";
import { useHomeCategories } from "@/features/home/hooks/use-home-categories";
import type { HomeCategoryEntity, HomeCategorySlot } from "@/types/api";

/**
 * CATEGORIES CAROUSEL — luxury editorial subcategory showcase
 * (Zara / Cartier / Dior / COS).
 *
 * Auto-scroll infinito seamless con pausa al hover/swipe. Técnica de marquee
 * sobre scroll nativo: duplicamos el set de items y avanzamos `scrollLeft`
 * 0.45px por frame; al cruzar el ancho del primer set hacemos un wraparound
 * invisible porque el segundo set está alineado idénticamente.
 *
 * Comportamiento:
 *   • Loop infinito real — sin jump, sin reset visible.
 *   • Pausa en hover (desktop) y durante drag/swipe/wheel (mobile).
 *   • Reanudación suave 1.5s después del último gesto del usuario.
 *   • Respeta `prefers-reduced-motion`: sin autoplay, scroll manual nativo.
 *   • Sin scroll-snap mandatory — el flujo continuo se sentiría como hipo.
 *   • Cards intencionalmente compactas — "luxury teaser", no marketplace.
 */

const AUTO_SCROLL_SPEED_PX_PER_FRAME = 0.45;
const USER_INTERACTION_COOLDOWN_MS = 1500;

const SLOT_ORDER: HomeCategorySlot[] = [
  "PERFUMES_HOMBRE",
  "PERFUMES_MUJER",
  "JOYAS_ACERO_DORADO",
  "JOYAS_ACERO_PLATEADO",
  "JOYAS_BANADAS_ORO",
  "JOYAS_PLATA",
];

const FALLBACK_CATEGORIES: HomeCategoryEntity[] = [
  {
    id: "fallback-perfumes-hombre",
    slot: "PERFUMES_HOMBRE",
    sortOrder: 1,
    active: true,
    eyebrow: "Perfumería",
    label: "Perfumes para hombre",
    ctaHref: "/shop?subcategory=perfumes-hombre",
    imageDesktop: null,
    imageMobile: null,
    overlayColor: "#0A0A0A",
    overlayOpacity: 38,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "fallback-perfumes-mujer",
    slot: "PERFUMES_MUJER",
    sortOrder: 2,
    active: true,
    eyebrow: "Perfumería",
    label: "Perfumes para mujer",
    ctaHref: "/shop?subcategory=perfumes-mujer",
    imageDesktop: null,
    imageMobile: null,
    overlayColor: "#0A0A0A",
    overlayOpacity: 38,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "fallback-joyas-acero-dorado",
    slot: "JOYAS_ACERO_DORADO",
    sortOrder: 3,
    active: true,
    eyebrow: "Joyería",
    label: "Joyas en acero dorado",
    ctaHref: "/shop?subcategory=joyas-acero-dorado",
    imageDesktop: null,
    imageMobile: null,
    overlayColor: "#0A0A0A",
    overlayOpacity: 35,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "fallback-joyas-acero-plateado",
    slot: "JOYAS_ACERO_PLATEADO",
    sortOrder: 4,
    active: true,
    eyebrow: "Joyería",
    label: "Joyas en acero plateado",
    ctaHref: "/shop?subcategory=joyas-acero-plateado",
    imageDesktop: null,
    imageMobile: null,
    overlayColor: "#0A0A0A",
    overlayOpacity: 35,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "fallback-joyas-banadas-oro",
    slot: "JOYAS_BANADAS_ORO",
    sortOrder: 5,
    active: true,
    eyebrow: "Joyería",
    label: "Joyas bañadas en oro",
    ctaHref: "/shop?subcategory=joyas-banadas-en-oro",
    imageDesktop: null,
    imageMobile: null,
    overlayColor: "#0A0A0A",
    overlayOpacity: 35,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "fallback-joyas-plata",
    slot: "JOYAS_PLATA",
    sortOrder: 6,
    active: true,
    eyebrow: "Joyería",
    label: "Joyas de plata",
    ctaHref: "/shop?subcategory=joyas-plata",
    imageDesktop: null,
    imageMobile: null,
    overlayColor: "#0A0A0A",
    overlayOpacity: 35,
    createdAt: "",
    updatedAt: "",
  },
];

export function CategoriesCarousel() {
  const { data } = useHomeCategories();
  const items = useMemo(() => {
    const source = data && data.length > 0 ? data : FALLBACK_CATEGORIES;
    // Orden fijo según SLOT_ORDER, independientemente de lo que devuelva la API.
    // Los slots que la API desactive simplemente desaparecen del array.
    const bySlot = new Map<HomeCategorySlot, HomeCategoryEntity>();
    source.forEach((c) => bySlot.set(c.slot, c));
    return SLOT_ORDER.map((s) => bySlot.get(s)).filter(
      (c): c is HomeCategoryEntity => Boolean(c),
    );
  }, [data]);

  // Duplicamos los items para tener un buffer continuo y poder hacer el
  // wraparound invisible. La key combina id + index porque cada item aparece
  // dos veces y React necesita una key única por elemento renderizado.
  const displayItems = useMemo(() => [...items, ...items], [items]);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const [hover, setHover] = useState(false);
  const [userActive, setUserActive] = useState(false);
  const userActivityTimer = useRef<number | null>(null);

  // Cooldown: cualquier gesto del usuario (touch, wheel, click en flecha)
  // marca el carrusel como "userActive" por 1.5s. Tras ese tiempo el
  // auto-scroll reanuda suavemente desde la posición donde quedó.
  const markUserActive = useCallback(() => {
    setUserActive(true);
    if (userActivityTimer.current !== null) {
      window.clearTimeout(userActivityTimer.current);
    }
    userActivityTimer.current = window.setTimeout(() => {
      setUserActive(false);
      userActivityTimer.current = null;
    }, USER_INTERACTION_COOLDOWN_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (userActivityTimer.current !== null) {
        window.clearTimeout(userActivityTimer.current);
      }
    };
  }, []);

  const isPaused =
    Boolean(reduce) || hover || userActive || items.length === 0;
  useInfiniteAutoScroll(scrollerRef, {
    paused: isPaused,
    speed: AUTO_SCROLL_SPEED_PX_PER_FRAME,
  });

  const scrollByCard = useCallback(
    (direction: "prev" | "next") => {
      const el = scrollerRef.current;
      if (!el) return;
      const card = el.querySelector<HTMLElement>("[data-cat-card]");
      const step = card ? card.offsetWidth + 20 : el.clientWidth * 0.6;
      el.scrollBy({
        left: direction === "next" ? step : -step,
        behavior: "smooth",
      });
      markUserActive();
    },
    [markUserActive],
  );

  if (items.length === 0) return null;

  return (
    <section className="bg-white py-14 sm:py-20">
      <Container>
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3 sm:mb-10">
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#9810FA]">
              Showcase
            </p>
            <h2 className="font-serif text-[28px] tracking-tight text-[#0A0A0A] sm:text-[36px]">
              Encuentra tu estilo
            </h2>
          </div>

          {/* Controles discretos — siempre habilitados porque el loop es infinito */}
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
        </header>
      </Container>

      <div
        ref={scrollerRef}
        onPointerEnter={(e) => {
          // Solo pausamos por hover en dispositivos con puntero fino (mouse).
          // En touch el "hover" es spurious y bloquearía el auto-scroll.
          if (e.pointerType === "mouse") setHover(true);
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse") setHover(false);
        }}
        onTouchStart={markUserActive}
        onWheel={markUserActive}
        // aria-live=off: el contenido del carrusel rota constantemente; un
        // screen reader anunciaría cambios sin parar. Las cards individuales
        // siguen siendo navegables vía tab/enter.
        aria-live="off"
        className={cn(
          "hide-scrollbar flex w-full gap-3 overflow-x-auto",
          "scroll-px-5 px-5 pb-2 sm:gap-4 sm:scroll-px-8 sm:px-8 lg:scroll-px-10 lg:px-10",
        )}
      >
        {displayItems.map((item, i) => (
          <CategoryCard
            key={`${item.id}-${i}`}
            item={item}
            // aria-hidden para el segundo set: visualmente idéntico, pero los
            // screen readers solo deben anunciar el primero.
            ariaHidden={i >= items.length}
          />
        ))}
      </div>
    </section>
  );
}

// ─── Auto-scroll hook ───────────────────────────────────────────────────

interface UseInfiniteAutoScrollOptions {
  paused: boolean;
  speed: number;
}

/**
 * Avanza `scrollLeft` del elemento referenciado a velocidad constante. Hace
 * un wraparound invisible al cruzar la mitad del ancho total (asumiendo que
 * los items están duplicados en el contenedor).
 *
 * Cuando `paused` cambia a true, el rAF se cancela y el scroll queda donde
 * está. Al volver a false, retoma desde esa posición sin saltos.
 */
function useInfiniteAutoScroll(
  ref: RefObject<HTMLDivElement | null>,
  { paused, speed }: UseInfiniteAutoScrollOptions,
) {
  useEffect(() => {
    if (paused) return;
    const el = ref.current;
    if (!el) return;

    let rafId = 0;
    const tick = () => {
      if (el.scrollWidth > el.clientWidth) {
        const setWidth = el.scrollWidth / 2;
        let next = el.scrollLeft + speed;
        if (next >= setWidth) {
          // Wraparound: como el segundo set es idéntico al primero, restar
          // setWidth no cambia lo que el usuario ve.
          next -= setWidth;
        }
        el.scrollLeft = next;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [paused, speed, ref]);
}

// ─── Card ────────────────────────────────────────────────────────────────

function CategoryCard({
  item,
  ariaHidden,
}: {
  item: HomeCategoryEntity;
  ariaHidden: boolean;
}) {
  return (
    <div
      data-cat-card
      aria-hidden={ariaHidden || undefined}
      className={cn(
        "shrink-0",
        // Mobile: ~58% del viewport — compacto, deja 2 cards parciales visibles.
        "w-[58vw]",
        // Tablet/desktop: cards estrechas, 3-4 visibles parcialmente.
        "sm:w-[220px] lg:w-[240px] xl:w-[260px]",
      )}
    >
      <Link
        href={item.ctaHref}
        // Si la card está duplicada (aria-hidden), tabIndex=-1 para que tab
        // no la enfoque (sería un duplicado confuso del primer set).
        tabIndex={ariaHidden ? -1 : undefined}
        className={cn(
          "group relative block overflow-hidden rounded-2xl bg-[#0F0A14]",
          // Aspect ratio editorial — uniforme en todos los breakpoints.
          // 4/5 = más compacto vertical que el 3/4 anterior.
          "aspect-[4/5]",
        )}
      >
        <CategoryImage item={item} />

        {/* Overlay configurable desde admin */}
        <div
          aria-hidden
          className="absolute inset-0 transition-opacity duration-700 ease-out group-hover:opacity-80"
          style={{
            backgroundColor: item.overlayColor,
            opacity:
              Math.max(0, Math.min(100, item.overlayOpacity)) / 100,
          }}
        />

        {/* Gradient base para legibilidad del label */}
        <div
          aria-hidden
          className="absolute inset-0 bg-linear-to-t from-[#0A0A0A]/75 via-[#0A0A0A]/10 to-transparent"
        />

        {item.eyebrow ? (
          <div className="absolute left-3 top-3 sm:left-4 sm:top-4">
            <span className="inline-flex items-center rounded-full bg-white/12 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.22em] text-white/95 backdrop-blur-md sm:px-2.5 sm:py-1 sm:text-[9.5px] sm:tracking-[0.24em]">
              {item.eyebrow}
            </span>
          </div>
        ) : null}

        <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-2 sm:inset-x-4 sm:bottom-4">
          <h3 className="font-serif text-[20px] leading-[1.1] tracking-tight text-white sm:text-[22px] lg:text-[24px]">
            {item.label}
          </h3>
          <span
            aria-hidden
            className={cn(
              "inline-flex size-8 shrink-0 items-center justify-center rounded-full sm:size-9",
              "border border-white/40 bg-white/8 text-white backdrop-blur-md",
              "transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
              "group-hover:border-white group-hover:bg-white group-hover:text-[#0A0A0A]",
              "group-hover:translate-x-0.5",
            )}
          >
            <ArrowUpRight className="size-3.5 sm:size-4" strokeWidth={1.6} />
          </span>
        </div>
      </Link>
    </div>
  );
}

function CategoryImage({ item }: { item: HomeCategoryEntity }) {
  const desktop = item.imageDesktop ?? item.imageMobile;
  const mobile = item.imageMobile ?? item.imageDesktop;

  if (!desktop && !mobile) {
    return <FallbackArtwork slot={item.slot} />;
  }

  return (
    <picture>
      {desktop ? (
        <source media="(min-width: 768px)" srcSet={desktop} />
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={mobile ?? desktop ?? ""}
        alt={item.label}
        className={cn(
          "size-full object-cover",
          // Zoom luxury: 1.04, easing largo. NO bounce, NO snap.
          "transition-transform duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
          "group-hover:scale-[1.04]",
        )}
        loading="lazy"
      />
    </picture>
  );
}

function FallbackArtwork({ slot }: { slot: HomeCategorySlot }) {
  // Gradientes diferenciados por slot — sirven como "skin" cuando el admin
  // todavía no subió la imagen real. Cada uno juega con la paleta púrpura
  // pero cambia la composición para distinguir visualmente los 6 teasers.
  const gradient =
    slot === "PERFUMES_HOMBRE"
      ? "radial-gradient(60% 60% at 70% 30%, #1c0a26 0%, transparent 60%), linear-gradient(140deg, #0A0A0A 0%, #2a103e 100%)"
      : slot === "PERFUMES_MUJER"
        ? "radial-gradient(60% 60% at 30% 30%, #c026d3 0%, transparent 60%), linear-gradient(140deg, #1c0a26 0%, #0A0A0A 100%)"
        : slot === "JOYAS_ACERO_DORADO"
          ? "radial-gradient(70% 70% at 30% 25%, #b78a3c 0%, transparent 60%), linear-gradient(135deg, #1c0a26 0%, #0A0A0A 100%)"
          : slot === "JOYAS_ACERO_PLATEADO"
            ? "radial-gradient(70% 70% at 30% 25%, #d4d4d8 0%, transparent 55%), linear-gradient(135deg, #0F0A14 0%, #1c0a26 100%)"
            : slot === "JOYAS_BANADAS_ORO"
              ? "radial-gradient(60% 60% at 50% 30%, #f5c46d 0%, transparent 55%), linear-gradient(135deg, #2a103e 0%, #0A0A0A 100%)"
              : "radial-gradient(60% 60% at 50% 30%, #e4e4e7 0%, transparent 55%), linear-gradient(135deg, #1c0a26 0%, #0A0A0A 100%)";

  return (
    <div
      aria-hidden
      className={cn(
        "size-full transition-transform duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
        "group-hover:scale-[1.04]",
      )}
      style={{ background: gradient }}
    />
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

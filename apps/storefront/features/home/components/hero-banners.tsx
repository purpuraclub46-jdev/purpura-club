"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Container } from "@/shared/ui/container";
import { cn } from "@/shared/lib/cn";
import { useHomeBanners } from "@/features/home/hooks/use-home-banners";
import type { HomeBannerAlign, HomeBannerEntity } from "@/types/api";

/**
 * HERO BANNERS — Carrusel premium fade (Apple / Sephora premium).
 *
 * Una sola "ventana" cinematográfica que rota suavemente entre los slots
 * activos del CMS. Sin slide horizontal cheap: transición fade + slow zoom
 * Ken-Burns para que cada slide respire.
 *
 * Datos vienen de `/home-banners` (CMS superadmin). En SSR usamos un fallback
 * estático equivalente al seed para evitar CLS hasta que llegue la respuesta.
 */

const AUTOPLAY_MS = 7500;

const FALLBACK_BANNERS: HomeBannerEntity[] = [
  {
    id: "fallback-jewelry",
    slot: "JEWELRY",
    order: 1,
    active: true,
    eyebrow: "Joyería atemporal",
    title: "El detalle que distingue",
    subtitle:
      "Piezas en acero quirúrgico, plata 925 y baño de oro 18k. Hipoalergénicas y duraderas.",
    ctaLabel: "Ver productos",
    ctaHref: "/shop?category=joyas",
    imageDesktop: null,
    imageMobile: null,
    overlayColor: "#0A0A0A",
    overlayOpacity: 45,
    align: "LEFT",
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "fallback-perfume",
    slot: "PERFUME",
    order: 2,
    active: true,
    eyebrow: "Perfumería de autor",
    title: "El aroma que te distingue",
    subtitle:
      "Composiciones premium con jazmín, vainilla y maderas blancas, listas para envío en todo el Perú.",
    ctaLabel: "Ver productos",
    ctaHref: "/shop?category=perfumes",
    imageDesktop: null,
    imageMobile: null,
    overlayColor: "#0A0A0A",
    overlayOpacity: 45,
    align: "RIGHT",
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "fallback-raffle",
    slot: "RAFFLE",
    order: 3,
    active: true,
    eyebrow: "Club Púrpura",
    title: "Participa y gana experiencias",
    subtitle:
      "Cada compra te acerca a premios exclusivos: viajes, joyas, perfumes y más.",
    ctaLabel: "Ir a sorteos",
    ctaHref: "/sorteos",
    imageDesktop: null,
    imageMobile: null,
    overlayColor: "#0A0A0A",
    overlayOpacity: 50,
    align: "LEFT",
    createdAt: "",
    updatedAt: "",
  },
];

export function HeroBanners() {
  const { data } = useHomeBanners();
  const banners = data && data.length > 0 ? data : FALLBACK_BANNERS;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduce = useReducedMotion();

  const total = banners.length;
  const goTo = useCallback(
    (next: number) => {
      if (total === 0) return;
      setIndex(((next % total) + total) % total);
    },
    [total],
  );

  // Autoplay suave, en pausa al hover/focus o si el usuario prefiere menos motion.
  useEffect(() => {
    if (paused || reduce || total <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % total);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [paused, reduce, total]);

  const banner = banners[Math.min(index, total - 1)] ?? banners[0];
  if (!banner) return null;

  return (
    <section
      role="region"
      aria-label="Banners principales"
      aria-roledescription="carousel"
      className="relative isolate overflow-hidden bg-[#0A0A0A]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {/* Altura optimizada: mobile compacto, desktop cinematográfico */}
      <div className="group/window relative h-[62vh] min-h-110 w-full sm:h-[72vh] sm:min-h-130 lg:h-[82vh] lg:min-h-150">
        {/* Capa de fondo con fade entre slides + slow zoom (Ken Burns sutil) */}
        <AnimatePresence mode="sync">
          <motion.div
            key={`bg-${banner.id}`}
            initial={{ opacity: 0, scale: 1.06 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{
              opacity: { duration: 1.2, ease: [0.22, 1, 0.36, 1] },
              scale: { duration: 7.8, ease: [0.22, 1, 0.36, 1] },
            }}
            className="absolute inset-0"
          >
            <BannerImage banner={banner} priority />
            {/* Overlay configurable */}
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                backgroundColor: banner.overlayColor,
                opacity:
                  Math.max(0, Math.min(100, banner.overlayOpacity)) / 100,
              }}
            />
            {/* Gradient direccional para legibilidad */}
            <div
              aria-hidden
              className={cn(
                "absolute inset-0",
                banner.align === "LEFT" &&
                  "bg-linear-to-r from-[#0A0A0A]/70 via-[#0A0A0A]/15 to-transparent",
                banner.align === "RIGHT" &&
                  "bg-linear-to-l from-[#0A0A0A]/70 via-[#0A0A0A]/15 to-transparent",
                banner.align === "CENTER" &&
                  "bg-linear-to-t from-[#0A0A0A]/65 via-[#0A0A0A]/15 to-[#0A0A0A]/20",
              )}
            />
          </motion.div>
        </AnimatePresence>

        {/* Capa de texto con fade + lift escalonado */}
        <Container
          className={cn(
            "relative flex h-full items-center",
            justifyClass(banner.align),
          )}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={`txt-${banner.id}`}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                "max-w-xl space-y-5 text-white",
                textAlignClass(banner.align),
              )}
            >
              {banner.eyebrow ? (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.65,
                    delay: 0.08,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="text-[10px] font-semibold uppercase tracking-[0.36em] text-white/85"
                >
                  {banner.eyebrow}
                </motion.p>
              ) : null}

              <motion.h2
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.8,
                  delay: 0.16,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="font-serif text-[34px] leading-[1.05] tracking-tight text-white sm:text-[52px] lg:text-[64px]"
              >
                {banner.title}
              </motion.h2>

              {banner.subtitle ? (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.8,
                    delay: 0.26,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="max-w-md text-[13.5px] leading-relaxed text-white/75 sm:text-[15px]"
                >
                  {banner.subtitle}
                </motion.p>
              ) : null}

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.8,
                  delay: 0.36,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className={cn(
                  "flex pt-2",
                  banner.align === "RIGHT" && "justify-end",
                  banner.align === "CENTER" && "justify-center",
                )}
              >
                <BannerCta href={banner.ctaHref} label={banner.ctaLabel} />
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </Container>

        {/* Controles — solo aparecen si hay más de un slide */}
        {total > 1 ? (
          <>
            <CarouselArrow
              direction="prev"
              onClick={() => goTo(index - 1)}
            />
            <CarouselArrow
              direction="next"
              onClick={() => goTo(index + 1)}
            />
            <Indicators
              total={total}
              index={index}
              onSelect={goTo}
              currentSlot={banner.slot}
            />
          </>
        ) : null}
      </div>
    </section>
  );
}

// ─── Image (picture nativo: crops desktop/mobile independientes) ──────────

function BannerImage({
  banner,
  priority,
}: {
  banner: HomeBannerEntity;
  priority: boolean;
}) {
  const desktop = banner.imageDesktop ?? banner.imageMobile;
  const mobile = banner.imageMobile ?? banner.imageDesktop;

  if (!desktop && !mobile) {
    return <FallbackArtwork slot={banner.slot} />;
  }

  return (
    <picture>
      {desktop ? (
        <source media="(min-width: 768px)" srcSet={desktop} />
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={mobile ?? desktop ?? ""}
        alt={banner.title}
        className="size-full object-cover"
        fetchPriority={priority ? "high" : "auto"}
        loading={priority ? "eager" : "lazy"}
      />
    </picture>
  );
}

function FallbackArtwork({ slot }: { slot: HomeBannerEntity["slot"] }) {
  const gradient =
    slot === "JEWELRY"
      ? "radial-gradient(70% 70% at 30% 30%, #2a103e 0%, #0A0A0A 60%), linear-gradient(135deg, #1c0a26 0%, #9810FA 200%)"
      : slot === "PERFUME"
        ? "radial-gradient(60% 60% at 75% 35%, #c026d3 0%, transparent 60%), linear-gradient(135deg, #0A0A0A 0%, #1c0a26 100%)"
        : slot === "RAFFLE"
          ? "radial-gradient(55% 55% at 25% 75%, #9810FA 0%, transparent 60%), radial-gradient(45% 45% at 80% 30%, #c026d3 0%, transparent 60%), #0A0A0A"
          : "radial-gradient(70% 70% at 50% 50%, #2a103e 0%, #0A0A0A 70%)";

  return (
    <div aria-hidden className="size-full" style={{ background: gradient }}>
      <div className="absolute right-8 top-8 hidden text-white/40 sm:block">
        <Sparkles className="size-8" strokeWidth={1.2} />
      </div>
    </div>
  );
}

// ─── CTA ──────────────────────────────────────────────────────────────────

function BannerCta({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="group inline-block">
      <span
        className={cn(
          "inline-flex h-12 items-center gap-2 rounded-full bg-white px-7",
          "text-[11px] font-semibold uppercase tracking-[0.22em] text-[#0A0A0A]",
          "transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          "hover:-translate-y-px hover:bg-[#9810FA] hover:text-white",
          "hover:shadow-[0_14px_32px_-12px_rgba(152,16,250,0.55)]",
        )}
      >
        {label}
        <ArrowRight
          className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5"
          strokeWidth={1.6}
        />
      </span>
    </Link>
  );
}

// ─── Carousel controls ────────────────────────────────────────────────────

function CarouselArrow({
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
      aria-label={direction === "prev" ? "Banner anterior" : "Siguiente banner"}
      className={cn(
        "absolute top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center",
        "size-11 rounded-full border border-white/20 bg-white/8 text-white backdrop-blur-md",
        "opacity-60 transition-all duration-300 ease-out sm:flex",
        "hover:border-white/0 hover:bg-white hover:text-[#0A0A0A] hover:opacity-100",
        "hover:shadow-[0_14px_30px_-12px_rgba(0,0,0,0.45)]",
        "group-hover/window:opacity-95 focus-visible:opacity-100 focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]",
        direction === "prev" ? "left-5 sm:left-6" : "right-5 sm:right-6",
      )}
    >
      <Icon className="size-4" strokeWidth={1.6} />
    </button>
  );
}

function Indicators({
  total,
  index,
  onSelect,
  currentSlot,
}: {
  total: number;
  index: number;
  onSelect: (i: number) => void;
  currentSlot: HomeBannerEntity["slot"];
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-5 z-10 flex flex-col items-center gap-2 sm:bottom-7">
      <div className="pointer-events-auto flex items-center gap-1.5">
        {Array.from({ length: total }).map((_, i) => {
          const active = i === index;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(i)}
              aria-label={`Ir al banner ${i + 1}`}
              aria-current={active}
              className={cn(
                "h-0.75 rounded-full transition-all duration-500 ease-out",
                active
                  ? "w-9 bg-white"
                  : "w-4 bg-white/35 hover:bg-white/60",
              )}
            />
          );
        })}
      </div>
      <p className="select-none text-[10px] font-medium uppercase tracking-[0.32em] text-white/55">
        <span className="tabular-nums">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="mx-1.5 text-white/30">—</span>
        <span>{slotLabel(currentSlot)}</span>
      </p>
    </div>
  );
}

function slotLabel(slot: HomeBannerEntity["slot"]): string {
  switch (slot) {
    case "JEWELRY":
      return "Joyas";
    case "PERFUME":
      return "Perfumes";
    case "RAFFLE":
      return "Sorteos";
    case "FLEXIBLE":
      return "Edición";
  }
}

function textAlignClass(align: HomeBannerAlign): string {
  if (align === "RIGHT") return "ml-auto text-right";
  if (align === "CENTER") return "mx-auto text-center";
  return "mr-auto text-left";
}

function justifyClass(align: HomeBannerAlign): string {
  if (align === "RIGHT") return "justify-end";
  if (align === "CENTER") return "justify-center";
  return "justify-start";
}

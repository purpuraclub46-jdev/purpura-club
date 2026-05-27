"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Container } from "@/shared/ui/container";
import { cn } from "@/shared/lib/cn";

/**
 * "Beneficios del Club" — campaña editorial horizontal sin cards.
 *
 * Eliminamos por completo el chrome (cajas, bordes, glass containers). Cada
 * beneficio es ahora una "escena" que respira contra el fondo de la sección
 * (`linear-gradient(90deg, #a6a6a6, #ffffff)`). Solo número editorial,
 * eyebrow, visual flotante y tipografía. Estética Apple/Dior/COS:
 * storytelling visual en horizontal, no lista de cards.
 *
 * Arquitectura híbrida intacta:
 *   · `<MediaStage videoSrc?>` acepta video opcional. Sin video, renderiza
 *     el visual CSS+SVG flotante. Cuando lleguen los renders cinematic
 *     (HyperFrames/After Effects), basta con pasar `videoSrc` en cada
 *     `BENEFITS[i]` y el `<video>` reemplaza al fallback.
 *
 * Performance:
 *   · Reveals `whileInView once` (sin re-disparos por bounce).
 *   · Loops ambientes (rings, shimmer, pulse) usan `transform` puro
 *     → GPU-acelerados.
 *   · `useReducedMotion` corta los loops si el usuario lo activa.
 *   · Cero blur encima de gradiente; backdrop-blur reservado a las arrows.
 */
export function BenefitsBand() {
  return (
    <section
      id="beneficios"
      className="relative isolate overflow-hidden bg-white py-12 sm:py-16"
    >
      <BackdropAccents />

      <Container className="relative">
        <SectionHeader />
      </Container>

      <BenefitsScenes />

      <Container className="relative mt-12 sm:mt-16">
        <ClubFinale />
      </Container>
    </section>
  );
}

// ─── Backdrop accents ──────────────────────────────────────────────────────

/**
 * Aurora morada radial ultra-fina (apenas perceptible) en dos esquinas
 * opuestas. Es la única concesión al "fondo no plano" — el grano queda
 * fuera para no ensuciar el blanco puro luxury.
 */
function BackdropAccents() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 opacity-60"
      style={{
        background:
          "radial-gradient(40% 35% at 10% 0%, rgba(152,16,250,0.06) 0%, transparent 65%), radial-gradient(35% 30% at 92% 100%, rgba(192,38,211,0.05) 0%, transparent 65%)",
      }}
    />
  );
}

// ─── Header ────────────────────────────────────────────────────────────────

function SectionHeader() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto max-w-2xl text-center"
    >
      <p className="text-[9.5px] font-semibold uppercase tracking-[0.36em] text-[#9810FA]">
        Purpura Club
      </p>
      <h2 className="mt-2.5 font-serif text-[21px] leading-[1.1] tracking-tight text-balance text-[#0A0A0A] sm:text-[30px]">
        Beneficios pensados para quienes quieren más.
      </h2>
      <p className="mx-auto mt-2.5 max-w-md text-[12px] leading-relaxed text-[#0A0A0A]/60 sm:text-[12.5px]">
        Cada compra dentro del Club desbloquea ventajas exclusivas,
        descuentos y más oportunidades para ganar.
      </p>
    </motion.div>
  );
}

// ─── Scenes carousel ───────────────────────────────────────────────────────

interface BenefitData {
  eyebrow: string;
  title: string;
  description: string;
  visual: ReactNode;
  /** Cuando exista el render cinematic final, pasarlo aquí y `MediaStage`
   *  lo monta como `<video>` autoplay loop muted, reemplazando al fallback. */
  videoSrc?: string;
}

const BENEFITS: BenefitData[] = [
  {
    eyebrow: "Descuento adicional",
    title: "10% extra sobre cada oferta.",
    description:
      "Cuando el producto ya tiene descuento, sumamos otro 10% solo por ser miembro.",
    visual: <DiscountStackVisual />,
  },
  {
    eyebrow: "Tickets al 50%",
    title: "Tickets de sorteo a mitad de precio.",
    description:
      "Para miembros del Club cada ticket cuesta 50% menos. Más entradas, mismo presupuesto.",
    visual: <TicketHalfVisual />,
  },
  {
    eyebrow: "Tickets por compra",
    title: "+1 ticket por cada S/25.",
    description:
      "Cada vez que llenas tu carrito, ganas tickets sin pagarlos extra.",
    visual: <ProgressTicketVisual />,
  },
  {
    eyebrow: "Programa de referidos",
    title: "Gana tickets por cada referido.",
    description:
      "Comparte tu código del Club. Cada registro suma tickets al próximo sorteo.",
    visual: <ReferralNetworkVisual />,
  },
];

const DRAG_THRESHOLD_PX = 6;

/**
 * Carrusel cinematográfico horizontal. Drag desktop + swipe nativo mobile,
 * snap-mandatory. Cada slide es una escena editorial sin chrome — pura
 * tipografía + visual flotante respirando contra el fondo.
 */
function BenefitsScenes() {
  const scrollerRef = useRef<HTMLDivElement>(null);

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
    const slide = el.querySelector<HTMLElement>("[data-benefit-scene]");
    const step = slide ? slide.offsetWidth + 24 : el.clientWidth * 0.6;
    el.scrollBy({
      left: direction === "next" ? step : -step,
      behavior: "smooth",
    });
  }, []);

  return (
    <div className="relative mt-8 sm:mt-12">
      {/* Arrows desktop — flotando arriba a la derecha del scroller */}
      <div className="pointer-events-none absolute right-5 -top-1 z-10 hidden items-center gap-2 sm:right-8 sm:flex lg:right-10">
        <CarouselArrowButton
          direction="prev"
          onClick={() => scrollByCard("prev")}
        />
        <CarouselArrowButton
          direction="next"
          onClick={() => scrollByCard("next")}
        />
      </div>

      <div
        ref={scrollerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={onClickCapture}
        className={cn(
          "hide-scrollbar flex w-full snap-x snap-mandatory gap-5 overflow-x-auto",
          "scroll-px-5 px-5 pb-2 pt-10 sm:gap-7 sm:scroll-px-10 sm:px-10 sm:pt-12",
          "lg:scroll-px-16 lg:px-16",
          isDragging ? "cursor-grabbing select-none" : "sm:cursor-grab",
        )}
      >
        {BENEFITS.map((b, i) => (
          <BenefitScene
            key={b.title}
            index={i}
            eyebrow={b.eyebrow}
            title={b.title}
            description={b.description}
            visual={b.visual}
            videoSrc={b.videoSrc}
          />
        ))}
        {/* Trailing breather: evita que la última escena se pegue al borde */}
        <div aria-hidden className="w-2 shrink-0 sm:w-4" />
      </div>
    </div>
  );
}

function CarouselArrowButton({
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
        "pointer-events-auto inline-flex size-8 items-center justify-center rounded-full border border-[#0A0A0A]/10",
        "bg-white/70 text-[#0A0A0A] transition-all duration-300 ease-out",
        "hover:-translate-y-px hover:border-[#0A0A0A]/30 hover:bg-white hover:shadow-[0_8px_20px_-12px_rgba(17,17,17,0.18)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9810FA] focus-visible:ring-offset-2",
      )}
    >
      <Icon className="size-3" strokeWidth={1.6} />
    </button>
  );
}

// ─── Scene ─────────────────────────────────────────────────────────────────

interface BenefitSceneProps {
  index: number;
  eyebrow: string;
  title: string;
  description: string;
  visual: ReactNode;
  videoSrc?: string;
}

/**
 * Escena editorial — sin card chrome. Tres "rows" verticales: número grande
 * tipo Apple (01..), eyebrow corto con regla, visual flotante en un stage
 * transparente, y abajo título + descripción. La escena respira contra el
 * fondo de la sección.
 */
function BenefitScene({
  index,
  eyebrow,
  title,
  description,
  visual,
  videoSrc,
}: BenefitSceneProps) {
  const sceneNumber = String(index + 1).padStart(2, "0");
  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1],
        delay: index * 0.06,
      }}
      data-benefit-scene
      className={cn(
        "relative snap-start shrink-0",
        // Mobile: 72vw → una escena visible + peek más sutil de la siguiente.
        // Desktop: ancho fijo editorial compacto.
        "w-[72vw] max-w-95 sm:w-86 sm:max-w-none lg:w-100",
      )}
    >
      {/* Numbered eyebrow */}
      <div className="flex items-center gap-2.5">
        <span className="font-serif text-[26px] font-light leading-none text-[#0A0A0A]/25 tabular-nums sm:text-[32px]">
          {sceneNumber}
        </span>
        <span className="h-px flex-1 bg-[#0A0A0A]/10" />
        <span className="text-[9px] font-semibold uppercase tracking-[0.32em] text-[#9810FA]">
          {eyebrow}
        </span>
      </div>

      {/* Visual stage — sin chrome, transparente. Cuando hay videoSrc, el
          video llena el stage; sino, el glyph CSS flota dentro. */}
      <MediaStage
        videoSrc={videoSrc}
        className="mt-4 h-36 sm:mt-5 sm:h-44 lg:h-48"
      >
        {visual}
      </MediaStage>

      {/* Title + description — typografía editorial limpia */}
      <div className="mt-5 sm:mt-6">
        <h3 className="font-serif text-[18px] leading-[1.18] tracking-tight text-balance text-[#0A0A0A] sm:text-[22px]">
          {title}
        </h3>
        <p className="mt-2 max-w-md text-[12px] leading-relaxed text-[#0A0A0A]/60 sm:text-[12.5px]">
          {description}
        </p>
      </div>
    </motion.article>
  );
}

/**
 * Stage transparente para el visual. Sin border, ring o shadow — el visual
 * vive directamente contra el fondo de la sección. Cuando llega `videoSrc`,
 * el `<video>` se monta absolute fill con `rounded-2xl` (única concesión
 * para que el video no se vea recortado por overflow del bg).
 */
function MediaStage({
  videoSrc,
  children,
  className,
}: {
  videoSrc?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative w-full overflow-visible", className)}>
      {videoSrc ? (
        <video
          src={videoSrc}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className="absolute inset-0 size-full rounded-2xl object-cover"
        />
      ) : (
        children
      )}
    </div>
  );
}

// ─── Visuals ──────────────────────────────────────────────────────────────
//
// Visuales flotantes — sin contenedor de fondo. Pensados para vivir contra
// el bg gris→blanco de la sección. Pocos elementos, una animación ambient
// por escena, GPU-friendly. Cada uno se centra dentro del stage.

function DiscountStackVisual() {
  const reduce = useReducedMotion();
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {/* Glow ultra-sutil tras el disco protagónico */}
      <div
        aria-hidden
        className="absolute size-[55%] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(152,16,250,0.12) 0%, transparent 65%)",
        }}
      />
      {/* Ring rotando lentísimo */}
      <motion.div
        aria-hidden
        animate={reduce ? undefined : { rotate: 360 }}
        transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
        className="absolute size-[86%] rounded-full border border-dashed border-[#0A0A0A]/8"
      />

      {/* Disco trasero — oferta actual */}
      <div
        className={cn(
          "absolute left-[20%] top-[22%] flex size-14 flex-col items-center justify-center rounded-full sm:size-16",
          "bg-white ring-1 ring-[#0A0A0A]/8",
          "shadow-[0_8px_20px_-10px_rgba(17,17,17,0.15)]",
        )}
      >
        <span className="text-[7.5px] font-semibold uppercase tracking-[0.24em] text-[#0A0A0A]/55">
          Oferta
        </span>
        <span className="mt-0.5 font-serif text-base font-medium text-[#0A0A0A]/85">
          −15%
        </span>
      </div>

      {/* Disco protagónico — Club */}
      <div
        className={cn(
          "absolute right-[16%] bottom-[18%] flex size-18 flex-col items-center justify-center rounded-full sm:size-20",
          "bg-linear-to-br from-[#9810FA] via-[#7C0CD8] to-[#5B0AAD]",
          "ring-1 ring-white/20 ring-inset",
          "shadow-[0_16px_30px_-14px_rgba(152,16,250,0.42),inset_0_1px_0_rgba(255,255,255,0.16)]",
        )}
      >
        <span className="inline-flex items-center gap-0.5 text-[7.5px] font-semibold uppercase tracking-[0.2em] text-white/80">
          <Sparkles className="size-2" /> Club
        </span>
        <span className="mt-0.5 font-serif text-xl font-medium text-white">
          +10%
        </span>
      </div>
    </div>
  );
}

function TicketHalfVisual() {
  const reduce = useReducedMotion();
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {/* Glow morado suavísimo bajo el ticket */}
      <div
        aria-hidden
        className="absolute size-[72%] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(152,16,250,0.10) 0%, transparent 65%)",
        }}
      />

      <div className="relative w-[78%] max-w-65 -rotate-2">
        <div
          className={cn(
            "relative overflow-hidden rounded-xl",
            "bg-white",
            "ring-1 ring-[#0A0A0A]/6",
            "shadow-[0_16px_36px_-18px_rgba(152,16,250,0.32),0_1px_0_rgba(17,17,17,0.04)]",
          )}
        >
          <div className="grid grid-cols-[1fr_auto] items-stretch">
            <div className="p-3.5">
              <p className="text-[7px] font-semibold uppercase tracking-[0.28em] text-[#9810FA]">
                Purpura · Ticket
              </p>
              <p className="mt-1.5 text-[8.5px] uppercase tracking-[0.2em] text-[#0A0A0A]/45">
                Precio miembro
              </p>
              <div className="mt-0.5 flex items-baseline gap-1.5">
                <span className="font-serif text-lg font-medium text-[#0A0A0A] tabular-nums">
                  S/ 5
                </span>
                <span className="text-[9.5px] text-[#0A0A0A]/35 line-through tabular-nums">
                  S/ 10
                </span>
              </div>
            </div>

            <div
              aria-hidden
              className="relative flex w-10 flex-col items-center justify-center border-l border-dashed border-[#0A0A0A]/15 bg-[#0A0A0A] px-1.5 text-white"
            >
              <span className="font-serif text-sm font-medium leading-none">
                −50%
              </span>
              <span className="mt-0.5 text-[6.5px] uppercase tracking-[0.24em] text-white/55">
                Club
              </span>
            </div>
          </div>

          {!reduce ? (
            <motion.div
              aria-hidden
              initial={{ x: "-130%" }}
              animate={{ x: "130%" }}
              transition={{
                duration: 2.6,
                repeat: Infinity,
                ease: [0.22, 1, 0.36, 1],
                repeatDelay: 3.4,
              }}
              className="absolute inset-y-0 -left-1/4 w-2/5 -skew-x-12 bg-linear-to-r from-transparent via-[#9810FA]/22 to-transparent mix-blend-overlay"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ProgressTicketVisual() {
  const reduce = useReducedMotion();
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-8">
      <div className="flex w-full max-w-55 items-center justify-between text-[8px] font-semibold uppercase tracking-[0.24em] text-[#0A0A0A]/45">
        <span>S/ 0</span>
        <span>S/ 25</span>
      </div>

      <div className="relative mt-2 h-1 w-full max-w-55 overflow-hidden rounded-full bg-[#0A0A0A]/8 ring-1 ring-[#0A0A0A]/5 ring-inset">
        <motion.div
          initial={{ width: "0%" }}
          whileInView={{ width: "100%" }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
          className="absolute inset-y-0 left-0 rounded-full bg-linear-to-r from-[#9810FA] to-[#C026D3]"
        />
        {!reduce ? (
          <motion.div
            aria-hidden
            initial={{ left: "0%", opacity: 0 }}
            whileInView={{ left: "100%", opacity: [0, 1, 0] }}
            viewport={{ once: true }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
            className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#9810FA] blur-xs"
          />
        ) : null}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.95 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{
          duration: 0.55,
          ease: [0.22, 1, 0.36, 1],
          delay: 1.15,
        }}
        className={cn(
          "mt-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5",
          "bg-linear-to-br from-[#9810FA] via-[#7C0CD8] to-[#5B0AAD]",
          "ring-1 ring-white/20 ring-inset",
          "shadow-[0_10px_22px_-12px_rgba(152,16,250,0.42),inset_0_1px_0_rgba(255,255,255,0.16)]",
        )}
      >
        <TicketGlyph className="size-3 text-white" />
        <span className="font-serif text-[12px] font-medium tabular-nums text-white">
          +1 ticket
        </span>
      </motion.div>
    </div>
  );
}

function ReferralNetworkVisual() {
  const reduce = useReducedMotion();
  const satellites = [
    { x: 20, y: 24, delay: 0 },
    { x: 80, y: 28, delay: 0.15 },
    { x: 16, y: 76, delay: 0.3 },
    { x: 84, y: 72, delay: 0.45 },
  ];

  return (
    <div className="absolute inset-0">
      <svg
        aria-hidden
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 size-full"
      >
        {satellites.map((s, i) => (
          <motion.line
            key={i}
            x1="50"
            y1="50"
            x2={s.x}
            y2={s.y}
            stroke="rgba(152,16,250,0.55)"
            strokeWidth="0.3"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            whileInView={{ pathLength: 1, opacity: 1 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{
              duration: 0.95,
              ease: [0.22, 1, 0.36, 1],
              delay: 0.3 + s.delay,
            }}
          />
        ))}
      </svg>

      {/* Nodo central */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div
          className={cn(
            "relative flex size-12 items-center justify-center rounded-full sm:size-13",
            "bg-linear-to-br from-[#9810FA] via-[#7C0CD8] to-[#5B0AAD]",
            "ring-1 ring-white/20 ring-inset",
            "shadow-[0_14px_28px_-14px_rgba(152,16,250,0.42),inset_0_1px_0_rgba(255,255,255,0.16)]",
          )}
        >
          {!reduce ? (
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-full bg-[#9810FA]/35"
              animate={{ scale: [1, 1.5, 1.5], opacity: [0.4, 0, 0] }}
              transition={{
                duration: 2.8,
                repeat: Infinity,
                ease: "easeOut",
              }}
            />
          ) : null}
          <Sparkles className="relative size-4 text-white" strokeWidth={1.4} />
        </div>
      </div>

      {/* Satélites */}
      {satellites.map((s, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.5 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{
            duration: 0.5,
            ease: [0.22, 1, 0.36, 1],
            delay: 0.55 + s.delay,
          }}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${s.x}%`, top: `${s.y}%` }}
        >
          <div className="flex size-7 items-center justify-center rounded-full bg-white ring-1 ring-[#0A0A0A]/8 shadow-[0_6px_14px_-8px_rgba(17,17,17,0.14)] sm:size-8">
            <TicketGlyph className="size-3 text-[#0A0A0A]/70 sm:size-3.5" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function TicketGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M3 9.5V8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1.5a2.5 2.5 0 0 0 0 5V16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1.5a2.5 2.5 0 0 0 0-5Z" />
      <path d="M9 6v12" strokeDasharray="2 2" />
    </svg>
  );
}

// ─── Finale CTA ────────────────────────────────────────────────────────────

/**
 * Cierre sin chrome. Centrado, tipografía editorial, dos CTAs flotando
 * directamente contra el bg de la sección. Sin caja, sin card, sin ring.
 */
function ClubFinale() {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.1 } },
      }}
      className="relative mx-auto max-w-2xl text-center"
    >
      <motion.h3
        variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="font-serif text-[20px] leading-[1.14] tracking-tight text-balance text-[#0A0A0A] sm:text-[26px]"
      >
        ¿Qué esperas para unirte al Club?
      </motion.h3>
      <motion.p
        variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto mt-2.5 max-w-md text-[12px] leading-relaxed text-[#0A0A0A]/60 sm:text-[12.5px]"
      >
        Desbloquea descuentos exclusivos, tickets adicionales y beneficios
        únicos en cada compra.
      </motion.p>
      <motion.div
        variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="mt-5 flex flex-wrap items-center justify-center gap-2"
      >
        <Link
          href="/register"
          className={cn(
            "group inline-flex h-10 items-center gap-1.5 rounded-full px-4.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white",
            "bg-linear-to-br from-[#9810FA] via-[#7C0CD8] to-[#5B0AAD]",
            "ring-1 ring-white/20 ring-inset",
            "shadow-[0_10px_22px_-12px_rgba(152,16,250,0.45),inset_0_1px_0_rgba(255,255,255,0.16)]",
            "transition-all duration-300 hover:-translate-y-px hover:shadow-[0_14px_30px_-14px_rgba(152,16,250,0.6),inset_0_1px_0_rgba(255,255,255,0.20)]",
          )}
        >
          Únete ahora
          <ArrowRight
            className="size-3 transition-transform duration-300 group-hover:translate-x-0.5"
            strokeWidth={1.8}
          />
        </Link>
        <Link
          href="/sorteos"
          className={cn(
            "inline-flex h-10 items-center gap-1.5 rounded-full border border-[#0A0A0A]/15 bg-transparent px-4.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#0A0A0A]",
            "transition-all duration-300 hover:-translate-y-px hover:border-[#0A0A0A]/45 hover:bg-[#FAFAFA]",
          )}
        >
          Explorar sorteos
        </Link>
      </motion.div>
    </motion.div>
  );
}

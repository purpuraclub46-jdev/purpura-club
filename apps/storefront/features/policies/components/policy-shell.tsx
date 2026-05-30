"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, ChevronDown } from "lucide-react";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Container } from "@/shared/ui/container";
import { cn } from "@/shared/lib/cn";

/**
 * PolicyShell — sistema visual compartido para todas las páginas /politicas/*.
 *
 * Define UNA experiencia editorial luxury reutilizable; cada página solo
 * pasa contenido y datos. Cualquier ajuste visual hecho aquí se propaga
 * automáticamente a `devolucion`, `envio`, `privacidad`, `tips-joyas`,
 * `lavado-de-activos`, etc.
 *
 * Dos árboles DOM paralelos (no es responsive layout):
 *
 *   Desktop:
 *     · Hero amplio + nav sticky con scroll-spy + secciones abiertas con
 *       números editoriales gigantes (Dior style).
 *
 *   Mobile (≤ sm):
 *     · Hero compacto.
 *     · Highlights como chips horizontales scrollables (Apple Support).
 *     · Sin nav sticky — el accordion reemplaza la navegación.
 *     · Secciones cerradas por defecto en accordion editorial con
 *       transición suave de height + opacity. Multi-open permitido.
 *
 * Orden de render dentro de cada sección:
 *   intro → tariffs → bullets → exclusions → importantNote
 *
 * Todos los bloques son opcionales — incluí solo los que tu política use.
 *
 * Variantes de marker:
 *   · 'dash'  → hairline brand (default, editorial luxury Dior/Aesop)
 *   · 'check' → check brand en círculo (guías de cuidado tipo Apple Care)
 */

const EASE = [0.22, 1, 0.36, 1] as const;

export type BulletMarker = "dash" | "check";

export interface PolicySectionDef {
  id: string;
  number: string;
  shortTitle: string;
  title: string;
  intro?: string;
  /** Bloque de tarifas/precios premium (envíos, costos). */
  tariffs?: {
    title?: string;
    items: Array<{ price: string; label: string }>;
  };
  /** Eyebrow opcional sobre la lista de bullets (ej "Consideraciones"). */
  bulletsTitle?: string;
  /** Bullets con soporte para sub-listas. */
  bullets?: Array<string | { label: string; sub: string[] }>;
  /** Bloque "no cubre" con marcador tenue (caso garantía). */
  exclusions?: { title: string; items: string[] };
  /** Bloque editorial "Importante" — acento brand, no agresivo. */
  importantNote?: { title: string; body: string };
}

export interface PolicyPageProps {
  hero: {
    eyebrow: string;
    title: string;
    subtitleShort: string;
    subtitleLong: string;
  };
  highlights: string[];
  highlightsShort: string[];
  sections: PolicySectionDef[];
  /** Marker para los bullets principales. 'dash' = editorial luxury,
   *  'check' = guía de cuidado tipo Apple Care. Default: 'dash'. */
  marker?: BulletMarker;
}

export function PolicyPage({
  hero,
  highlights,
  highlightsShort,
  sections,
  marker = "dash",
}: PolicyPageProps) {
  return (
    <div className="bg-white">
      <Hero hero={hero} />
      <HighlightsStripDesktop highlights={highlights} />
      <HighlightsChipsMobile highlightsShort={highlightsShort} />
      <NavIndex sections={sections} />
      <PolicySectionsDesktop sections={sections} marker={marker} />
      <PolicyAccordionMobile sections={sections} marker={marker} />
      <EditorialClose />
    </div>
  );
}

// ─── Hero ──────────────────────────────────────────────────────────────────
//
// Sin "Última actualización" — se eliminó como cambio global. Los clientes
// no valoran el dato y le da olor corporativo/legal a la página.

function Hero({ hero }: { hero: PolicyPageProps["hero"] }) {
  return (
    <section className="relative isolate overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(45% 60% at 10% 0%, rgba(152,16,250,0.06) 0%, transparent 65%), radial-gradient(35% 50% at 92% 100%, rgba(192,38,211,0.05) 0%, transparent 65%)",
        }}
      />

      <Container className="relative pt-6 pb-10 sm:pt-12 sm:pb-28">
        <Link
          href="/"
          className="group/back inline-flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-[0.22em] text-[#0A0A0A]/55 transition-colors duration-200 hover:text-[#0A0A0A] sm:text-[11px]"
        >
          <ArrowLeft
            className="size-3 transition-transform duration-200 group-hover/back:-translate-x-0.5"
            strokeWidth={1.4}
          />
          Volver al inicio
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="mt-7 max-w-3xl sm:mt-16"
        >
          <p className="text-[9.5px] font-semibold uppercase tracking-[0.32em] text-[#9810FA] sm:text-[10px] sm:tracking-[0.36em]">
            {hero.eyebrow}
          </p>
          <h1 className="mt-3.5 font-serif text-[28px] leading-[1.05] tracking-tight text-balance text-[#0A0A0A] sm:mt-5 sm:text-[56px] sm:leading-[1.02] lg:text-[64px]">
            {hero.title}
          </h1>
          <p className="mt-4 max-w-xs text-[13px] leading-[1.6] text-[#0A0A0A]/65 sm:hidden">
            {hero.subtitleShort}
          </p>
          <p className="mt-6 hidden max-w-xl text-base leading-[1.7] text-[#0A0A0A]/65 sm:block">
            {hero.subtitleLong}
          </p>
        </motion.div>
      </Container>
    </section>
  );
}

// ─── Highlights — Mobile (chips) ─────────────────────────────────────────

function HighlightsChipsMobile({
  highlightsShort,
}: {
  highlightsShort: string[];
}) {
  return (
    <section className="border-y border-[#11111110] bg-white sm:hidden">
      <Container className="py-4">
        <ul className="hide-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
          {highlightsShort.map((label) => (
            <li key={label} className="shrink-0">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#11111114] bg-white py-1.5 pr-3.5 pl-2.5">
                <span
                  aria-hidden
                  className="inline-flex size-3 items-center justify-center rounded-full bg-[#9810FA]/12 text-[#9810FA]"
                >
                  <Check className="size-2" strokeWidth={3} />
                </span>
                <span className="text-[11.5px] font-medium tracking-tight text-[#0A0A0A]/80">
                  {label}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

// ─── Highlights — Desktop (strip editorial) ──────────────────────────────

function HighlightsStripDesktop({ highlights }: { highlights: string[] }) {
  return (
    <section className="hidden border-y border-[#11111110] bg-[#FAFAFA]/60 sm:block">
      <Container className="py-8">
        <ul
          className={cn(
            "grid grid-cols-2",
            highlights.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4",
          )}
        >
          {highlights.map((label, i) => (
            <li
              key={label}
              className={cn(
                "px-6 first:pl-6 last:pr-6",
                i > 0 && "border-l border-[#11111110]",
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  className="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-[#9810FA]/10 text-[#9810FA]"
                  aria-hidden
                >
                  <Check className="size-2.5" strokeWidth={2.5} />
                </span>
                <span className="text-[12.5px] font-medium leading-[1.4] text-[#0A0A0A]/80">
                  {label}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

// ─── Nav interna sticky (solo desktop) ────────────────────────────────────
//
// Soporta hasta ~12 secciones: centramos el ul si cabe (`w-fit mx-auto`),
// y permitimos scroll horizontal cuando sobrepasa el ancho del container.
// Gap adaptativo: secciones largas usan gap-7, cortas gap-10.

function NavIndex({ sections }: { sections: PolicySectionDef[] }) {
  const activeId = useScrollSpy(sections.map((s) => s.id));
  const dense = sections.length > 6;

  return (
    <nav
      aria-label="Secciones de la política"
      className="sticky top-0 z-30 hidden border-b border-[#11111108] bg-white/85 backdrop-blur-xl sm:block"
    >
      <Container>
        <div className="hide-scrollbar mx-auto max-w-full overflow-x-auto">
          <ul
            className={cn(
              "mx-auto flex w-fit whitespace-nowrap",
              dense ? "gap-7" : "gap-10",
            )}
          >
            {sections.map((s) => {
              const active = activeId === s.id;
              return (
                <li key={s.id} className="shrink-0">
                  <a
                    href={`#${s.id}`}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "relative inline-flex items-center gap-2 py-4 text-[10.5px] font-semibold uppercase tracking-[0.24em]",
                      "transition-colors duration-300 ease-out",
                      active
                        ? "text-[#0A0A0A]"
                        : "text-[#0A0A0A]/40 hover:text-[#0A0A0A]/75",
                    )}
                  >
                    <span className="font-serif text-[12px] font-light tabular-nums text-[#9810FA]/80">
                      {s.number}
                    </span>
                    <span>{s.shortTitle}</span>
                    <span
                      aria-hidden
                      className={cn(
                        "absolute inset-x-0 bottom-0 h-px origin-center bg-[#9810FA]",
                        "transition-transform duration-400 ease-out",
                        active ? "scale-x-100" : "scale-x-0",
                      )}
                    />
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </Container>
    </nav>
  );
}

/**
 * Hook de scroll-spy basado en `IntersectionObserver`. Activa el item cuyo
 * top entra al rango [30% top viewport, 50% bottom viewport]. Eso emula la
 * sensación natural de "la sección donde está el ojo" sin saltos bruscos.
 */
function useScrollSpy(ids: string[]) {
  const [active, setActive] = useState<string>(ids[0] ?? "");
  const intersecting = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.id;
          if (entry.isIntersecting) {
            intersecting.current.add(id);
          } else {
            intersecting.current.delete(id);
          }
        }
        const next = ids.find((id) => intersecting.current.has(id));
        if (next) setActive(next);
      },
      { rootMargin: "-30% 0px -50% 0px", threshold: 0 },
    );

    const observed: HTMLElement[] = [];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) {
        observer.observe(el);
        observed.push(el);
      }
    }

    return () => {
      for (const el of observed) observer.unobserve(el);
      observer.disconnect();
      intersecting.current.clear();
    };
  }, [ids]);

  return active;
}

// ─── Sections — Desktop ──────────────────────────────────────────────────

function PolicySectionsDesktop({
  sections,
  marker,
}: {
  sections: PolicySectionDef[];
  marker: BulletMarker;
}) {
  return (
    <div className="hidden sm:block">
      <Container className="max-w-3xl">
        <div className="space-y-32 pt-28">
          {sections.map((s) => (
            <PolicySection key={s.id} section={s} marker={marker} />
          ))}
        </div>
      </Container>
    </div>
  );
}

function PolicySection({
  section,
  marker,
}: {
  section: PolicySectionDef;
  marker: BulletMarker;
}) {
  return (
    <motion.section
      id={section.id}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-120px" }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.08 } },
      }}
      className="scroll-mt-24"
    >
      <motion.p
        variants={{
          hidden: { opacity: 0, y: 10 },
          visible: { opacity: 1, y: 0 },
        }}
        transition={{ duration: 0.6, ease: EASE }}
        className="font-serif text-[80px] font-light leading-none text-[#9810FA]/35 tabular-nums"
      >
        {section.number}
      </motion.p>

      <motion.h2
        variants={{
          hidden: { opacity: 0, y: 10 },
          visible: { opacity: 1, y: 0 },
        }}
        transition={{ duration: 0.6, ease: EASE }}
        className="mt-6 font-serif text-[36px] leading-[1.12] tracking-tight text-balance text-[#0A0A0A]"
      >
        {section.title}
      </motion.h2>

      {section.intro ? (
        <motion.p
          variants={{
            hidden: { opacity: 0, y: 10 },
            visible: { opacity: 1, y: 0 },
          }}
          transition={{ duration: 0.6, ease: EASE }}
          className="mt-6 text-[15.5px] leading-[1.75] text-[#0A0A0A]/70"
        >
          {section.intro}
        </motion.p>
      ) : null}

      {section.tariffs ? (
        <TariffsGridDesktop tariffs={section.tariffs} />
      ) : null}

      {section.bullets && section.bullets.length > 0 ? (
        <motion.div
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.05 } },
          }}
          className="mt-10"
        >
          {section.bulletsTitle ? (
            <p className="mb-6 text-[10px] font-semibold uppercase tracking-[0.32em] text-[#0A0A0A]/45">
              {section.bulletsTitle}
            </p>
          ) : null}
          <ul
            className={cn(marker === "check" ? "space-y-5" : "space-y-7")}
          >
            {section.bullets.map((bullet, i) => (
              <PolicyBullet key={i} bullet={bullet} marker={marker} />
            ))}
          </ul>
        </motion.div>
      ) : null}

      {section.exclusions ? (
        <ExclusionsBlock exclusions={section.exclusions} />
      ) : null}

      {section.importantNote ? (
        <ImportantNoteDesktop note={section.importantNote} />
      ) : null}
    </motion.section>
  );
}

function TariffsGridDesktop({
  tariffs,
}: {
  tariffs: NonNullable<PolicySectionDef["tariffs"]>;
}) {
  const cols = tariffs.items.length;
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 12 },
        visible: { opacity: 1, y: 0 },
      }}
      transition={{ duration: 0.6, ease: EASE }}
      className="mt-10"
    >
      {tariffs.title ? (
        <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.32em] text-[#0A0A0A]/45">
          {tariffs.title}
        </p>
      ) : null}
      <div className="border border-[#11111110]">
        <ul
          className={cn(
            "grid",
            cols === 1
              ? "grid-cols-1"
              : cols === 2
                ? "grid-cols-2"
                : cols === 3
                  ? "grid-cols-3"
                  : "grid-cols-4",
          )}
        >
          {tariffs.items.map((it, i) => (
            <li
              key={it.label}
              className={cn(
                "px-6 py-7",
                i > 0 && "border-l border-[#11111110]",
              )}
            >
              <p className="font-serif text-[34px] leading-none tracking-tight text-[#0A0A0A] tabular-nums">
                {it.price}
              </p>
              <p className="mt-3 text-[10.5px] font-semibold uppercase tracking-[0.26em] text-[#0A0A0A]/55">
                {it.label}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}

function ImportantNoteDesktop({
  note,
}: {
  note: NonNullable<PolicySectionDef["importantNote"]>;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: EASE }}
      className="mt-12 border-l-2 border-[#9810FA]/45 bg-[#9810FA]/2.5 py-6 pl-8 pr-7"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#9810FA]/85">
        {note.title}
      </p>
      <p className="mt-3 text-[14.5px] leading-[1.75] text-[#0A0A0A]/75">
        {note.body}
      </p>
    </motion.div>
  );
}

function PolicyBullet({
  bullet,
  marker,
}: {
  bullet: string | { label: string; sub: string[] };
  marker: BulletMarker;
}) {
  if (typeof bullet === "string") {
    return (
      <motion.li
        variants={{
          hidden: { opacity: 0, y: 8 },
          visible: { opacity: 1, y: 0 },
        }}
        transition={{ duration: 0.5, ease: EASE }}
        className={cn(
          "flex text-[15.5px] leading-[1.75] text-[#0A0A0A]/75",
          marker === "check" ? "gap-4" : "gap-5",
        )}
      >
        <DesktopMarker variant={marker} />
        <span>{bullet}</span>
      </motion.li>
    );
  }

  return (
    <motion.li
      variants={{
        hidden: { opacity: 0, y: 8 },
        visible: { opacity: 1, y: 0 },
      }}
      transition={{ duration: 0.5, ease: EASE }}
      className="space-y-4"
    >
      <div
        className={cn(
          "flex text-[15.5px] leading-[1.75] text-[#0A0A0A]/75",
          marker === "check" ? "gap-4" : "gap-5",
        )}
      >
        <DesktopMarker variant={marker} />
        <span>{bullet.label}</span>
      </div>
      <ul className="ml-10 space-y-3 border-l border-[#9810FA]/15 pl-6">
        {bullet.sub.map((line, i) => (
          <li
            key={i}
            className="text-[14.5px] leading-[1.7] text-[#0A0A0A]/65"
          >
            {line}
          </li>
        ))}
      </ul>
    </motion.li>
  );
}

function DesktopMarker({ variant }: { variant: BulletMarker }) {
  if (variant === "check") {
    return (
      <span
        aria-hidden
        className="mt-1 inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-[#9810FA]/10 text-[#9810FA]"
      >
        <Check className="size-2.5" strokeWidth={2.5} />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className="mt-3.5 inline-block h-px w-3.5 shrink-0 bg-[#9810FA]/55"
    />
  );
}

function ExclusionsBlock({
  exclusions,
}: {
  exclusions: { title: string; items: string[] };
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: EASE }}
      className="mt-12 border-t border-[#11111108] pt-10"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#0A0A0A]/45">
        {exclusions.title}
      </p>
      <ul className="mt-6 space-y-5">
        {exclusions.items.map((item, i) => (
          <li
            key={i}
            className="flex gap-5 text-[14.5px] leading-[1.7] text-[#0A0A0A]/60"
          >
            <span
              aria-hidden
              className="mt-3.25 inline-block h-px w-3.5 shrink-0 bg-[#0A0A0A]/30"
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

// ─── Sections — Mobile (accordion editorial) ─────────────────────────────

function PolicyAccordionMobile({
  sections,
  marker,
}: {
  sections: PolicySectionDef[];
  marker: BulletMarker;
}) {
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="sm:hidden">
      <Container>
        <ul className="mt-8 divide-y divide-[#11111110] border-y border-[#11111110]">
          {sections.map((s) => (
            <li key={s.id}>
              <AccordionItem
                section={s}
                marker={marker}
                isOpen={openIds.has(s.id)}
                onToggle={() => toggle(s.id)}
              />
            </li>
          ))}
        </ul>
      </Container>
    </div>
  );
}

function AccordionItem({
  section,
  marker,
  isOpen,
  onToggle,
}: {
  section: PolicySectionDef;
  marker: BulletMarker;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={`acc-${section.id}`}
        className={cn(
          "group/acc flex w-full items-center justify-between gap-4 py-5 text-left",
          "transition-colors duration-200",
        )}
      >
        <div className="flex items-baseline gap-3">
          <span className="font-serif text-[13px] font-light tabular-nums text-[#9810FA]/75">
            {section.number}
          </span>
          <span
            className={cn(
              "font-serif text-[17px] leading-[1.2] tracking-tight transition-colors duration-200",
              isOpen ? "text-[#0A0A0A]" : "text-[#0A0A0A]/85",
            )}
          >
            {section.title}
          </span>
        </div>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 transition-all duration-300 ease-out",
            isOpen
              ? "rotate-180 text-[#9810FA]"
              : "text-[#0A0A0A]/40 group-hover/acc:text-[#0A0A0A]/65",
          )}
          strokeWidth={1.6}
        />
      </button>

      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            id={`acc-${section.id}`}
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: 0.4, ease: EASE },
              opacity: { duration: 0.3, ease: EASE },
            }}
            className="overflow-hidden"
          >
            <div className="pb-7 pl-7">
              {section.intro ? (
                <p className="text-[13.5px] leading-[1.7] text-[#0A0A0A]/70">
                  {section.intro}
                </p>
              ) : null}

              {section.tariffs ? (
                <TariffsMobile
                  tariffs={section.tariffs}
                  hasIntroAbove={Boolean(section.intro)}
                />
              ) : null}

              {section.bullets && section.bullets.length > 0 ? (
                <div
                  className={cn(
                    section.intro || section.tariffs ? "mt-6" : "",
                  )}
                >
                  {section.bulletsTitle ? (
                    <p className="mb-3.5 text-[9.5px] font-semibold uppercase tracking-[0.28em] text-[#0A0A0A]/45">
                      {section.bulletsTitle}
                    </p>
                  ) : null}
                  <ul
                    className={cn(
                      marker === "check" ? "space-y-3.5" : "space-y-4",
                    )}
                  >
                    {section.bullets.map((bullet, i) => (
                      <AccordionBullet
                        key={i}
                        bullet={bullet}
                        marker={marker}
                      />
                    ))}
                  </ul>
                </div>
              ) : null}

              {section.exclusions ? (
                <div className="mt-6 border-t border-[#11111110] pt-5">
                  <p className="text-[9.5px] font-semibold uppercase tracking-[0.28em] text-[#0A0A0A]/45">
                    {section.exclusions.title}
                  </p>
                  <ul className="mt-4 space-y-3.5">
                    {section.exclusions.items.map((item, i) => (
                      <li
                        key={i}
                        className="flex gap-3.5 text-[12.5px] leading-[1.65] text-[#0A0A0A]/60"
                      >
                        <span
                          aria-hidden
                          className="mt-2.5 inline-block h-px w-2.5 shrink-0 bg-[#0A0A0A]/30"
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {section.importantNote ? (
                <div className="mt-6 border-l-2 border-[#9810FA]/45 bg-[#9810FA]/2.5 py-4 pl-4 pr-3">
                  <p className="text-[9.5px] font-semibold uppercase tracking-[0.28em] text-[#9810FA]/85">
                    {section.importantNote.title}
                  </p>
                  <p className="mt-2.5 text-[13px] leading-[1.7] text-[#0A0A0A]/75">
                    {section.importantNote.body}
                  </p>
                </div>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function TariffsMobile({
  tariffs,
  hasIntroAbove,
}: {
  tariffs: NonNullable<PolicySectionDef["tariffs"]>;
  hasIntroAbove: boolean;
}) {
  return (
    <div className={cn(hasIntroAbove ? "mt-5" : "")}>
      {tariffs.title ? (
        <p className="mb-3 text-[9.5px] font-semibold uppercase tracking-[0.28em] text-[#0A0A0A]/45">
          {tariffs.title}
        </p>
      ) : null}
      <ul
        className={cn(
          "grid gap-3",
          tariffs.items.length === 1 ? "grid-cols-1" : "grid-cols-2",
        )}
      >
        {tariffs.items.map((it) => (
          <li
            key={it.label}
            className="border-l border-[#9810FA]/30 pl-3.5"
          >
            <p className="font-serif text-[22px] leading-none tracking-tight text-[#0A0A0A] tabular-nums">
              {it.price}
            </p>
            <p className="mt-2 text-[9.5px] font-semibold uppercase tracking-[0.22em] text-[#0A0A0A]/55">
              {it.label}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AccordionBullet({
  bullet,
  marker,
}: {
  bullet: string | { label: string; sub: string[] };
  marker: BulletMarker;
}) {
  if (typeof bullet === "string") {
    return (
      <li
        className={cn(
          "flex text-[13.5px] leading-[1.7] text-[#0A0A0A]/75",
          marker === "check" ? "gap-3" : "gap-3.5",
        )}
      >
        <MobileMarker variant={marker} />
        <span>{bullet}</span>
      </li>
    );
  }

  return (
    <li className="space-y-3">
      <div
        className={cn(
          "flex text-[13.5px] leading-[1.7] text-[#0A0A0A]/75",
          marker === "check" ? "gap-3" : "gap-3.5",
        )}
      >
        <MobileMarker variant={marker} />
        <span>{bullet.label}</span>
      </div>
      <ul className="ml-6 space-y-2.5 border-l border-[#9810FA]/15 pl-4">
        {bullet.sub.map((line, i) => (
          <li
            key={i}
            className="text-[12.5px] leading-[1.6] text-[#0A0A0A]/65"
          >
            {line}
          </li>
        ))}
      </ul>
    </li>
  );
}

function MobileMarker({ variant }: { variant: BulletMarker }) {
  if (variant === "check") {
    return (
      <span
        aria-hidden
        className="mt-0.75 inline-flex size-3.5 shrink-0 items-center justify-center rounded-full bg-[#9810FA]/12 text-[#9810FA]"
      >
        <Check className="size-2" strokeWidth={2.5} />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className="mt-2.75 inline-block h-px w-2.5 shrink-0 bg-[#9810FA]/55"
    />
  );
}

// ─── Editorial close ──────────────────────────────────────────────────────
//
// Cierre unificado para TODAS las páginas /politicas/*. Sin CTAs, sin
// botones, sin promociones. Un gesto editorial limpio que cierra la
// experiencia con elegancia.

function EditorialClose() {
  return (
    <Container className="max-w-3xl py-14 sm:py-32">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.12 } },
        }}
        className="text-center"
      >
        <FadeUp>
          <p className="mx-auto max-w-xl text-[13.5px] leading-[1.7] text-[#0A0A0A]/65 sm:text-[15.5px] sm:leading-[1.8]">
            Gracias por confiar en Púrpura Club.
          </p>
        </FadeUp>

        <FadeUp>
          <div
            aria-hidden
            className="mx-auto mt-9 h-px w-16 bg-[#11111114] sm:mt-16 sm:w-24"
          />
        </FadeUp>

        <FadeUp>
          <p className="mt-7 text-[10px] font-medium uppercase tracking-[0.42em] text-[#0A0A0A]/30 sm:mt-12 sm:text-[11px] sm:tracking-[0.6em]">
            Púrpura Club
          </p>
        </FadeUp>
      </motion.div>
    </Container>
  );
}

function FadeUp({ children }: { children: ReactNode }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0 },
      }}
      transition={{ duration: 0.6, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

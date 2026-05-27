"use client";

import { ChevronDown } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { type ReactNode } from "react";
import { Container } from "@/shared/ui/container";
import { cn } from "@/shared/lib/cn";

/**
 * Footer luxury editorial premium.
 *
 * Layout (desktop):
 *   col 1-2 — brand mark + bajada corta + redes con logos oficiales
 *   col 3   — Categorías (solo Joyas / Perfumes — pidieron limpiar)
 *   col 4   — Club Púrpura
 *   col 5   — Ayuda (incluye Libro de Reclamaciones obligatorio Peru INDECOPI)
 *
 * Mobile:
 *   Las tres columnas se colapsan en acordeón nativo (`<details>`). Native
 *   keyboard accessibility + animación de chevron con peer-checked-like
 *   gracias al selector `[open]:` del details — sin estado de React.
 *
 * Tipografía y spacing: eyebrows tracking [0.22em], links opacity-low →
 * brand on hover. Sin pills pesadas, sin estilos marketplace.
 */
export function Footer() {
  return (
    <footer className="relative isolate overflow-hidden border-t border-[#11111110] bg-white">
      <div
        aria-hidden
        className="absolute inset-0 opacity-50"
        style={{
          background:
            "radial-gradient(40% 60% at 50% 0%, rgba(152,16,250,0.05) 0%, transparent 70%)",
        }}
      />

      <Container className="relative pb-10 pt-14 sm:pb-12 sm:pt-16">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:gap-12">
          {/* ─── Brand column ─────────────────────────────────────── */}
          <div className="space-y-5">
            <Link href="/" className="inline-flex items-center gap-2">
              <Image
                src="/images/isotipo.svg"
                alt="Purpura Club"
                width={32}
                height={32}
                className="size-8"
              />
              <Image
                src="/images/logotipo.svg"
                alt="Purpura Club"
                width={120}
                height={20}
                className="h-4 w-auto"
              />
            </Link>
            <p className="max-w-xs text-[12.5px] leading-relaxed text-[#0A0A0A]/55">
              Joyas, perfumes y experiencias premium. Acumula puntos, participa
              en sorteos y disfruta de beneficios exclusivos del Club Púrpura.
            </p>
            <SocialLinks />
          </div>

          {/* ─── Link columns ─────────────────────────────────────── */}
          {COLUMNS.map((col) => (
            <FooterColumn key={col.title} title={col.title} links={col.links} />
          ))}
        </div>

        {/* ─── Bottom row ──────────────────────────────────────────── */}
        <div className="mt-12 border-t border-[#11111110] pt-6 sm:mt-14">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-[11px] text-[#0A0A0A]/45">
              © {new Date().getFullYear()} Purpura Club. Todos los derechos
              reservados.
            </p>

            <PaymentBadges />

            <AgenciaCredit />
          </div>
        </div>
      </Container>
    </footer>
  );
}

// ─── Data ──────────────────────────────────────────────────────────────────

const COLUMNS: Array<{
  title: string;
  links: Array<{ label: string; href: string }>;
}> = [
  {
    title: "Categorías",
    links: [
      { label: "Joyas", href: "/shop?category=joyas" },
      { label: "Perfumes", href: "/shop?category=perfumes" },
    ],
  },
  {
    title: "Club Púrpura",
    links: [
      { label: "Beneficios", href: "/#beneficios" },
      { label: "Sorteos activos", href: "/sorteos" },
      { label: "Mi cuenta", href: "/mi-cuenta" },
      { label: "Registro", href: "/register" },
    ],
  },
  {
    title: "Ayuda",
    links: [
      { label: "Tiendas", href: "/#tiendas" },
      { label: "Políticas de devolución", href: "/politicas" },
      { label: "Términos y condiciones", href: "/terminos" },
      { label: "Libro de reclamaciones", href: "/libro-de-reclamaciones" },
    ],
  },
];

// ─── Column primitive ─────────────────────────────────────────────────────

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: Array<{ label: string; href: string }>;
}) {
  return (
    <>
      {/* Mobile: accordion editorial usando <details> nativo (sin state) */}
      <details className="group block border-b border-[#11111108] lg:hidden">
        <summary
          className={cn(
            "flex cursor-pointer items-center justify-between py-3.5",
            "text-[10px] font-semibold uppercase tracking-[0.26em] text-[#0A0A0A]/65",
            "list-none [&::-webkit-details-marker]:hidden",
          )}
        >
          {title}
          <ChevronDown
            className="size-4 text-[#0A0A0A]/40 transition-transform duration-300 group-open:rotate-180"
            strokeWidth={1.6}
          />
        </summary>
        <ul className="space-y-2 pb-4 pl-0">
          {links.map((link) => (
            <li key={link.label}>
              <FooterLink href={link.href}>{link.label}</FooterLink>
            </li>
          ))}
        </ul>
      </details>

      {/* Desktop: columna clásica */}
      <div className="hidden space-y-4 lg:block">
        <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#0A0A0A]/65">
          {title}
        </p>
        <ul className="space-y-2.5">
          {links.map((link) => (
            <li key={link.label}>
              <FooterLink href={link.href}>{link.label}</FooterLink>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

/** Link de columna — opacity baja por default, brand morado al hover con
 *  underline reveal sutil. Smooth color transition. */
function FooterLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "group/link inline-flex items-center text-[13px] text-[#0A0A0A]/65",
        "transition-colors duration-200 ease-out hover:text-[#9810FA]",
      )}
    >
      <span className="relative">
        {children}
        <span
          aria-hidden
          className={cn(
            "absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0",
            "bg-[#9810FA] transition-transform duration-300 ease-out group-hover/link:scale-x-100",
          )}
        />
      </span>
    </Link>
  );
}

// ─── Social icons (real brand SVGs, monochrome editorial) ─────────────────

interface SocialDef {
  label: string;
  href: string;
  icon: (props: { className?: string }) => ReactNode;
}

const SOCIALS: SocialDef[] = [
  {
    label: "Instagram",
    href: "https://instagram.com/purpura.club",
    icon: InstagramGlyph,
  },
  {
    label: "TikTok",
    href: "https://tiktok.com/@purpura.club",
    icon: TikTokGlyph,
  },
  {
    label: "Facebook",
    href: "https://facebook.com/purpura.club",
    icon: FacebookGlyph,
  },
];

function SocialLinks() {
  return (
    <ul className="flex items-center gap-2.5">
      {SOCIALS.map(({ label, href, icon: Icon }) => (
        <li key={label}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            className={cn(
              "group/social inline-flex size-9 items-center justify-center rounded-full",
              "border border-[#11111118] text-[#0A0A0A]/70 transition-all duration-300 ease-out",
              "hover:-translate-y-px hover:border-[#9810FA] hover:text-[#9810FA]",
              "hover:shadow-[0_8px_18px_-10px_rgba(152,16,250,0.45)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9810FA] focus-visible:ring-offset-2",
            )}
          >
            <Icon className="size-3.5" />
          </a>
        </li>
      ))}
    </ul>
  );
}

/** Instagram glyph — outline minimal (cuadrado + círculo + dot). */
function InstagramGlyph({ className }: { className?: string }) {
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
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** TikTok glyph — outline minimal stylized note. */
function TikTokGlyph({ className }: { className?: string }) {
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
      <path d="M14 3v10.5a3.5 3.5 0 1 1-3.5-3.5" />
      <path d="M14 3c.4 2.3 2.2 4.1 4.5 4.5" />
    </svg>
  );
}

/** Facebook glyph — outline minimal "f". */
function FacebookGlyph({ className }: { className?: string }) {
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
      <path d="M14.5 8h-1.6c-.7 0-1.2.5-1.2 1.2V11h2.8l-.4 3h-2.4v7" />
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <path d="M9 14h2.7" />
    </svg>
  );
}

// ─── Payment badges ───────────────────────────────────────────────────────

const PAYMENTS: Array<{ label: string; glyph: (props: { className?: string }) => ReactNode }> = [
  { label: "Yape", glyph: YapeGlyph },
  { label: "MercadoPago", glyph: MercadoPagoGlyph },
  { label: "Visa", glyph: VisaGlyph },
  { label: "Mastercard", glyph: MastercardGlyph },
  { label: "Efectivo", glyph: CashGlyph },
];

function PaymentBadges() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[9.5px] font-semibold uppercase tracking-[0.28em] text-[#0A0A0A]/45">
        Pagos
      </span>
      <ul className="flex flex-wrap items-center gap-1.5">
        {PAYMENTS.map(({ label, glyph: Glyph }) => (
          <li
            key={label}
            className={cn(
              "inline-flex h-7 items-center gap-1 rounded-md border border-[#11111110] bg-white px-2",
              "text-[10px] font-medium tracking-tight text-[#0A0A0A]/75",
            )}
            aria-label={label}
          >
            <Glyph className="h-3 w-auto" />
            <span>{label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Yape — "Y" estilizado. Visual abstracto (sin replicar logo oficial). */
function YapeGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 12"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M3 2 L7 6 L11 2 M7 6 L7 10"
        stroke="#7C0CD8"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** MercadoPago — círculo con curva (handshake stylized). */
function MercadoPagoGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 12" fill="none" className={className} aria-hidden>
      <ellipse cx="12" cy="6" rx="9" ry="4" fill="#00B1EA" />
      <path
        d="M7 6.5c1.5-1.5 4-1.5 5 0s3 0 4-1"
        stroke="#fff"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

/** Visa — wordmark abstracto monochrome. */
function VisaGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 12" fill="none" className={className} aria-hidden>
      <rect width="24" height="12" rx="2" fill="#1A1F71" />
      <text
        x="12"
        y="8.5"
        textAnchor="middle"
        fontFamily="system-ui, sans-serif"
        fontSize="6"
        fontWeight="800"
        fill="#fff"
        letterSpacing="0.4"
      >
        VISA
      </text>
    </svg>
  );
}

/** Mastercard — dos círculos solapados (clásico). */
function MastercardGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 12" fill="none" className={className} aria-hidden>
      <circle cx="9" cy="6" r="4" fill="#EB001B" />
      <circle cx="15" cy="6" r="4" fill="#F79E1B" />
      <path
        d="M12 3.2a4 4 0 0 0 0 5.6 4 4 0 0 0 0-5.6Z"
        fill="#FF5F00"
      />
    </svg>
  );
}

/** Efectivo — billete simplificado. */
function CashGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 12" fill="none" className={className} aria-hidden>
      <rect x="2" y="2" width="20" height="8" rx="1.5" fill="#1F8B4C" />
      <circle cx="12" cy="6" r="1.8" fill="none" stroke="#fff" strokeWidth="0.9" />
      <circle cx="5.5" cy="6" r="0.6" fill="#fff" />
      <circle cx="18.5" cy="6" r="0.6" fill="#fff" />
    </svg>
  );
}

// ─── Agencia JDev credit (luxury studio signature) ────────────────────────

/**
 * Firma editorial del estudio. Aspiracional, minimal. El nombre destaca con
 * tipografía un escalón más sólida y un underline reveal en hover. Si en
 * algún momento querés agregar un glow ultra sutil, basta con sumar
 * `hover:text-shadow-[0_0_24px_rgba(152,16,250,0.5)]` (Tailwind v4 lo
 * soporta) — por ahora lo dejamos limpio para no romper la calma editorial.
 */
function AgenciaCredit() {
  return (
    <p className="inline-flex items-center gap-1.5 text-[11px] text-[#0A0A0A]/45">
      <span className="text-[9px] font-medium uppercase tracking-[0.32em] text-[#0A0A0A]/35">
        Hecho por
      </span>
      <a
        href="https://www.agencia-jdev.com"
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "group/credit relative inline-flex items-center text-[11.5px] font-semibold tracking-tight text-[#0A0A0A]",
          "transition-colors duration-300 ease-out hover:text-[#9810FA]",
        )}
      >
        <span className="relative">
          Agencia JDev
          <span
            aria-hidden
            className={cn(
              "absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0",
              "bg-[#9810FA] transition-transform duration-400 ease-out group-hover/credit:scale-x-100",
            )}
          />
        </span>
      </a>
    </p>
  );
}

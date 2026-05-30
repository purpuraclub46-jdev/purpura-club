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
                src="/brand/isotipo-nuevo.svg"
                alt="Purpura Club"
                width={32}
                height={32}
                className="size-8"
              />
              <Image
                src="/brand/logotipo-nuevo-1.svg"
                alt="Purpura Club"
                width={160}
                height={60}
                className="h-7 w-auto"
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
      { label: "Políticas de devolución", href: "/politicas/devolucion" },
      { label: "Políticas de envío", href: "/politicas/envio" },
      { label: "Políticas de privacidad", href: "/politicas/privacidad" },
      { label: "Tips para cuidar tus joyas", href: "/tips-joyas" },
      { label: "Política de lavado de activos", href: "/politicas/lavado-de-activos" },
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

// ─── Social icons (logos oficiales PNG en /public/footer) ────────────────
//
// Por ahora solo Instagram tiene URL real. Facebook y TikTok quedan
// montados como placeholders (`href` vacío + `aria-disabled`) para que
// cuando llegue el momento solo haya que llenar el `href`; el resto
// (estilos, accesibilidad) ya queda en su sitio.

interface SocialDef {
  label: string;
  href: string | null;
  src: string;
}

const SOCIALS: SocialDef[] = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/purpura.club.pe?igsh=bjFnMzl6dnkyN2Vs",
    src: "/footer/instagram.png",
  },
  {
    label: "TikTok",
    href: null,
    src: "/footer/tiktok.png",
  },
  {
    label: "Facebook",
    href: null,
    src: "/footer/facebook.png",
  },
];

function SocialLinks() {
  return (
    <ul className="flex items-center gap-4">
      {SOCIALS.map(({ label, href, src }) => {
        const disabled = href === null;
        // Logo limpio, sin contenedor — opacity baja por default + lift sutil
        // y micro-scale en hover. Estética Apple/Dior/COS: el logo manda,
        // todo lo demás respira.
        const baseClass = cn(
          "group/social inline-flex items-center justify-center opacity-80",
          "transition-all duration-300 ease-out",
          "hover:-translate-y-0.5 hover:scale-105 hover:opacity-100",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9810FA] focus-visible:ring-offset-2 focus-visible:rounded-sm",
        );
        const inner = (
          <Image
            src={src}
            alt={label}
            width={24}
            height={24}
            className="size-6 object-contain"
          />
        );
        return (
          <li key={label}>
            {disabled ? (
              // Placeholder hasta que tengamos URL oficial — el target queda
              // listo (estilos, accesibilidad, asset). Solo falta llenar el
              // `href` cuando llegue el momento.
              <span
                role="link"
                aria-disabled
                aria-label={`${label} (próximamente)`}
                className={cn(baseClass, "cursor-default opacity-60")}
              >
                {inner}
              </span>
            ) : (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className={baseClass}
              >
                {inner}
              </a>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// ─── Payment processor (MercadoPago oficial) ──────────────────────────────
//
// Solo MercadoPago — Yape/Visa/Mastercard/Efectivo se canalizan vía MP, así
// que mostramos a quién le confiamos el procesamiento. Sin badges, sin
// pills: eyebrow + logo limpio, premium minimal.

function PaymentBadges() {
  return (
    <div className="flex items-center gap-3.5">
      <span className="text-[9.5px] font-semibold uppercase tracking-[0.28em] text-[#0A0A0A]/45">
        Pagos procesados por
      </span>
      {/* Branding horizontal oficial de Mercado Pago (lockup icono + texto).
          width/height hints REFLEJAN el aspect ratio real del SVG
          (viewBox 1048.82 × 425.2 ≈ 2.47:1). Sizing por ancho:
          `w-26 sm:w-34 h-auto` → ~104 px mobile / ~136 px desktop. Punto
          medio elegante: visible y reconocible sin protagonizar. */}
      <Image
        src="/footer/mp-oficial.svg"
        alt="Mercado Pago"
        width={210}
        height={85}
        className="h-auto w-26 sm:w-34"
      />
    </div>
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
        Desarrollado por
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

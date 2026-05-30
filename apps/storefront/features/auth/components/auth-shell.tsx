"use client";

import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@/shared/lib/cn";

/**
 * Building blocks compartidos para /login y /recuperar-contrasena.
 *
 * No los usa /register a propósito — esa página conserva su layout
 * 2-column luxury con perks. Estos componentes están pensados para
 * formularios auth de columna única, mobile-first, sin ruido visual.
 *
 * Decisiones UX clave:
 *  · Eyebrow editorial con hairline brand a la izquierda — gesto Dior.
 *  · Título serif grande (34→42px) con `text-balance` para wrap natural.
 *  · `AuthDivider` introduce ritmo visual entre intro y form (evita
 *    bloques de contenido percibidos como "uniformes").
 *  · `AuthInput` reemplaza al Input genérico solo en auth: focus ring
 *    brand de 4px, rounded-xl, h-12 — premium feel sin contagiar al
 *    resto del design system.
 *  · `AuthSubmit` con ArrowRight que se desplaza en hover — micro-
 *    interacción Stripe/Linear que comunica forward motion.
 */

export function AuthHeader() {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-10 border-b border-[#11111108] bg-white/85 backdrop-blur-xl">
      <div className="relative mx-auto flex h-16 w-full max-w-7xl items-center px-5 sm:h-20 sm:px-8">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Volver"
          className="-ml-2 inline-flex size-10 items-center justify-center rounded-full text-[#0A0A0A] transition-colors duration-200 hover:bg-[#11111108]"
        >
          <ArrowLeft className="size-5" strokeWidth={1.4} />
        </button>

        <Link
          href="/"
          aria-label="Ir al inicio · Purpura Club"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity hover:opacity-90"
        >
          <Image
            src="/brand/logotipo-nuevo-1.svg"
            alt="Purpura Club"
            width={240}
            height={90}
            className="h-9 w-auto sm:h-10"
            priority
          />
        </Link>
      </div>
    </header>
  );
}

export function AuthFooter() {
  return (
    <footer className="relative px-5 pb-8 pt-6 text-center sm:px-8 sm:pb-12">
      <p className="text-[10px] font-medium uppercase tracking-[0.42em] text-[#0A0A0A]/30 sm:text-[11px] sm:tracking-[0.6em]">
        Púrpura Club
      </p>
    </footer>
  );
}

export function AuthAurora() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-70"
      style={{
        background:
          "radial-gradient(45% 60% at 10% 0%, rgba(152,16,250,0.06) 0%, transparent 65%), radial-gradient(35% 50% at 92% 100%, rgba(192,38,211,0.05) 0%, transparent 65%)",
      }}
    />
  );
}

// ─── Intro editorial ────────────────────────────────────────────────────

/**
 * Bloque introductorio premium: eyebrow con hairline brand + título
 * serif grande + subtítulo. Replica el lenguaje editorial de /politicas
 * pero adaptado a contexto auth (single-column, max-w-md).
 */
export function AuthIntro({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: ReactNode;
}) {
  return (
    <div className="space-y-4 sm:space-y-5">
      <p className="inline-flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.34em] text-[#9810FA]">
        <span
          aria-hidden
          className="inline-block h-px w-6 bg-[#9810FA]/55"
        />
        {eyebrow}
      </p>
      <h1 className="font-serif text-[34px] leading-[1.04] tracking-tight text-balance text-[#0A0A0A] sm:text-[42px] sm:leading-[1.05]">
        {title}
      </h1>
      <p className="max-w-sm text-[13.5px] leading-[1.65] text-[#0A0A0A]/65 sm:text-[14.5px] sm:leading-[1.7]">
        {subtitle}
      </p>
    </div>
  );
}

/**
 * Divisor editorial — hairline brand corto + hairline neutro largo.
 * Marca el ritmo entre la intro y el form sin gritar "separator".
 */
export function AuthDivider() {
  return (
    <div className="my-9 flex items-center gap-2 sm:my-10" aria-hidden>
      <span className="h-px w-3 bg-[#9810FA]/55" />
      <span className="h-px flex-1 bg-[#11111110]" />
    </div>
  );
}

// ─── Form primitives ────────────────────────────────────────────────────

export function AuthField({
  label,
  id,
  error,
  children,
}: {
  label: string;
  id: string;
  error?: string;
  children: ReactNode;
}) {
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="block text-[10.5px] font-semibold uppercase tracking-[0.26em] text-[#0A0A0A]/55"
      >
        {label}
      </label>
      {children}
      {error ? (
        <p
          id={errorId}
          className="text-[11.5px] leading-[1.5] text-rose-600"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

/**
 * Input premium para contexto auth — h-12, rounded-xl, focus ring
 * brand de 4px (más generoso que el Input genérico). NO modifica el
 * Input shared/ui — vive solo aquí para no contagiar /register.
 */
export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  ({ className, hasError, type, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type ?? "text"}
        aria-invalid={hasError || undefined}
        className={cn(
          "h-12 w-full rounded-xl border bg-white px-4 text-[14.5px] text-[#0A0A0A] transition-all duration-200 placeholder:text-[#0A0A0A]/35",
          "focus:outline-none focus:ring-4",
          hasError
            ? "border-rose-300 focus:border-rose-400 focus:ring-rose-200/45"
            : "border-[#11111118] focus:border-[#9810FA] focus:ring-[#9810FA]/12",
          "disabled:cursor-not-allowed disabled:bg-[#FAFAFA] disabled:opacity-70",
          className,
        )}
        {...props}
      />
    );
  },
);
AuthInput.displayName = "AuthInput";

// ─── Submit CTA ─────────────────────────────────────────────────────────

/**
 * CTA principal — h-13 (52px), rounded-full, con ArrowRight que se
 * desplaza 4px en hover (forward motion sutil tipo Stripe/Linear).
 * Hover transita a brand purpura + shadow brand de baja intensidad —
 * cero gradientes externos al sistema.
 */
export function AuthSubmit({
  submitting,
  loadingLabel = "Procesando…",
  children,
}: {
  submitting: boolean;
  loadingLabel?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={submitting}
      className={cn(
        "group/cta mt-3 inline-flex h-13 w-full items-center justify-center gap-2.5 rounded-full text-[14px] font-semibold tracking-tight transition-all duration-300 ease-out",
        submitting
          ? "cursor-wait bg-[#11111122] text-[#0A0A0A]/55"
          : "bg-[#0A0A0A] text-white hover:-translate-y-px hover:bg-[#9810FA] hover:shadow-[0_20px_40px_-20px_rgba(152,16,250,0.5)] active:translate-y-0",
      )}
    >
      {submitting ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          {loadingLabel}
        </>
      ) : (
        <>
          <span>{children}</span>
          <ArrowRight
            className="size-4 transition-transform duration-300 ease-out group-hover/cta:translate-x-1"
            strokeWidth={1.6}
          />
        </>
      )}
    </button>
  );
}

/**
 * Cross-link entre pantallas auth (login ↔ register, etc.). Hairline
 * top + center align + microcopy mínimo.
 */
export function AuthCrossLink({
  prefix,
  label,
  href,
}: {
  prefix: string;
  label: string;
  href: string;
}) {
  return (
    <div className="mt-10 border-t border-[#11111110] pt-6 text-center sm:mt-12 sm:pt-7">
      <p className="text-[13px] text-[#0A0A0A]/60">
        {prefix}{" "}
        <Link
          href={href}
          className="font-semibold text-[#9810FA] underline-offset-4 transition-all duration-200 hover:underline"
        >
          {label}
        </Link>
      </p>
    </div>
  );
}

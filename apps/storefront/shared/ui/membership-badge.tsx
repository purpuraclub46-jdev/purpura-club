"use client";

import { AlertTriangle, Crown, Sparkles } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/cn";

/**
 * F2.7-D — Badge reutilizable de Púrpura Club.
 *
 * Variantes:
 *   - active     — socio activo (badge accent fijo)
 *   - urgent     — quedan ≤3 días (warning soft)
 *   - critical   — queda 1 día (warning fuerte)
 *   - expired    — membresía vencida
 *   - clubBonus  — para product cards: "+10% Club"
 *   - clubBonusSm— variante chica del bonus (cards `sm`)
 *
 * Cada variante encapsula color + ícono + texto default. El consumidor
 * puede override la `label` si necesita mostrar countdown ("Socio · 18 días").
 *
 * Acompañado de `useMembershipState`, este componente puede plug-and-play en
 * header, PDP, checkout, mi-cuenta sin duplicar lógica.
 */

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full font-semibold uppercase tabular-nums backdrop-blur-md transition-shadow duration-300 ease-out",
  {
    variants: {
      tone: {
        active:
          "bg-linear-to-br from-[#9810FA] via-[#7C0CD8] to-[#5B0AAD] text-white ring-1 ring-white/15 ring-inset shadow-[0_6px_18px_-10px_rgba(152,16,250,0.55)]",
        urgent:
          "bg-amber-50 text-amber-800 ring-1 ring-amber-200/70 ring-inset",
        critical:
          "bg-rose-50 text-rose-700 ring-1 ring-rose-200/70 ring-inset",
        expired:
          "bg-[#11111108] text-[#0A0A0A]/55 ring-1 ring-black/8 ring-inset",
        clubBonus:
          "relative overflow-hidden bg-linear-to-br from-[#9810FA]/85 via-[#7C0CD8]/80 to-[#5B0AAD]/85 text-white ring-1 ring-white/15 ring-inset shadow-[0_6px_18px_-10px_rgba(152,16,250,0.55)] group-hover:shadow-[0_10px_28px_-10px_rgba(152,16,250,0.75)]",
      },
      size: {
        sm: "gap-1 px-1.5 py-0.5 text-[9px] tracking-[0.14em]",
        md: "px-2 py-0.75 text-[10px] tracking-[0.16em]",
        lg: "px-2.5 py-1 text-[11px] tracking-[0.18em]",
      },
    },
    defaultVariants: { tone: "active", size: "md" },
  },
);

export interface MembershipBadgeProps
  extends VariantProps<typeof badgeVariants> {
  /** Label personalizada; si se omite usa el default de la variante. */
  label?: string;
  /** Ícono override; si se omite usa el default de la variante. */
  icon?: typeof Crown;
  /** Texto accesible para screen readers. */
  ariaLabel?: string;
  className?: string;
}

const DEFAULT_LABEL: Record<NonNullable<MembershipBadgeProps["tone"]>, string> = {
  active: "Socio Activo",
  urgent: "Vence pronto",
  critical: "Vence hoy",
  expired: "Membresía vencida",
  clubBonus: "+10% Club",
};

const DEFAULT_ICON: Record<NonNullable<MembershipBadgeProps["tone"]>, typeof Crown> = {
  active: Crown,
  urgent: AlertTriangle,
  critical: AlertTriangle,
  expired: Crown,
  clubBonus: Sparkles,
};

export function MembershipBadge({
  tone = "active",
  size = "md",
  label,
  icon,
  ariaLabel,
  className,
}: MembershipBadgeProps) {
  const resolvedTone = tone ?? "active";
  const resolvedSize = size ?? "md";
  const Icon = icon ?? DEFAULT_ICON[resolvedTone];
  const text = label ?? DEFAULT_LABEL[resolvedTone];
  const isClubBonus = resolvedTone === "clubBonus";

  return (
    <span
      aria-label={ariaLabel ?? text}
      className={cn(badgeVariants({ tone: resolvedTone, size: resolvedSize }), className)}
    >
      {/* Shimmer interno solo para clubBonus (efecto luxury heredado de F2.7-A). */}
      {isClubBonus ? (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 -translate-x-full",
            "bg-linear-to-r from-transparent via-white/25 to-transparent",
            "transition-transform duration-1100 ease-[cubic-bezier(0.22,1,0.36,1)]",
            "group-hover:translate-x-full",
          )}
        />
      ) : null}
      <Icon
        className={cn(
          "relative shrink-0",
          resolvedSize === "sm"
            ? "size-2.5"
            : resolvedSize === "lg"
              ? "size-3.5"
              : "size-3",
        )}
        strokeWidth={1.8}
      />
      <span className="relative">{text}</span>
    </span>
  );
}

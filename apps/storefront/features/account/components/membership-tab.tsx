"use client";

import {
  AlertTriangle,
  Crown,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/shared/ui/button";
import { MembershipBadge } from "@/shared/ui/membership-badge";
import { Skeleton } from "@/shared/ui/skeleton";
import { cn } from "@/shared/lib/cn";
import { formatDate } from "@/shared/lib/format";
import { MEMBERSHIP_BENEFITS } from "@/shared/lib/membership-benefits";
import { useMyMembership } from "@/features/account/hooks/use-account";
import { useMembershipState } from "@/features/account/hooks/use-membership-state";

/**
 * F2.7-D / D10 — Reescritura completa del tab Membresía.
 *
 * Tres ramas visuales según el estado de membresía calculado por
 * `useMembershipState`:
 *
 *   - active     → hero con countdown + benefits checklist + recordatorio
 *                  visual si urgency in {soft, urgent, critical}
 *   - expired    → hero suave + CTA "Reactiva con tu próxima compra"
 *   - non_member → onboarding mínimo + benefits checklist + CTA "Compra"
 *
 * El hook `useMembershipState` lee del store de auth (`customerProfile`),
 * mientras que `useMyMembership` trae el detalle adicional (startedAt,
 * lastPurchaseAt). Ambos se combinan: el state decide la rama, el detail
 * llena los slots.
 */
export function MembershipTab() {
  const state = useMembershipState();
  const { data: detail, isLoading } = useMyMembership();

  if (state.status === "loading" || isLoading) {
    return (
      <div className="space-y-3">
        <SectionHeader title="Membresía" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-44 w-full rounded-2xl" />
      </div>
    );
  }

  if (state.status === "active") {
    return (
      <ActiveView
        state={state}
        startedAt={detail?.startedAt ?? null}
        lastPurchaseAt={detail?.lastPurchaseAt ?? null}
      />
    );
  }

  if (state.status === "expired") {
    return <ExpiredView expiresAt={state.expiresAt} />;
  }

  return <NonMemberView />;
}

// ─── Active ─────────────────────────────────────────────────────────────

function ActiveView({
  state,
  startedAt,
  lastPurchaseAt,
}: {
  state: ReturnType<typeof useMembershipState>;
  startedAt: string | null;
  lastPurchaseAt: string | null;
}) {
  const expiresAtIso = state.expiresAt ? state.expiresAt.toISOString() : null;

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Membresía del Club"
        description="Tu nivel actual, fecha de vencimiento y beneficios disponibles."
      />

      {/* Hero card oscuro luxury — copy + countdown. */}
      <div className="relative isolate overflow-hidden rounded-2xl border border-[#9810FA]/40 bg-[#0A0A0A] p-6 text-white sm:p-8">
        <div
          aria-hidden
          className="absolute inset-0 opacity-50"
          style={{
            background:
              "radial-gradient(60% 60% at 0% 0%, rgba(152,16,250,0.45) 0%, transparent 60%), radial-gradient(60% 60% at 100% 100%, rgba(192,38,211,0.35) 0%, transparent 60%)",
          }}
        />
        <div className="relative space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Crown className="size-5 text-[#9810FA]" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#9810FA]">
              Miembro activo
            </span>
          </div>
          <h2 className="font-serif text-3xl tracking-tight">Club Púrpura</h2>

          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Activa desde" value={startedAt ? formatDate(startedAt) : "—"} dark />
            <Stat label="Vence" value={expiresAtIso ? formatDate(expiresAtIso) : "—"} dark />
            <Stat
              label="Días restantes"
              value={
                state.daysRemaining !== null
                  ? state.daysRemaining === 0
                    ? "Hoy"
                    : `${state.daysRemaining} ${state.daysRemaining === 1 ? "día" : "días"}`
                  : "—"
              }
              dark
              accent
            />
          </div>

          {lastPurchaseAt ? (
            <p className="pt-1 text-xs text-white/55">
              Última compra: {formatDate(lastPurchaseAt)}
            </p>
          ) : null}
        </div>
      </div>

      {/* F2.7-D / D7 — Recordatorio visual. soft (≤7) es dismissible
          implícitamente cerrando el banner externo; urgent/critical (≤3/≤1)
          son persistentes — el usuario no debería poder ocultarlos. */}
      <MembershipExpiryHint state={state} />

      <ClubBenefitsList />
    </div>
  );
}

// ─── Expired ────────────────────────────────────────────────────────────

function ExpiredView({ expiresAt }: { expiresAt: Date | null }) {
  return (
    <div className="space-y-5">
      <SectionHeader
        title="Membresía del Club"
        description="Tu membresía está vencida — reactívala con tu próxima compra calificada."
      />

      <div className="rounded-2xl border border-[#11111114] bg-white p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Crown className="size-5 text-[#0A0A0A]/45" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#0A0A0A]/45">
              Sin membresía activa
            </span>
          </div>
          <MembershipBadge tone="expired" size="md" label="Membresía vencida" />
        </div>
        <h2 className="mt-4 font-serif text-2xl tracking-tight text-[#0A0A0A]">
          Reactiva tu Club Púrpura
        </h2>
        <p className="mt-2 max-w-md text-sm text-[#0A0A0A]/65">
          {expiresAt ? (
            <>
              Tu membresía venció el <strong>{formatDate(expiresAt.toISOString())}</strong>.{" "}
            </>
          ) : null}
          Realiza una compra desde <strong>S/25</strong> en la tienda y
          vuelves a tener los beneficios automáticamente.
        </p>
        <Link href="/shop" className="mt-5 inline-block">
          <Button>Explorar productos</Button>
        </Link>
      </div>

      <ClubBenefitsList muted />
    </div>
  );
}

// ─── Non member ─────────────────────────────────────────────────────────

function NonMemberView() {
  return (
    <div className="space-y-5">
      <SectionHeader
        title="Membresía del Club"
        description="Aún no eres parte. Activa tu membresía con una compra desde S/25."
      />

      <div className="rounded-2xl border border-[#11111114] bg-white p-6 sm:p-8">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-[#9810FA]" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#9810FA]">
            Activa tu membresía
          </span>
        </div>
        <h2 className="mt-4 font-serif text-2xl tracking-tight text-[#0A0A0A]">
          Únete a Púrpura Club
        </h2>
        <p className="mt-2 max-w-md text-sm text-[#0A0A0A]/65">
          Tu primera compra calificada (S/25 o más) activa la membresía por
          30 días con todos los beneficios listados abajo.
        </p>
        <Link href="/shop" className="mt-5 inline-block">
          <Button>Empezar a comprar</Button>
        </Link>
      </div>

      <ClubBenefitsList />
    </div>
  );
}

// ─── Expiry hint ─────────────────────────────────────────────────────────

function MembershipExpiryHint({
  state,
}: {
  state: ReturnType<typeof useMembershipState>;
}) {
  if (state.urgency === "none") return null;

  const days = state.daysRemaining;
  const tone =
    state.urgency === "critical"
      ? "danger"
      : state.urgency === "urgent"
        ? "warning"
        : "accentSoft";

  const title =
    state.urgency === "critical"
      ? days !== null && days <= 0
        ? "Tu membresía vence hoy"
        : "Tu membresía vence mañana"
      : state.urgency === "urgent"
        ? days !== null
          ? `Tu membresía vence en ${days} días`
          : "Tu membresía vence pronto"
        : days !== null
          ? `Tu membresía vence en ${days} días`
          : "Tu membresía está por vencer";

  const description =
    "Realiza una compra desde S/25 para renovarla por 30 días más y mantener tus beneficios.";

  // D7 — Banner persistente para 3 y 1 días. Soft tiene cierre? No por
  // simplicidad mantenemos visible mientras urgency != none.
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border p-4 sm:p-5 md:flex-row md:items-center md:justify-between",
        tone === "danger" && "border-rose-200/70 bg-rose-50",
        tone === "warning" && "border-amber-200/70 bg-amber-50",
        tone === "accentSoft" && "border-[#9810FA]/15 bg-[#9810FA]/4",
      )}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          className={cn(
            "mt-0.5 size-4 shrink-0",
            tone === "danger" && "text-rose-600",
            tone === "warning" && "text-amber-600",
            tone === "accentSoft" && "text-[#9810FA]",
          )}
          strokeWidth={1.6}
        />
        <div className="space-y-0.5">
          <p
            className={cn(
              "text-[13px] font-semibold",
              tone === "danger" && "text-rose-800",
              tone === "warning" && "text-amber-900",
              tone === "accentSoft" && "text-[#0A0A0A]",
            )}
          >
            {title}
          </p>
          <p
            className={cn(
              "text-[12px] leading-relaxed",
              tone === "danger" && "text-rose-700/85",
              tone === "warning" && "text-amber-800/85",
              tone === "accentSoft" && "text-[#0A0A0A]/65",
            )}
          >
            {description}
          </p>
        </div>
      </div>
      <Link
        href="/shop"
        className={cn(
          "inline-flex w-full shrink-0 items-center justify-center rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors md:w-auto",
          tone === "danger" && "bg-rose-600 text-white hover:bg-rose-700",
          tone === "warning" && "bg-amber-600 text-white hover:bg-amber-700",
          tone === "accentSoft" &&
            "bg-[#9810FA] text-white hover:bg-[#7C0CD8]",
        )}
      >
        Comprar y renovar
      </Link>
    </div>
  );
}

// ─── Benefits list ──────────────────────────────────────────────────────

function ClubBenefitsList({ muted }: { muted?: boolean } = {}) {
  return (
    <div className="lux-card rounded-2xl p-5 sm:p-6">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#0A0A0A]/55">
        {muted ? "Lo que recibías" : "Tus beneficios activos"}
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {MEMBERSHIP_BENEFITS.map((benefit) => (
          <BenefitRow key={benefit.key} icon={benefit.icon} title={benefit.label} description={benefit.description} muted={muted} />
        ))}
      </ul>
    </div>
  );
}

function BenefitRow({
  icon: Icon,
  title,
  description,
  muted,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  muted?: boolean;
}) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-xl",
          muted ? "bg-[#11111108] text-[#0A0A0A]/45" : "bg-[#9810FA]/10 text-[#9810FA]",
        )}
      >
        <Icon className="size-4" strokeWidth={1.6} />
      </span>
      <div className="space-y-0.5">
        <p
          className={cn(
            "text-[13px] font-semibold leading-snug",
            muted ? "text-[#0A0A0A]/55" : "text-[#0A0A0A]",
          )}
        >
          {title}
        </p>
        <p className="text-[12px] leading-relaxed text-[#0A0A0A]/55">
          {description}
        </p>
      </div>
    </li>
  );
}

// ─── Shared local atoms ─────────────────────────────────────────────────

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <header className="mb-2 space-y-1">
      <h1 className="font-serif text-2xl tracking-tight text-[#0A0A0A] sm:text-3xl">
        {title}
      </h1>
      {description ? (
        <p className="text-sm text-[#0A0A0A]/55">{description}</p>
      ) : null}
    </header>
  );
}

function Stat({
  label,
  value,
  dark,
  accent,
}: {
  label: string;
  value: string;
  dark?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3",
        dark ? "border-white/10 bg-white/5" : "border-[#11111114] bg-white",
      )}
    >
      <p
        className={cn(
          "text-[10px] font-semibold uppercase tracking-[0.18em]",
          dark ? "text-white/55" : "text-[#0A0A0A]/45",
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-sm font-medium tabular-nums",
          dark
            ? accent
              ? "text-[#9810FA]"
              : "text-white"
            : "text-[#0A0A0A]",
          accent && "text-base font-semibold",
        )}
      >
        {value}
      </p>
    </div>
  );
}


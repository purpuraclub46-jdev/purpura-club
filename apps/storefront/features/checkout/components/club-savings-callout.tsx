"use client";

import { Crown, Sparkles } from "lucide-react";
import Link from "next/link";
import { MembershipBadge } from "@/shared/ui/membership-badge";
import { useMembershipState } from "@/features/account/hooks/use-membership-state";

/**
 * F2.7-D — Callout informativo del estado Club en el resumen de checkout.
 *
 * D2 explícitamente excluyó nuevos campos backend (`Order.clubSavings`,
 * `OrderItem.memberDiscountApplied`). Por tanto este componente NO suma
 * "ahorraste S/X" — eso requeriría comparar precios pre/post promo, que
 * no es información que el storefront tenga de forma confiable.
 *
 * En su lugar muestra:
 *   - Socio activo  → confirmación visual de que los beneficios están vivos.
 *                     Tono accent + lista breve de beneficios disponibles
 *                     en este pedido.
 *   - No socio      → invitación corta (sin botón propio) a activar el club.
 *   - Anónimo       → no se renderiza (el flujo de checkout ya exige login).
 *
 * Si en el futuro el backend agrega los campos rechazados en D2, este
 * componente puede consumirlos directamente sin reestructuración.
 */
export function ClubSavingsCallout() {
  const state = useMembershipState();

  if (state.status === "anonymous" || state.status === "loading") return null;

  if (state.status === "active") {
    return (
      <div className="rounded-2xl border border-[#9810FA]/20 bg-[#9810FA]/4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9810FA]">
            <Crown className="size-3" />
            Beneficios aplicados
          </span>
          <MembershipBadge tone="active" size="sm" label="Socio Activo" />
        </div>
        <ul className="mt-3 space-y-1.5 text-[12px] text-[#0A0A0A]/75">
          <Benefit>
            10% adicional en productos elegibles (Joyería y Perfumes)
          </Benefit>
          <Benefit>
            1 ticket de sorteo por cada S/25 de tu pedido
          </Benefit>
        </ul>
        <p className="mt-3 text-[10.5px] text-[#0A0A0A]/45">
          Los precios mostrados ya incluyen el beneficio Club cuando aplica.
        </p>
      </div>
    );
  }

  // status === "non_member" | "expired"
  const expiredCopy = state.status === "expired";
  return (
    <Link
      href="/mi-cuenta?tab=membresia"
      className="block rounded-2xl border border-[#9810FA]/15 bg-[#9810FA]/4 p-4 transition-colors hover:bg-[#9810FA]/8 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <Sparkles
          className="mt-0.5 size-4 shrink-0 text-[#9810FA]"
          strokeWidth={1.6}
        />
        <div className="space-y-1">
          <p className="text-[12px] font-semibold text-[#0A0A0A]">
            {expiredCopy
              ? "Tu membresía está vencida"
              : "Activa Púrpura Club"}
          </p>
          <p className="text-[11.5px] leading-relaxed text-[#0A0A0A]/65">
            {expiredCopy
              ? "Realiza una compra desde S/25 para reactivarla y recibir 10% adicional en Joyería y Perfumes, además de tickets de sorteo."
              : "Compra desde S/25 para activarla y recibir 10% adicional en Joyería y Perfumes, además de tickets de sorteo."}
          </p>
        </div>
      </div>
    </Link>
  );
}

function Benefit({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span
        aria-hidden
        className="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-[#9810FA] text-[8px] font-bold text-white"
      >
        ✓
      </span>
      <span>{children}</span>
    </li>
  );
}

import { Gift, Ticket, Users, Sparkles, type LucideIcon } from "lucide-react";

/**
 * F2.7-D / D1 — Catálogo canónico de beneficios del Club Púrpura.
 *
 * Fuente única de verdad en el storefront para todas las superficies que
 * listen beneficios (mi-cuenta, home, modales, banners). Si el cliente
 * cambia la oferta del Club, modificar SOLO este archivo. NO consultar al
 * backend — los beneficios son contenido editorial, no datos transaccionales.
 *
 * Cada entrada describe un beneficio mecánico, no un slogan:
 *   - icon: lucide-react component (consistente con el resto del storefront)
 *   - label: una frase descriptiva sin emoji
 *   - description: contexto operativo (cuándo aplica, dónde se ve)
 *   - eligible: callback para indicar si el beneficio está vigente para
 *     este customer en este momento. true por default — algunos beneficios
 *     son siempre visibles (independiente de membresía activa) porque la
 *     UI los muestra como gancho comercial.
 */

export interface MembershipBenefit {
  readonly key: string;
  readonly icon: LucideIcon;
  readonly label: string;
  readonly description: string;
}

export const MEMBERSHIP_BENEFITS: readonly MembershipBenefit[] = [
  {
    key: "raffle-half-price",
    icon: Ticket,
    label: "Tickets de sorteo a mitad de precio",
    description:
      "Compras los tickets de cualquier sorteo a S/5 en lugar de S/10.",
  },
  {
    key: "club-bonus-discount",
    icon: Sparkles,
    label: "+10% adicional sobre promociones",
    description:
      "Cuando hay oferta vigente en Joyería o Perfumes, obtienes un 10% extra acumulable.",
  },
  {
    key: "purchase-rewards",
    icon: Gift,
    label: "Un ticket por cada S/25 de compra",
    description:
      "Cada compra calificada suma participaciones automáticas a los sorteos del Club.",
  },
  {
    key: "referrals",
    icon: Users,
    label: "Tickets por invitar amigos",
    description:
      "Cuando un invitado se registra con tu enlace y compra S/25 o más, recibes un ticket bonus.",
  },
] as const;

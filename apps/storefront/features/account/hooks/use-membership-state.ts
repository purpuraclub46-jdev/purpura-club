"use client";

import { useMemo } from "react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import type { MembershipBadgeProps } from "@/shared/ui/membership-badge";

/**
 * F2.7-D — Estado canónico de membresía consumible por cualquier surface.
 *
 * Centraliza:
 *   - Si el usuario es socio
 *   - Si esa membresía sigue vigente (puede tener isMember=true pero ya
 *     vencida en la base — defensa contra desync momentáneo entre la cache
 *     denormalizada y la fecha real)
 *   - Días restantes hasta vencimiento (calculo D5 frontend-only)
 *   - Nivel de urgencia visual: none / soft (≤7) / urgent (≤3) / critical (≤1)
 *
 * Salida estable — null-safe para todas las branches.
 */

export type MembershipUrgency = "none" | "soft" | "urgent" | "critical";

export type MembershipStatus =
  | "loading"
  | "anonymous"
  | "non_member"
  | "expired"
  | "active";

export interface MembershipState {
  status: MembershipStatus;
  isMember: boolean;
  expiresAt: Date | null;
  daysRemaining: number | null;
  urgency: MembershipUrgency;
}

// F2.7-D / D5 — umbrales frontend-only. Si el backend agrega un
// `expirationUrgency` en el futuro, podemos depender de él; por ahora la
// regla 7/3/1 vive aquí.
const URGENCY_DAYS_SOFT = 7;
const URGENCY_DAYS_URGENT = 3;
const URGENCY_DAYS_CRITICAL = 1;

function computeUrgency(daysRemaining: number | null): MembershipUrgency {
  if (daysRemaining === null || daysRemaining < 0) return "none";
  if (daysRemaining <= URGENCY_DAYS_CRITICAL) return "critical";
  if (daysRemaining <= URGENCY_DAYS_URGENT) return "urgent";
  if (daysRemaining <= URGENCY_DAYS_SOFT) return "soft";
  return "none";
}

function diffInDays(target: Date, now: Date): number {
  const MS_PER_DAY = 86_400_000;
  return Math.ceil((target.getTime() - now.getTime()) / MS_PER_DAY);
}

/**
 * F2.7-D — Mapea `MembershipState` a las props del `MembershipBadge`.
 *
 * Centraliza el contrato visual:
 *   - active / soft urgency  → tono accent + countdown opcional
 *   - urgent (≤3 días)       → tono warning, label "Vence en X días"
 *   - critical (≤1 día)      → tono critical, label "Vence hoy"
 *   - expired                → tono expired (mostrar como recordatorio
 *                              de reactivar)
 *   - non_member / anonymous / loading → null (no se renderiza badge)
 *
 * Devolver null en vez de un Fragment evita que las surfaces tengan que
 * incluir lógica condicional propia.
 */
export function resolveMembershipBadgeProps(
  state: MembershipState,
): MembershipBadgeProps | null {
  if (state.status === "loading" || state.status === "anonymous") return null;

  if (state.status === "expired") {
    return { tone: "expired", label: "Membresía vencida" };
  }

  if (state.status === "non_member") return null;

  // status === "active"
  const days = state.daysRemaining;

  if (state.urgency === "critical") {
    return {
      tone: "critical",
      label: days !== null && days <= 0 ? "Vence hoy" : "Vence mañana",
    };
  }

  if (state.urgency === "urgent") {
    return {
      tone: "urgent",
      label: days !== null ? `Vence en ${days} días` : "Vence pronto",
    };
  }

  // soft o none — badge accent. En soft mostramos countdown como
  // refuerzo sutil; en none basta con "Socio Activo".
  if (state.urgency === "soft" && days !== null) {
    return { tone: "active", label: `Socio · ${days} días` };
  }

  return { tone: "active", label: "Socio Activo" };
}

export function useMembershipState(): MembershipState {
  const { user, hydrated, isLoading } = useAuth();

  return useMemo<MembershipState>(() => {
    if (!hydrated || isLoading) {
      return {
        status: "loading",
        isMember: false,
        expiresAt: null,
        daysRemaining: null,
        urgency: "none",
      };
    }

    if (!user) {
      return {
        status: "anonymous",
        isMember: false,
        expiresAt: null,
        daysRemaining: null,
        urgency: "none",
      };
    }

    const profile = user.customerProfile;
    // Defensa: usuarios legacy sin customerProfile o sin flag isMember.
    if (!profile || !profile.isMember) {
      return {
        status: "non_member",
        isMember: false,
        expiresAt: null,
        daysRemaining: null,
        urgency: "none",
      };
    }

    // F2.7-D — Defensa contra desync de la cache `isMember` en Customer.
    // Si el flag dice true pero la fecha ya pasó, se trata como expired.
    const expiresAt = profile.membershipExpiresAt
      ? new Date(profile.membershipExpiresAt)
      : null;
    const now = new Date();
    const daysRemaining = expiresAt ? diffInDays(expiresAt, now) : null;

    if (expiresAt && daysRemaining !== null && daysRemaining < 0) {
      return {
        status: "expired",
        isMember: false,
        expiresAt,
        daysRemaining,
        urgency: "none",
      };
    }

    return {
      status: "active",
      isMember: true,
      expiresAt,
      daysRemaining,
      urgency: computeUrgency(daysRemaining),
    };
  }, [hydrated, isLoading, user]);
}

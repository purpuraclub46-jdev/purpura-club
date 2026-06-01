"use client";

import Link from "next/link";
import {
  resolveMembershipBadgeProps,
  useMembershipState,
} from "@/features/account/hooks/use-membership-state";
import { MembershipBadge } from "@/shared/ui/membership-badge";

/**
 * F2.7-D / D6 — Badge socio visible siempre en el header (desktop) cuando
 * la membresía está activa. Renderiza nada en mobile (el lugar canónico es
 * el AccountPanel del drawer) ni para usuarios anónimos / no socios.
 *
 * Click → /mi-cuenta?tab=membresia. El badge debe leerse como entry point
 * a la sección Membresía, NO como decoración estática.
 */
export function HeaderMembershipBadge() {
  const state = useMembershipState();
  const props = resolveMembershipBadgeProps(state);

  if (!props) return null;

  return (
    <Link
      href="/mi-cuenta?tab=membresia"
      aria-label="Ver tu membresía Púrpura Club"
      className="hidden lg:inline-flex"
    >
      <MembershipBadge {...props} />
    </Link>
  );
}

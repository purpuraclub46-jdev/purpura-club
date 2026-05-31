"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth.store";
import { referralsApi } from "../api/referrals.api";

export const referralsKeys = {
  me: ["referrals", "me"] as const,
};

/**
 * F2.7-C — Hook para el resumen de referidos del usuario logueado.
 *
 * Sólo se habilita cuando hay accessToken (mismo patrón que `useAuth`). Esto
 * evita la primera llamada anónima que devolvería 401 mientras el store
 * hidrata desde localStorage.
 */
export const useMyReferrals = () => {
  const accessToken = useAuthStore((s) => s.tokens?.accessToken);
  return useQuery({
    queryKey: referralsKeys.me,
    queryFn: () => referralsApi.me(),
    enabled: Boolean(accessToken),
    staleTime: 30_000,
  });
};

"use client";

import { httpClient, unwrap } from "@/services/http/client";
import type { ApiResponse, ReferralOverview } from "@/types/api";

export const referralsApi = {
  /**
   * F2.7-C — Resumen de referidos del usuario autenticado.
   * Backend: GET /v1/referrals/me (requiere JWT).
   */
  me: async (): Promise<ReferralOverview> => {
    const { data } = await httpClient.get<ApiResponse<ReferralOverview>>(
      "/referrals/me",
    );
    return unwrap(data);
  },
};

"use client";

import { useQuery } from "@tanstack/react-query";
import { catalogApi } from "@/features/catalog/api/catalog.api";

export const randomHomeKeys = {
  all: ["random-home"] as const,
  list: (limit: number) => [...randomHomeKeys.all, "list", limit] as const,
};

/**
 * "Selección curada" del home — random fresh feed.
 *
 * `staleTime: 0` + `refetchOnMount: "always"` garantizan que cada navegación
 * al home dispara un fetch nuevo (el backend hace `ORDER BY random()` así
 * que siempre devuelve un subset distinto). No usamos `gcTime: 0` para que
 * volver atrás del navegador conserve la selección anterior sin loading flash.
 */
export const useRandomHome = (limit = 12) =>
  useQuery({
    queryKey: randomHomeKeys.list(limit),
    queryFn: () => catalogApi.randomForHome(limit),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });

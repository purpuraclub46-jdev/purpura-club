"use client";

import { useEffect, useState } from "react";

/**
 * Hook SSR-safe que sigue una media query nativa. Default `false`
 * en el primer render para evitar mismatch de hidratación; actualiza
 * tras mount + en cada cambio del MediaQueryList.
 *
 * Pensado para gates visuales triviales (ej. desktop vs mobile search).
 * No reemplaza Tailwind responsive — úsalo cuando necesitas branch lógico
 * en TS (montar A o B), no solo show/hide en CSS.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

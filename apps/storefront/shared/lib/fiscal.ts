/**
 * Utilidades fiscales del storefront (Perú). Espejo de
 * `apps/api/src/modules/fiscal/fiscal.util.ts`.
 * Precios incluyen IGV por convención.
 */

export const DEFAULT_IGV_RATE = 18;

const round2 = (v: number): number => Math.round(v * 100) / 100;

export interface FiscalBreakdown {
  total: number;
  untaxed: number;
  igv: number;
  igvRate: number;
}

export function splitGross(
  grossTotal: number,
  igvRate: number = DEFAULT_IGV_RATE,
): FiscalBreakdown {
  if (!Number.isFinite(grossTotal) || grossTotal < 0) {
    return { total: 0, untaxed: 0, igv: 0, igvRate };
  }
  if (igvRate < 0) {
    return {
      total: round2(grossTotal),
      untaxed: round2(grossTotal),
      igv: 0,
      igvRate: 0,
    };
  }
  const factor = 1 + igvRate / 100;
  const total = round2(grossTotal);
  const untaxed = round2(total / factor);
  const igv = round2(total - untaxed);
  return { total, untaxed, igv, igvRate };
}

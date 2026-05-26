/**
 * Utilidades fiscales del cliente (Perú).
 * Refleja la lógica de `apps/api/src/modules/fiscal/fiscal.util.ts`.
 *
 * Convención retail Perú: los precios del catálogo YA incluyen IGV. Estas
 * funciones separan la base imponible y el IGV a partir del bruto.
 *
 * El IGV efectivo se puede sobreescribir por instancia (override), pero
 * el default 18 % refleja la tasa oficial vigente.
 */

export const DEFAULT_IGV_RATE = 18;

const round2 = (v: number): number => Math.round(v * 100) / 100;

export interface FiscalBreakdown {
  /** Total bruto (CON IGV) — lo que paga el cliente. */
  total: number;
  /** Base imponible — total SIN IGV. */
  untaxed: number;
  /** Monto del IGV contenido en el total. */
  igv: number;
  /** Tasa IGV aplicada (%) para mostrar al usuario. */
  igvRate: number;
}

/**
 * Dado un total CON IGV incluido, separa base imponible e IGV.
 *
 * Ej: splitGross(118)        → { untaxed: 100, igv: 18,  total: 118, igvRate: 18 }
 *     splitGross(0)          → { untaxed: 0,   igv: 0,   total: 0,   igvRate: 18 }
 *     splitGross(-10)        → throws (entrada inválida)
 */
export function splitGross(
  grossTotal: number,
  igvRate: number = DEFAULT_IGV_RATE,
): FiscalBreakdown {
  if (!Number.isFinite(grossTotal) || grossTotal < 0) {
    return { total: 0, untaxed: 0, igv: 0, igvRate };
  }
  if (igvRate < 0) {
    return { total: round2(grossTotal), untaxed: round2(grossTotal), igv: 0, igvRate: 0 };
  }
  const factor = 1 + igvRate / 100;
  const total = round2(grossTotal);
  const untaxed = round2(total / factor);
  const igv = round2(total - untaxed);
  return { total, untaxed, igv, igvRate };
}

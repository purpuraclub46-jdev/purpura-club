/**
 * Utilidades fiscales (IGV) — sin estado, sin dependencias de Nest.
 *
 * Convención: el sistema asume `pricesIncludeIgv = true` por defecto (estándar
 * retail Perú). Todas las funciones aceptan `igvRate` como porcentaje (18 = 18%).
 *
 * Reglas de redondeo: 2 decimales, half-away-from-zero (Math.round estándar).
 * SUNAT acepta esta convención para boletas/facturas regulares.
 */

const round2 = (v: number): number => Math.round(v * 100) / 100;

/**
 * Dado un total CON IGV incluido, separa base imponible e IGV.
 *
 * Ej: splitGross(118, 18) → { untaxed: 100, igv: 18 }
 */
export function splitGross(
  grossTotal: number,
  igvRate: number,
): { untaxed: number; igv: number; total: number } {
  if (grossTotal < 0) throw new Error('grossTotal no puede ser negativo');
  if (igvRate < 0) throw new Error('igvRate no puede ser negativo');
  const factor = 1 + igvRate / 100;
  const untaxed = round2(grossTotal / factor);
  const igv = round2(grossTotal - untaxed);
  return { untaxed, igv, total: round2(grossTotal) };
}

/**
 * Dado un monto SIN IGV (base imponible), calcula IGV y total bruto.
 *
 * Ej: addIgv(100, 18) → { untaxed: 100, igv: 18, total: 118 }
 */
export function addIgv(
  untaxedAmount: number,
  igvRate: number,
): { untaxed: number; igv: number; total: number } {
  if (untaxedAmount < 0) throw new Error('untaxedAmount no puede ser negativo');
  if (igvRate < 0) throw new Error('igvRate no puede ser negativo');
  const untaxed = round2(untaxedAmount);
  const igv = round2(untaxed * (igvRate / 100));
  const total = round2(untaxed + igv);
  return { untaxed, igv, total };
}

/**
 * Desglose IGV por línea cuando el precio unitario YA incluye IGV.
 *
 * Ej: lineBreakdownGross({ unitPrice: 118, quantity: 2, igvRate: 18 })
 *   → { unitPrice: 118, unitPriceUntaxed: 100, subtotal: 236,
 *       subtotalUntaxed: 200, igvAmount: 36, igvRate: 18 }
 *
 * Nota: el IGV de línea se calcula sobre el subtotal (no por unidad redondeada)
 * para evitar diferencias de centavos al sumar muchas unidades.
 */
export function lineBreakdownGross(opts: {
  unitPrice: number;
  quantity: number;
  igvRate: number;
}): {
  unitPrice: number;
  unitPriceUntaxed: number;
  subtotal: number;
  subtotalUntaxed: number;
  igvAmount: number;
  igvRate: number;
} {
  const { unitPrice, quantity, igvRate } = opts;
  if (quantity < 0) throw new Error('quantity no puede ser negativa');
  const factor = 1 + igvRate / 100;
  const unitPriceUntaxed = round2(unitPrice / factor);
  const subtotal = round2(unitPrice * quantity);
  // Recalcular sobre el subtotal evita arrastres por unidad.
  const subtotalUntaxed = round2(subtotal / factor);
  const igvAmount = round2(subtotal - subtotalUntaxed);
  return {
    unitPrice: round2(unitPrice),
    unitPriceUntaxed,
    subtotal,
    subtotalUntaxed,
    igvAmount,
    igvRate,
  };
}

/**
 * Calcula el breakdown total de una orden dado el total bruto (CON IGV) final.
 * Útil cuando ya se conoce el total cobrado y se necesita el desglose para
 * persistir en Order / POSCreditNote.
 */
export function computeOrderBreakdown(opts: {
  grossTotal: number;
  igvRate: number;
}): { subtotalUntaxed: number; igvAmount: number; total: number } {
  const { untaxed, igv, total } = splitGross(opts.grossTotal, opts.igvRate);
  return { subtotalUntaxed: untaxed, igvAmount: igv, total };
}

/**
 * Formatea un comprobante SUNAT estilo "B001-00000123" a partir de la serie
 * y el número correlativo. SUNAT espera padding a 8 dígitos.
 */
export function formatReceiptNumber(
  series: string | null | undefined,
  number: number | null | undefined,
  padding = 8,
): string | null {
  if (!series || number === null || number === undefined) return null;
  return `${series}-${number.toString().padStart(padding, '0')}`;
}

/**
 * Genera el correlativo formateado (sin la serie). Útil para impresión PDF
 * o para mostrar solo el número en UI compactas.
 */
export function formatCorrelative(
  number: number | null | undefined,
  padding = 8,
): string | null {
  if (number === null || number === undefined) return null;
  return number.toString().padStart(padding, '0');
}

export const FiscalMath = {
  round2,
  splitGross,
  addIgv,
  lineBreakdownGross,
  computeOrderBreakdown,
  formatReceiptNumber,
  formatCorrelative,
};

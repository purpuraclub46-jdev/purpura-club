/**
 * Espejo cliente de la regla del Membership Engine para participaciones
 * automáticas en sorteos. Fuente de verdad:
 *   `apps/api/src/modules/memberships/membership.constants.ts`
 *   `apps/api/src/modules/memberships/membership.helpers.ts` →
 *     `computePurchaseEntries`
 *
 * Regla: floor(total / 25) si total >= 25 (PEN, gross con IGV).
 * Mantener sincronizado manualmente — si el backend cambia el monto/umbral,
 * actualizar acá también.
 */

/** Compra mínima (PEN, gross) que activa la membresía y otorga tickets. */
export const MIN_PURCHASE_FOR_TICKETS = 25;

/** Monto (PEN, gross) que cada participación automática "consume". */
export const AMOUNT_PER_TICKET = 25;

/** Cuántos tickets otorga la compra actual. */
export function computePurchaseTickets(grossTotal: number): number {
  if (!Number.isFinite(grossTotal) || grossTotal < MIN_PURCHASE_FOR_TICKETS) {
    return 0;
  }
  return Math.floor(grossTotal / AMOUNT_PER_TICKET);
}

/**
 * Monto que falta para sumar el siguiente ticket. Devuelve 0 si la compra
 * actual está exactamente alineada al múltiplo o si aún no llega al mínimo
 * (en ese caso el caller debe mostrar "Te faltan S/X para tu primer ticket").
 */
export function amountToNextTicket(grossTotal: number): number {
  if (!Number.isFinite(grossTotal) || grossTotal < 0) return AMOUNT_PER_TICKET;
  if (grossTotal < MIN_PURCHASE_FOR_TICKETS) {
    return MIN_PURCHASE_FOR_TICKETS - grossTotal;
  }
  const remainder = grossTotal % AMOUNT_PER_TICKET;
  if (remainder === 0) return AMOUNT_PER_TICKET;
  return AMOUNT_PER_TICKET - remainder;
}

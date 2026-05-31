/**
 * Reglas de negocio del Membership Engine Púrpura Club.
 * Mantener centralizadas para facilitar campañas y ajustes futuros.
 */

/** Compra mínima (PEN) que activa o renueva la membresía. */
export const MIN_PURCHASE_TO_ACTIVATE = 25;

/** Duración base de una membresía cuando se activa o se renueva. */
export const MEMBERSHIP_DURATION_DAYS = 30;

/** Monto (PEN) que cada participación automática "consume". */
export const PURCHASE_AMOUNT_PER_ENTRY = 25;

/**
 * Descuento adicional aplicado a miembros sobre el precio de oferta.
 * Reflejado en `apps/api/src/common/utils/pricing.util.ts`.
 */
export const MEMBER_EXTRA_DISCOUNT_PERCENTAGE = 10;

/** Días antes del vencimiento en los que se envían recordatorios automáticos. */
export const EXPIRATION_REMINDER_DAYS = [7, 3, 1] as const;

/**
 * Descuento porcentual aplicado al precio público de un ticket de sorteo
 * para socios activos del Púrpura Club (F2.7-B).
 *
 * Regla oficial del cliente: 50 % fijo. NO depende de la rifa, NO depende
 * de la categoría, NO depende de promociones. Solo de la membresía activa.
 *
 * Esta constante es la fuente única de verdad: `RafflePricingService` la
 * lee para resolver `memberPrice = round2(publicPrice * (1 - p/100))`.
 */
export const RAFFLE_MEMBER_DISCOUNT_PERCENTAGE = 50;

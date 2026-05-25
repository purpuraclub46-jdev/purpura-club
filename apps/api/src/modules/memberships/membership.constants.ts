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

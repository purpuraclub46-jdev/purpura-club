/**
 * Cálculo de precios derivados para productos.
 * Refleja la lógica del backend en `apps/api/src/common/utils/pricing.util.ts`.
 *
 * Regla de negocio Púrpura Club:
 *   - Si la oferta está activa Y la fecha actual está dentro de la ventana,
 *     se aplica el porcentaje de descuento sobre el precio normal.
 *   - El descuento exclusivo de miembros (10 %) SOLO se aplica si la oferta
 *     está vigente. Sin oferta no hay precio miembro.
 */

export const MEMBER_EXTRA_DISCOUNT = 0.1;

export interface PricingInput {
  price: number;
  discountPercentage: number | null;
  discountActive: boolean;
  discountStartsAt?: string | Date | null;
  discountEndsAt?: string | Date | null;
}

export interface PricingResult {
  price: number;
  discountPercentage: number | null;
  discountActive: boolean;
  salePrice: number | null;
  memberPrice: number | null;
  finalPrice: number;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

const toDate = (value: string | Date | null | undefined): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
};

export function computePricing(
  input: PricingInput,
  { isMember = false, now = new Date() }: { isMember?: boolean; now?: Date } = {},
): PricingResult {
  const start = toDate(input.discountStartsAt);
  const end = toDate(input.discountEndsAt);
  const withinWindow = (!start || start <= now) && (!end || end >= now);

  const pct = input.discountPercentage;
  const hasActive =
    input.discountActive &&
    pct !== null &&
    pct > 0 &&
    pct <= 100 &&
    withinWindow;

  if (!hasActive) {
    return {
      price: input.price,
      discountPercentage: pct,
      discountActive: false,
      salePrice: null,
      memberPrice: null,
      finalPrice: input.price,
    };
  }

  const sale = round2(input.price * (1 - pct! / 100));
  const member = isMember ? round2(sale * (1 - MEMBER_EXTRA_DISCOUNT)) : null;

  return {
    price: input.price,
    discountPercentage: pct,
    discountActive: true,
    salePrice: sale,
    memberPrice: member,
    finalPrice: member ?? sale,
  };
}

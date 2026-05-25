import { Prisma } from '@prisma/client';

/**
 * Descuento adicional aplicado a miembros activos del Púrpura Club
 * sobre el precio de oferta. Solo se aplica si el producto tiene oferta activa.
 */
export const MEMBER_EXTRA_DISCOUNT = 0.1; // 10 %

export interface ProductDiscountInput {
  price: Prisma.Decimal | number | string;
  discountPercentage:
    | Prisma.Decimal
    | number
    | string
    | null
    | undefined;
  discountActive: boolean;
  discountStartsAt?: Date | null;
  discountEndsAt?: Date | null;
}

export interface ProductPricing {
  /** Precio normal sin descuentos. */
  price: number;
  /** Porcentaje configurado (0-100). null si no aplica. */
  discountPercentage: number | null;
  /** Indica si el descuento está vigente AHORA (estado + ventana de fechas). */
  discountActive: boolean;
  /** Precio resultante con descuento aplicado. null si no hay oferta vigente. */
  salePrice: number | null;
  /**
   * Precio para miembros (10 % adicional sobre salePrice).
   * Solo es != null cuando el solicitante es miembro Y la oferta está vigente.
   */
  memberPrice: number | null;
  /**
   * Precio final que se cobraría al solicitante:
   *   - miembro con oferta vigente → memberPrice
   *   - cliente con oferta vigente → salePrice
   *   - sin oferta vigente → price
   */
  finalPrice: number;
}

const toNumber = (value: Prisma.Decimal | number | string): number => {
  if (value instanceof Prisma.Decimal) return value.toNumber();
  return Number(value);
};

const round2 = (value: number): number => Math.round(value * 100) / 100;

/**
 * Calcula los precios derivados de un producto según la configuración de oferta
 * y si el solicitante es miembro Púrpura Club. Es totalmente determinístico —
 * el cliente puede llamar a esto en cualquier momento sin consultar la BD.
 */
export function computeProductPricing(
  input: ProductDiscountInput,
  options: { isMember?: boolean; now?: Date } = {},
): ProductPricing {
  const now = options.now ?? new Date();
  const isMember = options.isMember ?? false;
  const price = toNumber(input.price);
  const pct =
    input.discountPercentage === null || input.discountPercentage === undefined
      ? null
      : toNumber(input.discountPercentage);

  const withinWindow =
    (!input.discountStartsAt || input.discountStartsAt <= now) &&
    (!input.discountEndsAt || input.discountEndsAt >= now);

  const hasActive =
    input.discountActive &&
    pct !== null &&
    pct > 0 &&
    pct <= 100 &&
    withinWindow;

  if (!hasActive) {
    return {
      price,
      discountPercentage: pct,
      discountActive: false,
      salePrice: null,
      memberPrice: null,
      finalPrice: price,
    };
  }

  const sale = round2(price * (1 - pct! / 100));
  const member = isMember
    ? round2(sale * (1 - MEMBER_EXTRA_DISCOUNT))
    : null;

  return {
    price,
    discountPercentage: pct,
    discountActive: true,
    salePrice: sale,
    memberPrice: member,
    finalPrice: member ?? sale,
  };
}

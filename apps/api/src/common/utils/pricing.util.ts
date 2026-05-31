import { CategoryGroup, Prisma } from '@prisma/client';
import { MEMBER_EXTRA_DISCOUNT_PERCENTAGE } from '../../modules/memberships/membership.constants';

/**
 * Descuento adicional aplicado a socios activos del Púrpura Club.
 * Se ADICIONA al porcentaje de la promoción vigente (no se aplica de forma
 * secuencial). Ej. promo 20 % + socio 10 % → 30 % total. Si no hay promoción
 * vigente, el beneficio no aplica (regla F2.7-A G7).
 *
 * Fuente única de verdad: `membership.constants.MEMBER_EXTRA_DISCOUNT_PERCENTAGE`.
 */

/**
 * Categorías habilitadas para el descuento adicional de socio (F2.7-A G8).
 * El cliente excluye explícitamente ACCESORIOS — solo Joyería y Perfumes
 * acumulan el beneficio Club sobre la promoción.
 */
export const MEMBER_DISCOUNT_ELIGIBLE_CATEGORY_GROUPS: ReadonlySet<CategoryGroup> =
  new Set<CategoryGroup>([CategoryGroup.JOYERIA, CategoryGroup.PERFUMES]);

export interface ProductDiscountInput {
  price: Prisma.Decimal | number | string;
  discountPercentage: Prisma.Decimal | number | string | null | undefined;
  discountActive: boolean;
  discountStartsAt?: Date | null;
  discountEndsAt?: Date | null;
}

export interface ProductPricing {
  /** Precio normal sin descuentos. */
  price: number;
  /** Porcentaje configurado en la promoción (0-100). null si no aplica. */
  discountPercentage: number | null;
  /** Indica si la promoción está vigente AHORA (estado + ventana de fechas). */
  discountActive: boolean;
  /** Precio resultante con la promoción aplicada. null si no hay oferta vigente. */
  salePrice: number | null;
  /**
   * Porcentaje efectivo para socios (promo + bonus club, cap 100).
   * Solo es != null cuando aplica el beneficio (oferta vigente, socio activo,
   * y categoría elegible).
   */
  memberDiscountPercentage: number | null;
  /**
   * Precio para socios (G7: promo + 10 % adicional, sumado, no secuencial).
   * Solo es != null cuando aplica el beneficio.
   */
  memberPrice: number | null;
  /**
   * Precio final que se cobraría al solicitante:
   *   - socio elegible con oferta vigente → memberPrice
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

export interface ComputePricingOptions {
  /** El comprador es socio activo del Púrpura Club. */
  isMember?: boolean;
  /**
   * El producto está en una categoría elegible (Joyería o Perfumes). Si se
   * omite, se asume `true` por compatibilidad — los callers reales deben
   * computarlo con `isProductMemberEligible(...)` para respetar G8.
   */
  memberDiscountEligible?: boolean;
  /** Para tests deterministas. */
  now?: Date;
}

/**
 * Calcula los precios derivados de un producto. Determinístico — el cliente
 * puede llamar a esto en cualquier momento sin consultar la BD.
 *
 * Reglas Púrpura Club (F2.7-A):
 *   - Sin promoción vigente → precio normal, sin beneficio socio.
 *   - Con promoción vigente + socio + categoría elegible → promo + 10 %
 *     ADITIVO sobre el porcentaje, aplicado al precio base original.
 *   - Cap del descuento total al 100 %.
 */
export function computeProductPricing(
  input: ProductDiscountInput,
  options: ComputePricingOptions = {},
): ProductPricing {
  const now = options.now ?? new Date();
  const isMember = options.isMember ?? false;
  const memberDiscountEligible = options.memberDiscountEligible ?? true;

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
    // Sin promoción vigente: el beneficio Club NO aplica.
    return {
      price,
      discountPercentage: pct,
      discountActive: false,
      salePrice: null,
      memberDiscountPercentage: null,
      memberPrice: null,
      finalPrice: price,
    };
  }

  // `pct` ya pasó las validaciones en `hasActive` (no null, > 0, <= 100).
  const salePct = pct;
  const sale = round2(price * (1 - salePct / 100));

  const memberEligible = isMember && memberDiscountEligible;
  if (!memberEligible) {
    return {
      price,
      discountPercentage: salePct,
      discountActive: true,
      salePrice: sale,
      memberDiscountPercentage: null,
      memberPrice: null,
      finalPrice: sale,
    };
  }

  // G7: el beneficio Club incrementa la promoción (no es secuencial).
  const memberPct = Math.min(salePct + MEMBER_EXTRA_DISCOUNT_PERCENTAGE, 100);
  const member = round2(price * (1 - memberPct / 100));

  return {
    price,
    discountPercentage: salePct,
    discountActive: true,
    salePrice: sale,
    memberDiscountPercentage: memberPct,
    memberPrice: member,
    finalPrice: member,
  };
}

/**
 * Determina si un producto califica para el beneficio de socio según sus
 * categorías (G8). Devuelve `true` si al menos una de sus categorías tiene
 * `group` en `MEMBER_DISCOUNT_ELIGIBLE_CATEGORY_GROUPS`.
 *
 * Acepta cualquier shape que incluya `categories: [{ category: { group } }]`
 * para evitar acoplar el helper a un tipo específico de Prisma include.
 */
export function isProductMemberEligible(
  categoryRelations: ReadonlyArray<{ category: { group: CategoryGroup } }>,
): boolean {
  if (!categoryRelations || categoryRelations.length === 0) return false;
  for (const rel of categoryRelations) {
    if (MEMBER_DISCOUNT_ELIGIBLE_CATEGORY_GROUPS.has(rel.category.group)) {
      return true;
    }
  }
  return false;
}

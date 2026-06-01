import type { CategoryGroup, ProductEntity } from "@/types/api";

/**
 * F2.7-D — Espejo TS de `isProductMemberEligible` (apps/api).
 *
 * Determina si un producto califica para el beneficio +10% socio. La regla
 * vive en backend (`apps/api/src/common/utils/pricing.util.ts`) — esto sólo
 * decide si la UI muestra el badge "+10% Club" y el breakdown extendido.
 *
 * Reglas:
 *   - JOYERIA → elegible
 *   - PERFUMES → elegible
 *   - ACCESORIOS → NO elegible
 *
 * Basta con UNA categoría elegible para que todo el producto califique.
 *
 * Si el backend no envió `group` (legacy o productos sin categoría),
 * devolvemos false — la pérdida es solo UX (no se muestra el badge),
 * el pricing real lo decide el backend.
 */

const ELIGIBLE_GROUPS = new Set<CategoryGroup>(["JOYERIA", "PERFUMES"]);

export function isProductClubEligible(product: ProductEntity): boolean {
  if (!product.categories || product.categories.length === 0) return false;
  return product.categories.some((c) => ELIGIBLE_GROUPS.has(c.group));
}

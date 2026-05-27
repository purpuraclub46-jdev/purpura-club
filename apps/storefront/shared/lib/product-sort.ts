/**
 * Source of truth de los criterios de orden del catálogo. El backend acepta
 * un set chico de pares `<campo>:<dirección>` (ver `ProductSort` en
 * `apps/api/src/modules/products/dto/product-query.dto.ts`). El storefront
 * usa llaves amigables para URLs/UI y traduce al borde de la red.
 *
 * Reglas:
 *  - URL guarda la llave amigable (`?sort=price-low`), no la del backend.
 *  - Una llave inválida o ausente cae a `DEFAULT_PRODUCT_SORT_KEY` en UI
 *    y a `DEFAULT_PRODUCT_SORT_BACKEND` en la request, sin romper.
 *  - El input del backend NUNCA se construye a mano: usar
 *    `mapProductSortToBackend()`.
 */

export type ProductSortBackend =
  | "createdAt:desc"
  | "createdAt:asc"
  | "name:asc"
  | "name:desc"
  | "price:asc"
  | "price:desc";

export type ProductSortKey =
  | "newest"
  | "oldest"
  | "price-low"
  | "price-high"
  | "name-asc"
  | "name-desc";

interface ProductSortOption {
  key: ProductSortKey;
  label: string;
  backend: ProductSortBackend;
}

export const PRODUCT_SORT_OPTIONS: readonly ProductSortOption[] = [
  { key: "newest", label: "Más recientes", backend: "createdAt:desc" },
  { key: "oldest", label: "Más antiguos", backend: "createdAt:asc" },
  { key: "price-low", label: "Precio: menor a mayor", backend: "price:asc" },
  { key: "price-high", label: "Precio: mayor a menor", backend: "price:desc" },
  { key: "name-asc", label: "Nombre: A → Z", backend: "name:asc" },
  { key: "name-desc", label: "Nombre: Z → A", backend: "name:desc" },
];

const KEY_TO_BACKEND = new Map<ProductSortKey, ProductSortBackend>(
  PRODUCT_SORT_OPTIONS.map((o) => [o.key, o.backend]),
);

export const DEFAULT_PRODUCT_SORT_KEY: ProductSortKey = "newest";
export const DEFAULT_PRODUCT_SORT_BACKEND: ProductSortBackend = "createdAt:desc";

/**
 * Normaliza un valor crudo (URL param, formulario, etc.) a una llave válida.
 * Cualquier valor desconocido cae al default sin lanzar.
 */
export function normalizeProductSortKey(
  raw: string | null | undefined,
): ProductSortKey {
  if (raw && KEY_TO_BACKEND.has(raw as ProductSortKey)) {
    return raw as ProductSortKey;
  }
  return DEFAULT_PRODUCT_SORT_KEY;
}

/**
 * Traduce una llave de UI al valor exacto que acepta el backend
 * (`ProductSort`). Si recibe algo desconocido devuelve el default backend
 * para no romper la request.
 */
export function mapProductSortToBackend(
  key: ProductSortKey | string | null | undefined,
): ProductSortBackend {
  if (!key) return DEFAULT_PRODUCT_SORT_BACKEND;
  return KEY_TO_BACKEND.get(key as ProductSortKey) ?? DEFAULT_PRODUCT_SORT_BACKEND;
}

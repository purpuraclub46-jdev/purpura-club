import type { InventoryLocationType } from "@/types/api";

export interface ProductImage {
  id: string;
  url: string;
  order: number;
}

export interface ProductVariant {
  id: string;
  name: string;
  value: string;
}

export interface ProductCategoryRef {
  id: string;
  name: string;
  slug: string;
}

export interface ProductInventorySummary {
  totalStock: number;
  totalReserved: number;
}

export interface ProductAvailabilityEntry {
  inventoryLocationId: string;
  locationName: string;
  locationSlug: string;
  locationType: InventoryLocationType;
  active: boolean;
  stock: number;
  minimumStock: number;
}

export interface ProductEntity {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sku: string;
  barcode: string | null;
  price: number;
  cost: number;
  /** Porcentaje configurado (0-100). null si no aplica. */
  discountPercentage: number | null;
  /** true si está activado Y la ventana de fechas vigente. */
  discountActive: boolean;
  discountStartsAt: string | null;
  discountEndsAt: string | null;
  /** Precio resultante con descuento aplicado. null si no hay oferta vigente. */
  salePrice: number | null;
  /** Precio con descuento adicional del Club. Solo != null si miembro Y oferta vigente. */
  memberPrice: number | null;
  /** Precio final visible al solicitante actual (memberPrice ?? salePrice ?? price). */
  finalPrice: number;
  featured: boolean;
  active: boolean;
  images: ProductImage[];
  variants: ProductVariant[];
  categories: ProductCategoryRef[];
  availability: ProductAvailabilityEntry[];
  inventory: ProductInventorySummary;
  createdAt: string;
  updatedAt: string;
}

export type ProductSort =
  | "createdAt:desc"
  | "createdAt:asc"
  | "name:asc"
  | "name:desc"
  | "price:asc"
  | "price:desc";

export interface ProductListQuery {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  inventoryLocationId?: string;
  active?: boolean;
  featured?: boolean;
  sort?: ProductSort;
}

export interface ProductImagePayload {
  url: string;
  order: number;
}

export interface ProductVariantPayload {
  name: string;
  value: string;
}

export interface ProductAvailabilityPayload {
  inventoryLocationId: string;
  active?: boolean;
  /** Solo se usa al crear el producto. En update se ignora. */
  initialStock?: number;
  minimumStock?: number;
}

export interface CreateProductPayload {
  name: string;
  slug?: string;
  description?: string;
  sku: string;
  barcode?: string;
  price: number;
  cost?: number;
  discountPercentage?: number;
  discountActive?: boolean;
  discountStartsAt?: string;
  discountEndsAt?: string;
  featured?: boolean;
  active?: boolean;
  categoryIds?: string[];
  images?: ProductImagePayload[];
  variants?: ProductVariantPayload[];
  availability?: ProductAvailabilityPayload[];
}

export type UpdateProductPayload = Partial<CreateProductPayload>;

export const PRODUCT_SORT_LABEL: Record<ProductSort, string> = {
  "createdAt:desc": "Más recientes",
  "createdAt:asc": "Más antiguos",
  "name:asc": "Nombre (A-Z)",
  "name:desc": "Nombre (Z-A)",
  "price:asc": "Precio (menor a mayor)",
  "price:desc": "Precio (mayor a menor)",
};

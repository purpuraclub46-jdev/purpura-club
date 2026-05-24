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

export interface ProductEntity {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sku: string;
  barcode: string | null;
  price: number;
  memberPrice: number;
  cost: number;
  featured: boolean;
  active: boolean;
  images: ProductImage[];
  variants: ProductVariant[];
  categories: ProductCategoryRef[];
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

export interface CreateProductPayload {
  name: string;
  slug?: string;
  description?: string;
  sku: string;
  barcode?: string;
  price: number;
  memberPrice: number;
  cost?: number;
  featured?: boolean;
  active?: boolean;
  categoryIds?: string[];
  images?: ProductImagePayload[];
  variants?: ProductVariantPayload[];
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

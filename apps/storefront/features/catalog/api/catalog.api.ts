"use client";

import { httpClient, unwrap } from "@/services/http/client";
import {
  mapProductSortToBackend,
  type ProductSortKey,
} from "@/shared/lib/product-sort";
import type {
  ApiResponse,
  CategoryEntity,
  InventoryLocationEntity,
  Paginated,
  ProductEntity,
} from "@/types/api";

export interface ProductListQuery {
  page?: number;
  limit?: number;
  search?: string;
  featured?: boolean;
  /**
   * Cuando es `true`, el backend filtra a productos con oferta vigente
   * (discountActive + discountPercentage>0 + ventana de fechas). Lo usa
   * la sección "Ofertas del momento" del home.
   */
  discounted?: boolean;
  categoryId?: string;
  /**
   * Llave amigable de UI. Se traduce a la enum del backend
   * (`createdAt:desc`, `price:asc`, ...) antes de enviar la request.
   * Valores desconocidos caen al default backend (`createdAt:desc`).
   */
  sort?: ProductSortKey;
}

export const catalogApi = {
  listProducts: async (
    query: ProductListQuery = {},
  ): Promise<Paginated<ProductEntity>> => {
    const { sort, ...rest } = query;
    const params = {
      ...rest,
      ...(sort !== undefined ? { sort: mapProductSortToBackend(sort) } : {}),
    };
    const { data } = await httpClient.get<
      ApiResponse<Paginated<ProductEntity>>
    >("/products", { params });
    return unwrap(data);
  },

  productBySlug: async (slug: string): Promise<ProductEntity> => {
    const { data } = await httpClient.get<ApiResponse<ProductEntity>>(
      `/products/slug/${slug}`,
    );
    return unwrap(data);
  },

  listCategories: async (): Promise<CategoryEntity[]> => {
    const { data } = await httpClient.get<
      ApiResponse<Paginated<CategoryEntity>>
    >("/categories", { params: { limit: 100, active: true } });
    return unwrap(data).items;
  },

  /**
   * Selección aleatoria de productos para el "showcase curado" del home.
   * El backend hace `ORDER BY random()` así que cada llamada devuelve un
   * subset distinto. Limit por defecto 12 (cap 30 en backend).
   */
  randomForHome: async (limit = 12): Promise<ProductEntity[]> => {
    const { data } = await httpClient.get<ApiResponse<ProductEntity[]>>(
      "/products/random-home",
      { params: { limit } },
    );
    return unwrap(data);
  },

  listPublicStores: async (): Promise<InventoryLocationEntity[]> => {
    const { data } = await httpClient.get<
      ApiResponse<InventoryLocationEntity[]>
    >("/inventory-locations/public/stores");
    return unwrap(data);
  },
};

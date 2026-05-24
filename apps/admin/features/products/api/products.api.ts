import { httpClient, unwrap } from "@/services/http/client";
import type { ApiResponse, Paginated } from "@/types/api";
import type {
  CreateProductPayload,
  ProductEntity,
  ProductListQuery,
  UpdateProductPayload,
} from "../types";

export const productsApi = {
  listAdmin: async (
    query: ProductListQuery = {},
  ): Promise<Paginated<ProductEntity>> => {
    const { data } = await httpClient.get<
      ApiResponse<Paginated<ProductEntity>>
    >("/products/admin/all", { params: query });
    return unwrap(data);
  },

  getAdmin: async (id: string): Promise<ProductEntity> => {
    const { data } = await httpClient.get<ApiResponse<ProductEntity>>(
      `/products/admin/${id}`,
    );
    return unwrap(data);
  },

  create: async (payload: CreateProductPayload): Promise<ProductEntity> => {
    const { data } = await httpClient.post<ApiResponse<ProductEntity>>(
      "/products",
      payload,
    );
    return unwrap(data);
  },

  update: async (
    id: string,
    payload: UpdateProductPayload,
  ): Promise<ProductEntity> => {
    const { data } = await httpClient.patch<ApiResponse<ProductEntity>>(
      `/products/${id}`,
      payload,
    );
    return unwrap(data);
  },

  remove: async (id: string): Promise<void> => {
    await httpClient.delete(`/products/${id}`);
  },
};

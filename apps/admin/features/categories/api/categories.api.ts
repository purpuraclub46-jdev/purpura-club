import { httpClient, unwrap } from "@/services/http/client";
import type { ApiResponse, Paginated } from "@/types/api";
import type {
  CategoryEntity,
  CategoryListQuery,
  CreateCategoryPayload,
  UpdateCategoryPayload,
} from "../types";

export const categoriesApi = {
  listAdmin: async (
    query: CategoryListQuery = {},
  ): Promise<Paginated<CategoryEntity>> => {
    const { data } = await httpClient.get<
      ApiResponse<Paginated<CategoryEntity>>
    >("/categories/admin/all", { params: query });
    return unwrap(data);
  },

  getAdmin: async (id: string): Promise<CategoryEntity> => {
    const { data } = await httpClient.get<ApiResponse<CategoryEntity>>(
      `/categories/admin/${id}`,
    );
    return unwrap(data);
  },

  create: async (payload: CreateCategoryPayload): Promise<CategoryEntity> => {
    const { data } = await httpClient.post<ApiResponse<CategoryEntity>>(
      "/categories",
      payload,
    );
    return unwrap(data);
  },

  update: async (
    id: string,
    payload: UpdateCategoryPayload,
  ): Promise<CategoryEntity> => {
    const { data } = await httpClient.patch<ApiResponse<CategoryEntity>>(
      `/categories/${id}`,
      payload,
    );
    return unwrap(data);
  },

  remove: async (id: string): Promise<void> => {
    await httpClient.delete(`/categories/${id}`);
  },
};

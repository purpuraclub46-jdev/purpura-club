import { httpClient, unwrap } from "@/services/http/client";
import type { ApiResponse } from "@/types/api";
import type {
  HomeCategoryEntity,
  HomeCategorySlot,
  UpdateHomeCategoryPayload,
} from "../types";

export const homeCategoriesApi = {
  listAdmin: async (): Promise<HomeCategoryEntity[]> => {
    const { data } = await httpClient.get<ApiResponse<HomeCategoryEntity[]>>(
      "/home-categories/admin/all",
    );
    return unwrap(data);
  },

  getAdmin: async (slot: HomeCategorySlot): Promise<HomeCategoryEntity> => {
    const { data } = await httpClient.get<ApiResponse<HomeCategoryEntity>>(
      `/home-categories/admin/${slot}`,
    );
    return unwrap(data);
  },

  update: async (
    slot: HomeCategorySlot,
    payload: UpdateHomeCategoryPayload,
  ): Promise<HomeCategoryEntity> => {
    const { data } = await httpClient.patch<ApiResponse<HomeCategoryEntity>>(
      `/home-categories/${slot}`,
      payload,
    );
    return unwrap(data);
  },
};

import { httpClient, unwrap } from "@/services/http/client";
import type { ApiResponse } from "@/types/api";
import type {
  CreateHomeStorePayload,
  HomeStoreEntity,
  UpdateHomeStorePayload,
} from "../types";

export const homeStoresApi = {
  listAdmin: async (): Promise<HomeStoreEntity[]> => {
    const { data } = await httpClient.get<ApiResponse<HomeStoreEntity[]>>(
      "/home-stores/admin/all",
    );
    return unwrap(data);
  },

  getAdmin: async (id: string): Promise<HomeStoreEntity> => {
    const { data } = await httpClient.get<ApiResponse<HomeStoreEntity>>(
      `/home-stores/admin/${id}`,
    );
    return unwrap(data);
  },

  create: async (payload: CreateHomeStorePayload): Promise<HomeStoreEntity> => {
    const { data } = await httpClient.post<ApiResponse<HomeStoreEntity>>(
      "/home-stores",
      payload,
    );
    return unwrap(data);
  },

  update: async (
    id: string,
    payload: UpdateHomeStorePayload,
  ): Promise<HomeStoreEntity> => {
    const { data } = await httpClient.patch<ApiResponse<HomeStoreEntity>>(
      `/home-stores/${id}`,
      payload,
    );
    return unwrap(data);
  },

  remove: async (id: string): Promise<void> => {
    await httpClient.delete(`/home-stores/${id}`);
  },
};

import { httpClient, unwrap } from "@/services/http/client";
import type { ApiResponse, Paginated } from "@/types/api";
import type {
  CreateLocationPayload,
  LocationEntity,
  LocationListQuery,
  UpdateLocationPayload,
} from "../types";

export const locationsApi = {
  list: async (
    query: LocationListQuery = {},
  ): Promise<Paginated<LocationEntity>> => {
    const { data } = await httpClient.get<
      ApiResponse<Paginated<LocationEntity>>
    >("/inventory-locations", { params: query });
    return unwrap(data);
  },

  get: async (id: string): Promise<LocationEntity> => {
    const { data } = await httpClient.get<ApiResponse<LocationEntity>>(
      `/inventory-locations/${id}`,
    );
    return unwrap(data);
  },

  create: async (payload: CreateLocationPayload): Promise<LocationEntity> => {
    const { data } = await httpClient.post<ApiResponse<LocationEntity>>(
      "/inventory-locations",
      payload,
    );
    return unwrap(data);
  },

  update: async (
    id: string,
    payload: UpdateLocationPayload,
  ): Promise<LocationEntity> => {
    const { data } = await httpClient.patch<ApiResponse<LocationEntity>>(
      `/inventory-locations/${id}`,
      payload,
    );
    return unwrap(data);
  },

  remove: async (id: string): Promise<void> => {
    await httpClient.delete(`/inventory-locations/${id}`);
  },
};

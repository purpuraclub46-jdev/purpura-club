import { httpClient, unwrap } from "@/services/http/client";
import type { ApiResponse, Paginated } from "@/types/api";
import type {
  BranchEntity,
  BranchListQuery,
  CreateBranchPayload,
  UpdateBranchPayload,
} from "../types";

export const branchesApi = {
  list: async (
    query: BranchListQuery = {},
  ): Promise<Paginated<BranchEntity>> => {
    const { data } = await httpClient.get<ApiResponse<Paginated<BranchEntity>>>(
      "/branches",
      { params: query },
    );
    return unwrap(data);
  },

  get: async (id: string): Promise<BranchEntity> => {
    const { data } = await httpClient.get<ApiResponse<BranchEntity>>(
      `/branches/${id}`,
    );
    return unwrap(data);
  },

  create: async (payload: CreateBranchPayload): Promise<BranchEntity> => {
    const { data } = await httpClient.post<ApiResponse<BranchEntity>>(
      "/branches",
      payload,
    );
    return unwrap(data);
  },

  update: async (
    id: string,
    payload: UpdateBranchPayload,
  ): Promise<BranchEntity> => {
    const { data } = await httpClient.patch<ApiResponse<BranchEntity>>(
      `/branches/${id}`,
      payload,
    );
    return unwrap(data);
  },

  remove: async (id: string): Promise<void> => {
    await httpClient.delete(`/branches/${id}`);
  },
};

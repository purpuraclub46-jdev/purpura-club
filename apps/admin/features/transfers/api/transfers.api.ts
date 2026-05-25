import { httpClient, unwrap } from "@/services/http/client";
import type { ApiResponse, Paginated } from "@/types/api";
import type {
  CreateTransferPayload,
  TransferEntity,
  TransferListQuery,
} from "../types";

export const transfersApi = {
  list: async (
    query: TransferListQuery = {},
  ): Promise<Paginated<TransferEntity>> => {
    const { data } = await httpClient.get<
      ApiResponse<Paginated<TransferEntity>>
    >("/inventory-transfers", { params: query });
    return unwrap(data);
  },

  get: async (id: string): Promise<TransferEntity> => {
    const { data } = await httpClient.get<ApiResponse<TransferEntity>>(
      `/inventory-transfers/${id}`,
    );
    return unwrap(data);
  },

  create: async (payload: CreateTransferPayload): Promise<TransferEntity> => {
    const { data } = await httpClient.post<ApiResponse<TransferEntity>>(
      "/inventory-transfers",
      payload,
    );
    return unwrap(data);
  },

  complete: async (id: string): Promise<TransferEntity> => {
    const { data } = await httpClient.post<ApiResponse<TransferEntity>>(
      `/inventory-transfers/${id}/complete`,
    );
    return unwrap(data);
  },

  cancel: async (id: string): Promise<TransferEntity> => {
    const { data } = await httpClient.post<ApiResponse<TransferEntity>>(
      `/inventory-transfers/${id}/cancel`,
    );
    return unwrap(data);
  },
};

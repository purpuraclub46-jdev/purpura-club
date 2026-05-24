import { httpClient, unwrap } from "@/services/http/client";
import type { ApiResponse, Paginated } from "@/types/api";
import type {
  CreateRafflePayload,
  RaffleEntity,
  RaffleListQuery,
  UpdateRafflePayload,
} from "../types";

export const rafflesApi = {
  listAdmin: async (
    query: RaffleListQuery = {},
  ): Promise<Paginated<RaffleEntity>> => {
    const { data } = await httpClient.get<ApiResponse<Paginated<RaffleEntity>>>(
      "/raffles/admin/all",
      { params: query },
    );
    return unwrap(data);
  },

  getAdmin: async (id: string): Promise<RaffleEntity> => {
    const { data } = await httpClient.get<ApiResponse<RaffleEntity>>(
      `/raffles/admin/${id}`,
    );
    return unwrap(data);
  },

  create: async (payload: CreateRafflePayload): Promise<RaffleEntity> => {
    const { data } = await httpClient.post<ApiResponse<RaffleEntity>>(
      "/raffles",
      payload,
    );
    return unwrap(data);
  },

  update: async (
    id: string,
    payload: UpdateRafflePayload,
  ): Promise<RaffleEntity> => {
    const { data } = await httpClient.patch<ApiResponse<RaffleEntity>>(
      `/raffles/${id}`,
      payload,
    );
    return unwrap(data);
  },

  remove: async (id: string): Promise<void> => {
    await httpClient.delete(`/raffles/${id}`);
  },

  publish: async (id: string): Promise<RaffleEntity> => {
    const { data } = await httpClient.post<ApiResponse<RaffleEntity>>(
      `/raffles/${id}/publish`,
    );
    return unwrap(data);
  },

  close: async (id: string): Promise<RaffleEntity> => {
    const { data } = await httpClient.post<ApiResponse<RaffleEntity>>(
      `/raffles/${id}/close`,
    );
    return unwrap(data);
  },
};

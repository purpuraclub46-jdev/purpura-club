"use client";

import { httpClient, unwrap } from "@/services/http/client";
import type {
  ApiResponse,
  Paginated,
  RaffleEntity,
  RaffleEntryEntity,
} from "@/types/api";

export const rafflesApi = {
  list: async (): Promise<RaffleEntity[]> => {
    const { data } = await httpClient.get<
      ApiResponse<Paginated<RaffleEntity>>
    >("/raffles", { params: { limit: 50 } });
    return unwrap(data).items;
  },

  bySlug: async (slug: string): Promise<RaffleEntity> => {
    const { data } = await httpClient.get<ApiResponse<RaffleEntity>>(
      `/raffles/slug/${slug}`,
    );
    return unwrap(data);
  },

  myEntries: async (): Promise<RaffleEntryEntity[]> => {
    const { data } = await httpClient.get<
      ApiResponse<Paginated<RaffleEntryEntity>>
    >("/raffle-entries/me", { params: { limit: 100 } });
    return unwrap(data).items;
  },
};

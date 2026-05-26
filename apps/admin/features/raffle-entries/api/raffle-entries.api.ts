import { httpClient, unwrap } from "@/services/http/client";
import type { ApiResponse, Paginated } from "@/types/api";
import type {
  DecideEntryPayload,
  EntryListQuery,
  RaffleEntryEntity,
} from "../types";

export const raffleEntriesApi = {
  list: async (
    query: EntryListQuery = {},
  ): Promise<Paginated<RaffleEntryEntity>> => {
    const { data } = await httpClient.get<
      ApiResponse<Paginated<RaffleEntryEntity>>
    >("/raffle-entries", { params: query });
    return unwrap(data);
  },

  getById: async (id: string): Promise<RaffleEntryEntity> => {
    const { data } = await httpClient.get<ApiResponse<RaffleEntryEntity>>(
      `/raffle-entries/${id}`,
    );
    return unwrap(data);
  },

  decide: async (payload: DecideEntryPayload): Promise<RaffleEntryEntity> => {
    const { data } = await httpClient.patch<ApiResponse<RaffleEntryEntity>>(
      `/raffle-entries/${payload.entryId}/decide`,
      { decision: payload.decision },
    );
    return unwrap(data);
  },

};

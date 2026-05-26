import { httpClient, unwrap } from "@/services/http/client";
import type { ApiResponse } from "@/types/api";
import type {
  AssignWinnerPayload,
  CreatePrizePayload,
  PrizeEntity,
  PublishWinnerPayload,
  UpdatePrizePayload,
} from "../types";

export const prizesApi = {
  listByRaffle: async (raffleId: string): Promise<PrizeEntity[]> => {
    const { data } = await httpClient.get<ApiResponse<PrizeEntity[]>>(
      `/raffles/${raffleId}/prizes`,
    );
    return unwrap(data);
  },

  create: async (
    raffleId: string,
    payload: CreatePrizePayload,
  ): Promise<PrizeEntity> => {
    const { data } = await httpClient.post<ApiResponse<PrizeEntity>>(
      `/raffles/${raffleId}/prizes`,
      payload,
    );
    return unwrap(data);
  },

  update: async (
    id: string,
    payload: UpdatePrizePayload,
  ): Promise<PrizeEntity> => {
    const { data } = await httpClient.patch<ApiResponse<PrizeEntity>>(
      `/raffles/prizes/${id}`,
      payload,
    );
    return unwrap(data);
  },

  remove: async (id: string): Promise<void> => {
    await httpClient.delete(`/raffles/prizes/${id}`);
  },

  assignWinner: async (
    id: string,
    payload: AssignWinnerPayload,
  ): Promise<PrizeEntity> => {
    const { data } = await httpClient.post<ApiResponse<PrizeEntity>>(
      `/raffles/prizes/${id}/assign-winner`,
      payload,
    );
    return unwrap(data);
  },

  clearWinner: async (id: string): Promise<PrizeEntity> => {
    const { data } = await httpClient.post<ApiResponse<PrizeEntity>>(
      `/raffles/prizes/${id}/clear-winner`,
      {},
    );
    return unwrap(data);
  },

  publishWinner: async (
    id: string,
    payload: PublishWinnerPayload,
  ): Promise<PrizeEntity> => {
    const { data } = await httpClient.post<ApiResponse<PrizeEntity>>(
      `/raffles/prizes/${id}/publish`,
      payload,
    );
    return unwrap(data);
  },

  listPublishedWinners: async (): Promise<PrizeEntity[]> => {
    const { data } = await httpClient.get<ApiResponse<PrizeEntity[]>>(
      `/raffles/prizes/winners`,
    );
    return unwrap(data);
  },

  /**
   * Descarga el Excel de tickets pagados. Devuelve un objeto blob para que
   * el caller dispare el descargado vía URL temporal.
   */
  exportTicketsXlsx: async (
    raffleId: string,
  ): Promise<{ blob: Blob; filename: string }> => {
    const response = await httpClient.get<Blob>(
      `/raffles/${raffleId}/export-tickets`,
      { responseType: "blob" },
    );
    const disposition = response.headers["content-disposition"] ?? "";
    const match = /filename="?([^";]+)"?/.exec(disposition);
    return {
      blob: response.data,
      filename: match?.[1] ?? `tickets-${raffleId}.xlsx`,
    };
  },
};

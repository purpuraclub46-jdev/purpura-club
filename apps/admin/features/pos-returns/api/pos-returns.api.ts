import { httpClient, unwrap } from "@/services/http/client";
import type { ApiResponse } from "@/types/api";
import type {
  CreateCreditNotePayload,
  CreditNote,
  ReturnableOrder,
} from "../types";

export const posReturnsApi = {
  searchOrder: async (query: string): Promise<ReturnableOrder> => {
    const { data } = await httpClient.get<ApiResponse<ReturnableOrder>>(
      "/pos/credit-notes/search",
      { params: { query } },
    );
    return unwrap(data);
  },

  create: async (payload: CreateCreditNotePayload): Promise<CreditNote> => {
    const { data } = await httpClient.post<ApiResponse<CreditNote>>(
      "/pos/credit-notes",
      payload,
    );
    return unwrap(data);
  },

  listForLocation: async (
    locationId: string,
    limit = 50,
  ): Promise<CreditNote[]> => {
    const { data } = await httpClient.get<ApiResponse<CreditNote[]>>(
      `/pos/credit-notes/locations/${locationId}`,
      { params: { limit } },
    );
    return unwrap(data);
  },

  getById: async (id: string): Promise<CreditNote> => {
    const { data } = await httpClient.get<ApiResponse<CreditNote>>(
      `/pos/credit-notes/${id}`,
    );
    return unwrap(data);
  },
};

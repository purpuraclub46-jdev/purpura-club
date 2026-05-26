import { httpClient, unwrap } from "@/services/http/client";
import type { ApiResponse } from "@/types/api";
import type {
  CashRegisterSummary,
  CashSession,
  CashSessionMovement,
  CloseSessionPayload,
  CreateMovementPayload,
  CreatePosSalePayload,
  OpenSessionPayload,
  PosBootstrap,
  PosLocation,
  PosReceiptSeries,
  PosReports,
  PosSale,
} from "../types";

export const posApi = {
  // Context
  bootstrap: async (): Promise<PosBootstrap> => {
    const { data } =
      await httpClient.get<ApiResponse<PosBootstrap>>("/pos/context/bootstrap");
    return unwrap(data);
  },
  resolveLocation: async (slug: string): Promise<PosLocation> => {
    const { data } = await httpClient.get<ApiResponse<PosLocation>>(
      `/pos/context/locations/${slug}`,
    );
    return unwrap(data);
  },
  listSeries: async (locationId: string): Promise<PosReceiptSeries[]> => {
    const { data } = await httpClient.get<ApiResponse<PosReceiptSeries[]>>(
      `/pos/context/locations/${locationId}/series`,
    );
    return unwrap(data);
  },
  reports: async (locationId: string): Promise<PosReports> => {
    const { data } = await httpClient.get<ApiResponse<PosReports>>(
      `/pos/context/locations/${locationId}/reports`,
    );
    return unwrap(data);
  },

  // Cash
  listRegisters: async (
    locationId: string,
  ): Promise<CashRegisterSummary[]> => {
    const { data } = await httpClient.get<ApiResponse<CashRegisterSummary[]>>(
      `/pos/cash/locations/${locationId}/registers`,
    );
    return unwrap(data);
  },
  activeSession: async (
    locationId: string,
  ): Promise<CashSession | null> => {
    const { data } = await httpClient.get<ApiResponse<CashSession | null>>(
      `/pos/cash/locations/${locationId}/active-session`,
    );
    return unwrap(data);
  },
  getSession: async (sessionId: string): Promise<CashSession> => {
    const { data } = await httpClient.get<ApiResponse<CashSession>>(
      `/pos/cash/sessions/${sessionId}`,
    );
    return unwrap(data);
  },
  listSessions: async (
    locationId: string,
    limit = 20,
  ): Promise<CashSession[]> => {
    const { data } = await httpClient.get<ApiResponse<CashSession[]>>(
      `/pos/cash/locations/${locationId}/sessions`,
      { params: { limit } },
    );
    return unwrap(data);
  },
  openSession: async (
    locationId: string,
    payload: OpenSessionPayload,
  ): Promise<CashSession> => {
    const { data } = await httpClient.post<ApiResponse<CashSession>>(
      `/pos/cash/locations/${locationId}/sessions`,
      payload,
    );
    return unwrap(data);
  },
  closeSession: async (
    sessionId: string,
    payload: CloseSessionPayload,
  ): Promise<CashSession> => {
    const { data } = await httpClient.post<ApiResponse<CashSession>>(
      `/pos/cash/sessions/${sessionId}/close`,
      payload,
    );
    return unwrap(data);
  },
  addMovement: async (
    sessionId: string,
    payload: CreateMovementPayload,
  ): Promise<CashSessionMovement> => {
    const { data } = await httpClient.post<ApiResponse<CashSessionMovement>>(
      `/pos/cash/sessions/${sessionId}/movements`,
      payload,
    );
    return unwrap(data);
  },

  // Sales
  createSale: async (payload: CreatePosSalePayload): Promise<PosSale> => {
    const { data } = await httpClient.post<ApiResponse<PosSale>>(
      "/pos/sales",
      payload,
    );
    return unwrap(data);
  },
  recentSales: async (
    locationId: string,
    limit = 20,
  ): Promise<PosSale[]> => {
    const { data } = await httpClient.get<ApiResponse<PosSale[]>>(
      `/pos/sales/locations/${locationId}/recent`,
      { params: { limit } },
    );
    return unwrap(data);
  },
};

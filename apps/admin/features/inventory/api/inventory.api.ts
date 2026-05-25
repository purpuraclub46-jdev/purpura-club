import { httpClient, unwrap } from "@/services/http/client";
import type { ApiResponse, Paginated } from "@/types/api";
import type {
  AdjustStockPayload,
  InventoryMovementEntity,
  MovementListQuery,
  ReserveStockPayload,
  StockListQuery,
  StockRow,
  UpdateMinimumStockPayload,
} from "../types";

export const inventoryApi = {
  listStock: async (
    query: StockListQuery = {},
  ): Promise<Paginated<StockRow>> => {
    const { data } = await httpClient.get<ApiResponse<Paginated<StockRow>>>(
      "/inventory/stock",
      { params: query },
    );
    return unwrap(data);
  },

  adjust: async (payload: AdjustStockPayload): Promise<StockRow> => {
    const { data } = await httpClient.post<ApiResponse<StockRow>>(
      "/inventory/stock/adjust",
      payload,
    );
    return unwrap(data);
  },

  setMinimum: async (
    payload: UpdateMinimumStockPayload,
  ): Promise<StockRow> => {
    const { data } = await httpClient.post<ApiResponse<StockRow>>(
      "/inventory/stock/minimum",
      payload,
    );
    return unwrap(data);
  },

  reserve: async (payload: ReserveStockPayload): Promise<StockRow> => {
    const { data } = await httpClient.post<ApiResponse<StockRow>>(
      "/inventory/stock/reserve",
      payload,
    );
    return unwrap(data);
  },

  release: async (payload: ReserveStockPayload): Promise<StockRow> => {
    const { data } = await httpClient.post<ApiResponse<StockRow>>(
      "/inventory/stock/release",
      payload,
    );
    return unwrap(data);
  },

  movements: async (
    query: MovementListQuery = {},
  ): Promise<Paginated<InventoryMovementEntity>> => {
    const { data } = await httpClient.get<
      ApiResponse<Paginated<InventoryMovementEntity>>
    >("/inventory/movements", { params: query });
    return unwrap(data);
  },
};

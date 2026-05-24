import { httpClient, unwrap } from "@/services/http/client";
import type { ApiResponse, Paginated } from "@/types/api";
import type {
  AdjustStockPayload,
  InventoryListQuery,
  InventoryMovementEntity,
  InventoryRow,
  MovementListQuery,
  TransferStockPayload,
} from "../types";

export const inventoryApi = {
  list: async (
    query: InventoryListQuery = {},
  ): Promise<Paginated<InventoryRow>> => {
    const { data } = await httpClient.get<ApiResponse<Paginated<InventoryRow>>>(
      "/inventory",
      { params: query },
    );
    return unwrap(data);
  },

  adjust: async (payload: AdjustStockPayload): Promise<InventoryRow> => {
    const { data } = await httpClient.post<ApiResponse<InventoryRow>>(
      "/inventory/adjust",
      payload,
    );
    return unwrap(data);
  },

  transfer: async (payload: TransferStockPayload): Promise<void> => {
    await httpClient.post("/inventory/transfer", payload);
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

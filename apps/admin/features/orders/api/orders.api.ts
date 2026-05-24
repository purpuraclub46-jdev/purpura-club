import { httpClient, unwrap } from "@/services/http/client";
import type {
  ApiResponse,
  OrderStatus,
  Paginated,
} from "@/types/api";
import type { OrderEntity, OrderListQuery } from "../types";

export const ordersApi = {
  list: async (query: OrderListQuery = {}): Promise<Paginated<OrderEntity>> => {
    const { data } = await httpClient.get<ApiResponse<Paginated<OrderEntity>>>(
      "/orders",
      { params: query },
    );
    return unwrap(data);
  },

  get: async (id: string): Promise<OrderEntity> => {
    const { data } = await httpClient.get<ApiResponse<OrderEntity>>(
      `/orders/${id}`,
    );
    return unwrap(data);
  },

  updateStatus: async (
    id: string,
    status: OrderStatus,
  ): Promise<OrderEntity> => {
    const { data } = await httpClient.patch<ApiResponse<OrderEntity>>(
      `/orders/${id}/status`,
      { status },
    );
    return unwrap(data);
  },
};

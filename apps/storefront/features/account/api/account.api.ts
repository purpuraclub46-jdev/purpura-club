"use client";

import { httpClient, unwrap } from "@/services/http/client";
import type {
  ApiResponse,
  MembershipEntity,
  OrderEntity,
  Paginated,
} from "@/types/api";

export const accountApi = {
  myMembership: async (): Promise<MembershipEntity | null> => {
    const { data } = await httpClient.get<
      ApiResponse<MembershipEntity | null>
    >("/memberships/me");
    return unwrap(data);
  },

  myOrders: async (): Promise<OrderEntity[]> => {
    const { data } = await httpClient.get<ApiResponse<Paginated<OrderEntity>>>(
      "/orders/me",
      { params: { limit: 50 } },
    );
    return unwrap(data).items;
  },
};

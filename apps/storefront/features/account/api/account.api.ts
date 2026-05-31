"use client";

import { httpClient, unwrap } from "@/services/http/client";
import type {
  AddressEntity,
  ApiResponse,
  CreateAddressInput,
  MembershipEntity,
  OrderEntity,
  Paginated,
  UpdateAddressInput,
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

  myOrder: async (idOrNumber: string): Promise<OrderEntity> => {
    const { data } = await httpClient.get<ApiResponse<OrderEntity>>(
      `/orders/me/${encodeURIComponent(idOrNumber)}`,
    );
    return unwrap(data);
  },

  // ─── Customer addresses (F2.5) ─────────────────────────────────────────

  myAddresses: async (): Promise<AddressEntity[]> => {
    const { data } = await httpClient.get<ApiResponse<AddressEntity[]>>(
      "/customers/me/addresses",
    );
    return unwrap(data);
  },

  createAddress: async (
    input: CreateAddressInput,
  ): Promise<AddressEntity> => {
    const { data } = await httpClient.post<ApiResponse<AddressEntity>>(
      "/customers/me/addresses",
      input,
    );
    return unwrap(data);
  },

  updateAddress: async (
    id: string,
    input: UpdateAddressInput,
  ): Promise<AddressEntity> => {
    const { data } = await httpClient.patch<ApiResponse<AddressEntity>>(
      `/customers/me/addresses/${id}`,
      input,
    );
    return unwrap(data);
  },

  deleteAddress: async (id: string): Promise<void> => {
    await httpClient.delete(`/customers/me/addresses/${id}`);
  },

  setDefaultAddress: async (id: string): Promise<AddressEntity> => {
    const { data } = await httpClient.post<ApiResponse<AddressEntity>>(
      `/customers/me/addresses/${id}/default`,
    );
    return unwrap(data);
  },
};

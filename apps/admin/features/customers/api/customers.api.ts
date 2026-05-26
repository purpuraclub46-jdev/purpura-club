import { httpClient, unwrap } from "@/services/http/client";
import type { ApiResponse, Paginated } from "@/types/api";
import type {
  CreateCustomerPayload,
  CustomerDetailEntity,
  CustomerEntity,
  CustomerListQuery,
  CustomerOverviewStats,
  CustomerSearchQuery,
  UpdateCustomerPayload,
} from "../types";

export const customersApi = {
  list: async (
    query: CustomerListQuery = {},
  ): Promise<Paginated<CustomerEntity>> => {
    const { data } = await httpClient.get<
      ApiResponse<Paginated<CustomerEntity>>
    >("/customers", { params: query });
    return unwrap(data);
  },

  overview: async (): Promise<CustomerOverviewStats> => {
    const { data } = await httpClient.get<ApiResponse<CustomerOverviewStats>>(
      "/customers/overview",
    );
    return unwrap(data);
  },

  search: async (
    query: CustomerSearchQuery,
  ): Promise<CustomerEntity[]> => {
    const { data } = await httpClient.get<ApiResponse<CustomerEntity[]>>(
      "/customers/search",
      { params: query },
    );
    return unwrap(data);
  },

  lookupByDocument: async (
    documentNumber: string,
  ): Promise<CustomerEntity | null> => {
    const { data } = await httpClient.get<ApiResponse<CustomerEntity | null>>(
      `/customers/lookup/${encodeURIComponent(documentNumber)}`,
    );
    return unwrap(data);
  },

  getById: async (id: string): Promise<CustomerDetailEntity> => {
    const { data } = await httpClient.get<ApiResponse<CustomerDetailEntity>>(
      `/customers/${id}`,
    );
    return unwrap(data);
  },

  create: async (
    payload: CreateCustomerPayload,
  ): Promise<CustomerEntity> => {
    const { data } = await httpClient.post<ApiResponse<CustomerEntity>>(
      "/customers",
      payload,
    );
    return unwrap(data);
  },

  update: async (
    id: string,
    payload: UpdateCustomerPayload,
  ): Promise<CustomerEntity> => {
    const { data } = await httpClient.patch<ApiResponse<CustomerEntity>>(
      `/customers/${id}`,
      payload,
    );
    return unwrap(data);
  },

  setActive: async (id: string, active: boolean): Promise<CustomerEntity> => {
    const { data } = await httpClient.post<ApiResponse<CustomerEntity>>(
      `/customers/${id}/active`,
      { active },
    );
    return unwrap(data);
  },

  remove: async (id: string): Promise<void> => {
    await httpClient.delete(`/customers/${id}`);
  },
};

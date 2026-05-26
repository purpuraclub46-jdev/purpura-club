import { httpClient, unwrap } from "@/services/http/client";
import type { ApiResponse, Paginated } from "@/types/api";
import type {
  CreateUserPayload,
  ResetPasswordPayload,
  UpdateUserPayload,
  UserEntity,
  UserListQuery,
} from "../types";

export const usersApi = {
  list: async (
    query: UserListQuery = {},
  ): Promise<Paginated<UserEntity>> => {
    const { data } = await httpClient.get<ApiResponse<Paginated<UserEntity>>>(
      "/users",
      { params: query },
    );
    return unwrap(data);
  },

  getById: async (id: string): Promise<UserEntity> => {
    const { data } = await httpClient.get<ApiResponse<UserEntity>>(
      `/users/${id}`,
    );
    return unwrap(data);
  },

  create: async (payload: CreateUserPayload): Promise<UserEntity> => {
    const { data } = await httpClient.post<ApiResponse<UserEntity>>(
      "/users",
      payload,
    );
    return unwrap(data);
  },

  update: async (
    id: string,
    payload: UpdateUserPayload,
  ): Promise<UserEntity> => {
    const { data } = await httpClient.patch<ApiResponse<UserEntity>>(
      `/users/${id}`,
      payload,
    );
    return unwrap(data);
  },

  setActive: async (id: string, active: boolean): Promise<UserEntity> => {
    const { data } = await httpClient.post<ApiResponse<UserEntity>>(
      `/users/${id}/active`,
      { active },
    );
    return unwrap(data);
  },

  resetPassword: async (
    id: string,
    payload: ResetPasswordPayload,
  ): Promise<void> => {
    await httpClient.post(`/users/${id}/reset-password`, payload);
  },

  remove: async (id: string): Promise<void> => {
    await httpClient.delete(`/users/${id}`);
  },
};

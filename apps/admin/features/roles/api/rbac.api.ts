import { httpClient, unwrap } from "@/services/http/client";
import type { ApiResponse, Paginated } from "@/types/api";
import type {
  CreateRolePayload,
  PermissionEntity,
  RoleEntity,
  RoleListQuery,
  UpdateRolePayload,
} from "../types";

export const rbacApi = {
  // Permissions (catalog, read-only)
  listPermissions: async (): Promise<PermissionEntity[]> => {
    const { data } = await httpClient.get<ApiResponse<PermissionEntity[]>>(
      "/rbac/permissions",
    );
    return unwrap(data);
  },

  // Roles CRUD
  listRoles: async (
    query: RoleListQuery = {},
  ): Promise<Paginated<RoleEntity>> => {
    const { data } = await httpClient.get<ApiResponse<Paginated<RoleEntity>>>(
      "/rbac/roles",
      { params: query },
    );
    return unwrap(data);
  },

  getRole: async (id: string): Promise<RoleEntity> => {
    const { data } = await httpClient.get<ApiResponse<RoleEntity>>(
      `/rbac/roles/${id}`,
    );
    return unwrap(data);
  },

  createRole: async (payload: CreateRolePayload): Promise<RoleEntity> => {
    const { data } = await httpClient.post<ApiResponse<RoleEntity>>(
      "/rbac/roles",
      payload,
    );
    return unwrap(data);
  },

  updateRole: async (
    id: string,
    payload: UpdateRolePayload,
  ): Promise<RoleEntity> => {
    const { data } = await httpClient.patch<ApiResponse<RoleEntity>>(
      `/rbac/roles/${id}`,
      payload,
    );
    return unwrap(data);
  },

  setRolePermissions: async (
    id: string,
    permissionKeys: string[],
  ): Promise<RoleEntity> => {
    const { data } = await httpClient.put<ApiResponse<RoleEntity>>(
      `/rbac/roles/${id}/permissions`,
      { permissionKeys },
    );
    return unwrap(data);
  },

  removeRole: async (id: string): Promise<void> => {
    await httpClient.delete(`/rbac/roles/${id}`);
  },
};

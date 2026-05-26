"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { rbacApi } from "../api/rbac.api";
import type {
  CreateRolePayload,
  RoleListQuery,
  UpdateRolePayload,
} from "../types";

export const rbacKeys = {
  permissions: ["rbac", "permissions"] as const,
  rolesAll: ["rbac", "roles"] as const,
  rolesList: (query: RoleListQuery) =>
    [...rbacKeys.rolesAll, "list", query] as const,
  roleDetail: (id: string) => [...rbacKeys.rolesAll, "detail", id] as const,
};

export const usePermissions = () =>
  useQuery({
    queryKey: rbacKeys.permissions,
    queryFn: () => rbacApi.listPermissions(),
    staleTime: 5 * 60 * 1000,
  });

export const useRolesList = (query: RoleListQuery = {}) =>
  useQuery({
    queryKey: rbacKeys.rolesList(query),
    queryFn: () => rbacApi.listRoles(query),
  });

export const useRole = (id: string | undefined) =>
  useQuery({
    queryKey: id ? rbacKeys.roleDetail(id) : ["rbac", "roles", "detail", "none"],
    queryFn: () => rbacApi.getRole(id as string),
    enabled: Boolean(id),
  });

export const useCreateRole = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRolePayload) => rbacApi.createRole(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: rbacKeys.rolesAll }),
  });
};

export const useUpdateRole = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateRolePayload) => rbacApi.updateRole(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: rbacKeys.rolesAll }),
  });
};

export const useSetRolePermissions = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      permissionKeys,
    }: {
      id: string;
      permissionKeys: string[];
    }) => rbacApi.setRolePermissions(id, permissionKeys),
    onSuccess: () => qc.invalidateQueries({ queryKey: rbacKeys.rolesAll }),
  });
};

export const useDeleteRole = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => rbacApi.removeRole(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: rbacKeys.rolesAll }),
  });
};

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "../api/users.api";
import type {
  CreateUserPayload,
  ResetPasswordPayload,
  UpdateUserPayload,
  UserListQuery,
} from "../types";

export const usersKeys = {
  all: ["users"] as const,
  list: (query: UserListQuery) =>
    [...usersKeys.all, "list", query] as const,
  detail: (id: string) => [...usersKeys.all, "detail", id] as const,
};

export const useUsersList = (query: UserListQuery = {}) =>
  useQuery({
    queryKey: usersKeys.list(query),
    queryFn: () => usersApi.list(query),
  });

export const useUser = (id: string | undefined) =>
  useQuery({
    queryKey: id ? usersKeys.detail(id) : ["users", "detail", "none"],
    queryFn: () => usersApi.getById(id as string),
    enabled: Boolean(id),
  });

export const useCreateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateUserPayload) => usersApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: usersKeys.all }),
  });
};

export const useUpdateUser = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateUserPayload) => usersApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: usersKeys.all }),
  });
};

export const useSetUserActive = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      usersApi.setActive(id, active),
    onSuccess: () => qc.invalidateQueries({ queryKey: usersKeys.all }),
  });
};

export const useResetUserPassword = () =>
  useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: ResetPasswordPayload;
    }) => usersApi.resetPassword(id, payload),
  });

export const useDeleteUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usersApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: usersKeys.all }),
  });
};

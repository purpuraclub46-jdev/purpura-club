"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { branchesApi } from "../api/branches.api";
import type {
  BranchListQuery,
  CreateBranchPayload,
  UpdateBranchPayload,
} from "../types";

export const branchesKeys = {
  all: ["branches"] as const,
  list: (query: BranchListQuery) =>
    [...branchesKeys.all, "list", query] as const,
  detail: (id: string) => [...branchesKeys.all, "detail", id] as const,
};

export const useBranchesList = (query: BranchListQuery = {}) =>
  useQuery({
    queryKey: branchesKeys.list(query),
    queryFn: () => branchesApi.list(query),
  });

export const useBranch = (id: string | undefined) =>
  useQuery({
    queryKey: id ? branchesKeys.detail(id) : ["branches", "detail", "none"],
    queryFn: () => branchesApi.get(id as string),
    enabled: Boolean(id),
  });

export const useCreateBranch = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateBranchPayload) => branchesApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: branchesKeys.all }),
  });
};

export const useUpdateBranch = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateBranchPayload) =>
      branchesApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: branchesKeys.all }),
  });
};

export const useDeleteBranch = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => branchesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: branchesKeys.all }),
  });
};

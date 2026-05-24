"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { categoriesApi } from "../api/categories.api";
import type {
  CategoryListQuery,
  CreateCategoryPayload,
  UpdateCategoryPayload,
} from "../types";

export const categoriesKeys = {
  all: ["categories"] as const,
  list: (query: CategoryListQuery) =>
    [...categoriesKeys.all, "list", query] as const,
  detail: (id: string) => [...categoriesKeys.all, "detail", id] as const,
};

export const useCategoriesList = (query: CategoryListQuery) =>
  useQuery({
    queryKey: categoriesKeys.list(query),
    queryFn: () => categoriesApi.listAdmin(query),
  });

export const useCategory = (id: string | undefined) =>
  useQuery({
    queryKey: id ? categoriesKeys.detail(id) : ["categories", "detail", "none"],
    queryFn: () => categoriesApi.getAdmin(id as string),
    enabled: Boolean(id),
  });

export const useCreateCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCategoryPayload) =>
      categoriesApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: categoriesKeys.all }),
  });
};

export const useUpdateCategory = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateCategoryPayload) =>
      categoriesApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: categoriesKeys.all }),
  });
};

export const useDeleteCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => categoriesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: categoriesKeys.all }),
  });
};

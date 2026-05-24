"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { productsApi } from "../api/products.api";
import type {
  CreateProductPayload,
  ProductListQuery,
  UpdateProductPayload,
} from "../types";

export const productsKeys = {
  all: ["products"] as const,
  list: (query: ProductListQuery) =>
    [...productsKeys.all, "list", query] as const,
  detail: (id: string) => [...productsKeys.all, "detail", id] as const,
};

export const useProductsList = (query: ProductListQuery) =>
  useQuery({
    queryKey: productsKeys.list(query),
    queryFn: () => productsApi.listAdmin(query),
  });

export const useProduct = (id: string | undefined) =>
  useQuery({
    queryKey: id ? productsKeys.detail(id) : ["products", "detail", "none"],
    queryFn: () => productsApi.getAdmin(id as string),
    enabled: Boolean(id),
  });

export const useCreateProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateProductPayload) => productsApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: productsKeys.all }),
  });
};

export const useUpdateProduct = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateProductPayload) =>
      productsApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: productsKeys.all }),
  });
};

export const useDeleteProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: productsKeys.all }),
  });
};

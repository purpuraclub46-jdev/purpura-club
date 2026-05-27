"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { homeStoresApi } from "../api/home-stores.api";
import type {
  CreateHomeStorePayload,
  UpdateHomeStorePayload,
} from "../types";

export const homeStoresKeys = {
  all: ["home-stores"] as const,
  list: () => [...homeStoresKeys.all, "list"] as const,
  detail: (id: string) => [...homeStoresKeys.all, "detail", id] as const,
};

export const useHomeStoresList = () =>
  useQuery({
    queryKey: homeStoresKeys.list(),
    queryFn: () => homeStoresApi.listAdmin(),
  });

export const useHomeStore = (id: string | undefined) =>
  useQuery({
    queryKey: id ? homeStoresKeys.detail(id) : ["home-stores", "detail", "none"],
    queryFn: () => homeStoresApi.getAdmin(id as string),
    enabled: Boolean(id),
  });

export const useCreateHomeStore = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateHomeStorePayload) =>
      homeStoresApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: homeStoresKeys.all });
    },
  });
};

export const useUpdateHomeStore = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateHomeStorePayload) =>
      homeStoresApi.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: homeStoresKeys.all });
    },
  });
};

export const useDeleteHomeStore = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => homeStoresApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: homeStoresKeys.all });
    },
  });
};

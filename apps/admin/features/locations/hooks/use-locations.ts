"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { locationsApi } from "../api/locations.api";
import type {
  CreateLocationPayload,
  LocationListQuery,
  UpdateLocationPayload,
} from "../types";

export const locationsKeys = {
  all: ["locations"] as const,
  list: (query: LocationListQuery) =>
    [...locationsKeys.all, "list", query] as const,
  detail: (id: string) => [...locationsKeys.all, "detail", id] as const,
};

export const useLocationsList = (query: LocationListQuery = {}) =>
  useQuery({
    queryKey: locationsKeys.list(query),
    queryFn: () => locationsApi.list(query),
  });

export const useLocation = (id: string | undefined) =>
  useQuery({
    queryKey: id ? locationsKeys.detail(id) : ["locations", "detail", "none"],
    queryFn: () => locationsApi.get(id as string),
    enabled: Boolean(id),
  });

export const useCreateLocation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateLocationPayload) =>
      locationsApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: locationsKeys.all }),
  });
};

export const useUpdateLocation = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateLocationPayload) =>
      locationsApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: locationsKeys.all }),
  });
};

export const useDeleteLocation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => locationsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: locationsKeys.all }),
  });
};

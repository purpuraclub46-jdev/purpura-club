"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { posReturnsApi } from "../api/pos-returns.api";
import type { CreateCreditNotePayload } from "../types";
import { posKeys } from "@/features/pos/hooks/use-pos";

export const posReturnsKeys = {
  all: ["pos-returns"] as const,
  search: (q: string) => [...posReturnsKeys.all, "search", q] as const,
  detail: (id: string) => [...posReturnsKeys.all, "detail", id] as const,
  list: (locationId: string) =>
    [...posReturnsKeys.all, "list", locationId] as const,
};

export const useSearchOrderForReturn = (query: string, enabled = true) =>
  useQuery({
    queryKey: posReturnsKeys.search(query),
    queryFn: () => posReturnsApi.searchOrder(query),
    enabled: enabled && query.trim().length >= 3,
    retry: false,
  });

export const useCreditNotesForLocation = (locationId: string | undefined) =>
  useQuery({
    queryKey: locationId
      ? posReturnsKeys.list(locationId)
      : ["pos-returns", "list", "none"],
    queryFn: () => posReturnsApi.listForLocation(locationId as string),
    enabled: Boolean(locationId),
  });

export const useCreditNoteDetail = (id: string | undefined) =>
  useQuery({
    queryKey: id ? posReturnsKeys.detail(id) : ["pos-returns", "detail", "none"],
    queryFn: () => posReturnsApi.getById(id as string),
    enabled: Boolean(id),
  });

export const useCreateCreditNote = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCreditNotePayload) =>
      posReturnsApi.create(payload),
    onSuccess: () => {
      // Invalida búsquedas, listas y todo el POS (caja, reportes, stock).
      qc.invalidateQueries({ queryKey: posReturnsKeys.all });
      qc.invalidateQueries({ queryKey: posKeys.all });
    },
  });
};

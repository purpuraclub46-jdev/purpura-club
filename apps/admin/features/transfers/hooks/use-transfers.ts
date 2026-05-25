"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { transfersApi } from "../api/transfers.api";
import type { CreateTransferPayload, TransferListQuery } from "../types";

export const transfersKeys = {
  all: ["transfers"] as const,
  list: (query: TransferListQuery) =>
    [...transfersKeys.all, "list", query] as const,
  detail: (id: string) => [...transfersKeys.all, "detail", id] as const,
};

export const useTransfersList = (query: TransferListQuery) =>
  useQuery({
    queryKey: transfersKeys.list(query),
    queryFn: () => transfersApi.list(query),
  });

export const useTransfer = (id: string | undefined) =>
  useQuery({
    queryKey: id ? transfersKeys.detail(id) : ["transfers", "detail", "none"],
    queryFn: () => transfersApi.get(id as string),
    enabled: Boolean(id),
  });

const invalidate = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: transfersKeys.all });
  qc.invalidateQueries({ queryKey: ["inventory"] });
  qc.invalidateQueries({ queryKey: ["products"] });
};

export const useCreateTransfer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTransferPayload) =>
      transfersApi.create(payload),
    onSuccess: () => invalidate(qc),
  });
};

export const useCompleteTransfer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => transfersApi.complete(id),
    onSuccess: () => invalidate(qc),
  });
};

export const useCancelTransfer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => transfersApi.cancel(id),
    onSuccess: () => invalidate(qc),
  });
};

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { inventoryApi } from "../api/inventory.api";
import type {
  AdjustStockPayload,
  InventoryListQuery,
  MovementListQuery,
  TransferStockPayload,
} from "../types";

export const inventoryKeys = {
  all: ["inventory"] as const,
  list: (query: InventoryListQuery) =>
    [...inventoryKeys.all, "list", query] as const,
  movements: (query: MovementListQuery) =>
    [...inventoryKeys.all, "movements", query] as const,
};

export const useInventoryList = (query: InventoryListQuery) =>
  useQuery({
    queryKey: inventoryKeys.list(query),
    queryFn: () => inventoryApi.list(query),
  });

export const useMovementsList = (query: MovementListQuery) =>
  useQuery({
    queryKey: inventoryKeys.movements(query),
    queryFn: () => inventoryApi.movements(query),
  });

export const useAdjustStock = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AdjustStockPayload) => inventoryApi.adjust(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.all });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
};

export const useTransferStock = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: TransferStockPayload) =>
      inventoryApi.transfer(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.all });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
};

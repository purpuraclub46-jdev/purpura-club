"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { inventoryApi } from "../api/inventory.api";
import type {
  AdjustStockPayload,
  MovementListQuery,
  ReserveStockPayload,
  StockListQuery,
  UpdateMinimumStockPayload,
} from "../types";

export const inventoryKeys = {
  all: ["inventory"] as const,
  stock: (query: StockListQuery) =>
    [...inventoryKeys.all, "stock", query] as const,
  movements: (query: MovementListQuery) =>
    [...inventoryKeys.all, "movements", query] as const,
};

export const useStockList = (query: StockListQuery) =>
  useQuery({
    queryKey: inventoryKeys.stock(query),
    queryFn: () => inventoryApi.listStock(query),
  });

export const useMovementsList = (query: MovementListQuery) =>
  useQuery({
    queryKey: inventoryKeys.movements(query),
    queryFn: () => inventoryApi.movements(query),
  });

const invalidateInventoryAndProducts = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: inventoryKeys.all });
  qc.invalidateQueries({ queryKey: ["products"] });
};

export const useAdjustStock = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AdjustStockPayload) => inventoryApi.adjust(payload),
    onSuccess: () => invalidateInventoryAndProducts(qc),
  });
};

export const useSetMinimumStock = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateMinimumStockPayload) =>
      inventoryApi.setMinimum(payload),
    onSuccess: () => invalidateInventoryAndProducts(qc),
  });
};

export const useReserveStock = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ReserveStockPayload) =>
      inventoryApi.reserve(payload),
    onSuccess: () => invalidateInventoryAndProducts(qc),
  });
};

export const useReleaseStock = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ReserveStockPayload) =>
      inventoryApi.release(payload),
    onSuccess: () => invalidateInventoryAndProducts(qc),
  });
};

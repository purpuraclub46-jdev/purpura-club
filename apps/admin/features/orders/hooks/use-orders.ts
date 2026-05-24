"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ordersApi } from "../api/orders.api";
import type { OrderListQuery } from "../types";
import type { OrderStatus } from "@/types/api";

export const ordersKeys = {
  all: ["orders"] as const,
  list: (query: OrderListQuery) =>
    [...ordersKeys.all, "list", query] as const,
  detail: (id: string) => [...ordersKeys.all, "detail", id] as const,
};

export const useOrdersList = (query: OrderListQuery) =>
  useQuery({
    queryKey: ordersKeys.list(query),
    queryFn: () => ordersApi.list(query),
  });

export const useOrder = (id: string | undefined) =>
  useQuery({
    queryKey: id ? ordersKeys.detail(id) : ["orders", "detail", "none"],
    queryFn: () => ordersApi.get(id as string),
    enabled: Boolean(id),
  });

export const useUpdateOrderStatus = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status: OrderStatus) => ordersApi.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ordersKeys.all });
      qc.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
};

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth.store";
import type { CreateAddressInput, UpdateAddressInput } from "@/types/api";
import { accountApi } from "../api/account.api";

export const accountKeys = {
  membership: ["account", "membership"] as const,
  orders: ["account", "orders"] as const,
  order: (idOrNumber: string) => ["account", "orders", idOrNumber] as const,
  addresses: ["account", "addresses"] as const,
};

export const useMyMembership = () => {
  const token = useAuthStore((s) => s.tokens?.accessToken);
  return useQuery({
    queryKey: accountKeys.membership,
    queryFn: () => accountApi.myMembership(),
    enabled: Boolean(token),
  });
};

export const useMyOrders = () => {
  const token = useAuthStore((s) => s.tokens?.accessToken);
  return useQuery({
    queryKey: accountKeys.orders,
    queryFn: () => accountApi.myOrders(),
    enabled: Boolean(token),
  });
};

export const useMyOrder = (idOrNumber: string) => {
  const token = useAuthStore((s) => s.tokens?.accessToken);
  return useQuery({
    queryKey: accountKeys.order(idOrNumber),
    queryFn: () => accountApi.myOrder(idOrNumber),
    enabled: Boolean(token) && Boolean(idOrNumber),
    retry: (failureCount, error: unknown) => {
      // 404 anti-enumeration: no reintentar
      const status = (error as { response?: { status?: number } } | null)
        ?.response?.status;
      if (status === 404 || status === 401 || status === 403) return false;
      return failureCount < 2;
    },
  });
};

// ─── Customer addresses (F2.5) ───────────────────────────────────────────

export const useMyAddresses = () => {
  const token = useAuthStore((s) => s.tokens?.accessToken);
  return useQuery({
    queryKey: accountKeys.addresses,
    queryFn: () => accountApi.myAddresses(),
    enabled: Boolean(token),
  });
};

export const useCreateAddress = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAddressInput) => accountApi.createAddress(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: accountKeys.addresses }),
  });
};

export const useUpdateAddress = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateAddressInput }) =>
      accountApi.updateAddress(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: accountKeys.addresses }),
  });
};

export const useDeleteAddress = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => accountApi.deleteAddress(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: accountKeys.addresses }),
  });
};

export const useSetDefaultAddress = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => accountApi.setDefaultAddress(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: accountKeys.addresses }),
  });
};

"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth.store";
import { accountApi } from "../api/account.api";

export const accountKeys = {
  membership: ["account", "membership"] as const,
  orders: ["account", "orders"] as const,
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

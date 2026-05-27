"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth.store";
import { rafflesApi } from "../api/raffles.api";

export const raffleKeys = {
  all: ["raffles"] as const,
  list: () => [...raffleKeys.all, "list"] as const,
  detail: (slug: string) => [...raffleKeys.all, "detail", slug] as const,
  myEntries: () => [...raffleKeys.all, "me", "entries"] as const,
};

export const useRaffles = () =>
  useQuery({
    queryKey: raffleKeys.list(),
    queryFn: () => rafflesApi.list(),
    staleTime: 60_000,
  });

export const useRaffleBySlug = (slug: string | undefined) =>
  useQuery({
    queryKey: slug ? raffleKeys.detail(slug) : ["raffles", "detail", "none"],
    queryFn: () => rafflesApi.bySlug(slug as string),
    enabled: Boolean(slug),
  });

export const useMyRaffleEntries = () => {
  const token = useAuthStore((s) => s.tokens?.accessToken);
  return useQuery({
    queryKey: raffleKeys.myEntries(),
    queryFn: () => rafflesApi.myEntries(),
    enabled: Boolean(token),
  });
};

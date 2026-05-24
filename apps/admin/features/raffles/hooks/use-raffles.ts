"use client";

import { useQuery } from "@tanstack/react-query";
import { rafflesApi } from "../api/raffles.api";
import type { RaffleListQuery } from "../types";

export const rafflesKeys = {
  all: ["raffles"] as const,
  list: (query: RaffleListQuery) =>
    [...rafflesKeys.all, "list", query] as const,
  detail: (id: string) => [...rafflesKeys.all, "detail", id] as const,
};

export const useRafflesList = (query: RaffleListQuery) =>
  useQuery({
    queryKey: rafflesKeys.list(query),
    queryFn: () => rafflesApi.listAdmin(query),
  });

export const useRaffle = (id: string | undefined) =>
  useQuery({
    queryKey: id ? rafflesKeys.detail(id) : ["raffles", "detail", "none"],
    queryFn: () => rafflesApi.getAdmin(id as string),
    enabled: Boolean(id),
  });

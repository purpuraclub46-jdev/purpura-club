"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { raffleEntriesApi } from "../api/raffle-entries.api";
import type { DecideEntryPayload, EntryListQuery } from "../types";

export const raffleEntriesKeys = {
  all: ["raffle-entries"] as const,
  list: (query: EntryListQuery) =>
    [...raffleEntriesKeys.all, "list", query] as const,
  detail: (id: string) => [...raffleEntriesKeys.all, "detail", id] as const,
};

export const useRaffleEntriesList = (query: EntryListQuery) =>
  useQuery({
    queryKey: raffleEntriesKeys.list(query),
    queryFn: () => raffleEntriesApi.list(query),
  });

export const useDecideEntry = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: DecideEntryPayload) => raffleEntriesApi.decide(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: raffleEntriesKeys.all }),
  });
};


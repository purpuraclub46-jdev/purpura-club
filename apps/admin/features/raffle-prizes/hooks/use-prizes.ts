"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { prizesApi } from "../api/prizes.api";
import type {
  AssignWinnerPayload,
  CreatePrizePayload,
  PublishWinnerPayload,
  UpdatePrizePayload,
} from "../types";

export const prizesKeys = {
  all: ["raffle-prizes"] as const,
  byRaffle: (raffleId: string) =>
    [...prizesKeys.all, "by-raffle", raffleId] as const,
  publishedWinners: () => [...prizesKeys.all, "published-winners"] as const,
};

export const usePrizesByRaffle = (raffleId: string | undefined) =>
  useQuery({
    queryKey: raffleId
      ? prizesKeys.byRaffle(raffleId)
      : [...prizesKeys.all, "by-raffle", "none"],
    queryFn: () => prizesApi.listByRaffle(raffleId as string),
    enabled: Boolean(raffleId),
  });

export const usePublishedWinners = () =>
  useQuery({
    queryKey: prizesKeys.publishedWinners(),
    queryFn: () => prizesApi.listPublishedWinners(),
  });

export const useCreatePrize = (raffleId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePrizePayload) =>
      prizesApi.create(raffleId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: prizesKeys.all }),
  });
};

export const useUpdatePrize = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdatePrizePayload) => prizesApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: prizesKeys.all }),
  });
};

export const useDeletePrize = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => prizesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: prizesKeys.all }),
  });
};

export const useAssignPrizeWinner = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AssignWinnerPayload) =>
      prizesApi.assignWinner(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: prizesKeys.all }),
  });
};

export const useClearPrizeWinner = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => prizesApi.clearWinner(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: prizesKeys.all }),
  });
};

export const usePublishPrizeWinner = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: PublishWinnerPayload) =>
      prizesApi.publishWinner(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: prizesKeys.all }),
  });
};

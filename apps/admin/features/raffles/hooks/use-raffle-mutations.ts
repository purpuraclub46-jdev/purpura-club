"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { rafflesApi } from "../api/raffles.api";
import { rafflesKeys } from "./use-raffles";
import type { CreateRafflePayload, UpdateRafflePayload } from "../types";

export const useCreateRaffle = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRafflePayload) => rafflesApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: rafflesKeys.all }),
  });
};

export const useUpdateRaffle = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateRafflePayload) =>
      rafflesApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: rafflesKeys.all }),
  });
};

export const useDeleteRaffle = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => rafflesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: rafflesKeys.all }),
  });
};

export const usePublishRaffle = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => rafflesApi.publish(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: rafflesKeys.all }),
  });
};

export const useCloseRaffle = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => rafflesApi.close(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: rafflesKeys.all }),
  });
};
